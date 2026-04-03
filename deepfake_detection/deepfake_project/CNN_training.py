from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path
from typing import Iterable

import numpy as np
import torch
from sklearn.model_selection import train_test_split
from torch import nn
from torch.optim.lr_scheduler import ReduceLROnPlateau
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, transforms

# Setup paths for custom module imports
PROJECT_DIR = Path(__file__).resolve().parent
FEATURE_EXTRACTION_DIR = PROJECT_DIR / "feature_extraction"
if str(FEATURE_EXTRACTION_DIR) not in sys.path:
    sys.path.insert(0, str(FEATURE_EXTRACTION_DIR))

try:
    from cnn_visual_detector import VisualDeepfakeNet
except ImportError:
    print("Error: Could not find cnn_visual_detector. Check your directory structure.")
    sys.path.append(str(PROJECT_DIR))
    from cnn_visual_detector import VisualDeepfakeNet


def build_transforms(train: bool = True) -> transforms.Compose:
    """Build the augmentation pipeline for training or validation."""
    if train:
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
            transforms.RandomGrayscale(p=0.1),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


def set_requires_grad(parameters: Iterable[torch.nn.Parameter], flag: bool) -> None:
    for parameter in parameters:
        parameter.requires_grad = flag


def set_random_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def build_scheduler(optimizer: torch.optim.Optimizer) -> ReduceLROnPlateau:
    return ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=2)


def resolve_output_path(output_arg: str) -> Path:
    output_path = Path(output_arg).expanduser()
    if not output_path.is_absolute():
        output_path = PROJECT_DIR / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)
    return output_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CNN Deepfake Training Pipeline")
    parser.add_argument(
        "--data-dir",
        type=str,
        default=str(PROJECT_DIR / "cnn_face_dataset"),
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(PROJECT_DIR / "Deepfake_cnn_weights.pth"),
    )
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--finetune-lr", type=float, default=5e-6)
    parser.add_argument("--unfreeze-epoch", type=int, default=3)
    parser.add_argument("--patience", type=int, default=5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--num-workers", type=int, default=0)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    set_random_seed(args.seed)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    amp_enabled = device.type == "cuda"
    output_path = resolve_output_path(args.output)

    print(f"Initializing training on: {device}")

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        print(f"Error: Dataset directory {data_dir} does not exist.")
        return

    base_dataset = datasets.ImageFolder(data_dir)

    fake_idx = None
    for class_name, idx in base_dataset.class_to_idx.items():
        if class_name.lower() == "fake":
            fake_idx = idx
            break

    if fake_idx is None:
        print(f"Error: Could not find a 'fake' folder. Classes found: {base_dataset.class_to_idx}")
        return

    print(f"Class mapping: {base_dataset.class_to_idx} | Fake class index: {fake_idx}")

    all_labels_np = np.asarray([sample[1] for sample in base_dataset.samples], dtype=np.int64)
    all_indices = np.arange(len(base_dataset))
    train_indices, val_indices = train_test_split(
        all_indices,
        test_size=0.2,
        random_state=args.seed,
        shuffle=True,
        stratify=all_labels_np,
    )

    train_dataset = datasets.ImageFolder(data_dir, transform=build_transforms(train=True))
    val_dataset = datasets.ImageFolder(data_dir, transform=build_transforms(train=False))
    train_ds = Subset(train_dataset, train_indices.tolist())
    val_ds = Subset(val_dataset, val_indices.tolist())

    print(
        f"Train/val split: {len(train_indices)} train / {len(val_indices)} val "
        f"(seed={args.seed}, stratified)"
    )

    train_loader = DataLoader(
        train_ds,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=amp_enabled,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=amp_enabled,
    )

    model = VisualDeepfakeNet(backbone_name="resnet50", use_pretrained=True).to(device)
    set_requires_grad(model.feature_extractor.parameters(), False)

    train_labels = torch.tensor(all_labels_np[train_indices], dtype=torch.long)
    num_fake = (train_labels == fake_idx).sum().float()
    num_real = len(train_labels) - num_fake
    pos_weight = torch.tensor([num_real / max(num_fake, 1.0)], device=device)

    print(f"Loss pos_weight: {pos_weight.item():.2f}")

    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr,
    )
    scheduler = build_scheduler(optimizer)
    scaler = torch.amp.GradScaler(enabled=amp_enabled)

    best_val_acc = 0.0
    epochs_no_improve = 0

    for epoch in range(args.epochs):
        if epoch == args.unfreeze_epoch:
            print("\nUnfreezing backbone layers 3 and 4 for fine-tuning...")
            set_requires_grad(model.feature_extractor.layer3.parameters(), True)
            set_requires_grad(model.feature_extractor.layer4.parameters(), True)
            optimizer = torch.optim.Adam(
                filter(lambda p: p.requires_grad, model.parameters()),
                lr=args.finetune_lr,
            )
            scheduler = build_scheduler(optimizer)

        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for images, labels in train_loader:
            images = images.to(device, non_blocking=amp_enabled)
            targets = (labels == fake_idx).float().unsqueeze(1).to(device)

            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast(device_type=device.type, enabled=amp_enabled):
                _, logits = model(images)
                loss = criterion(logits, targets)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            train_loss += loss.item()
            train_correct += ((torch.sigmoid(logits) >= 0.5) == targets).sum().item()
            train_total += targets.size(0)

        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(device, non_blocking=amp_enabled)
                targets = (labels == fake_idx).float().unsqueeze(1).to(device)

                with torch.amp.autocast(device_type=device.type, enabled=amp_enabled):
                    _, logits = model(images)
                    batch_val_loss = criterion(logits, targets)

                val_loss += batch_val_loss.item()
                val_correct += ((torch.sigmoid(logits) >= 0.5) == targets).sum().item()
                val_total += targets.size(0)

        avg_train_loss = train_loss / max(len(train_loader), 1)
        avg_train_acc = train_correct / max(train_total, 1)
        avg_val_loss = val_loss / max(len(val_loader), 1)
        avg_val_acc = val_correct / max(val_total, 1)

        print(
            f"Epoch [{epoch + 1}/{args.epochs}] | "
            f"Train Loss: {avg_train_loss:.4f} | "
            f"Train Acc: {avg_train_acc:.4f} | "
            f"Val Loss: {avg_val_loss:.4f} | "
            f"Val Acc: {avg_val_acc:.4f}"
        )

        scheduler.step(avg_val_loss)

        if avg_val_acc > best_val_acc:
            best_val_acc = avg_val_acc
            epochs_no_improve = 0
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "val_acc": best_val_acc,
                    "val_loss": avg_val_loss,
                    "epoch": epoch + 1,
                    "seed": args.seed,
                    "class_to_idx": base_dataset.class_to_idx,
                    "fake_class_index": fake_idx,
                    "backbone_name": model.backbone_name,
                    "embedding_dim": model.embedding_dim,
                    "input_size": 224,
                    "normalization": {
                        "mean": [0.485, 0.456, 0.406],
                        "std": [0.229, 0.224, 0.225],
                    },
                },
                output_path,
            )
            print(f"New best model saved to {output_path} with val acc {best_val_acc:.4f}.")
        else:
            epochs_no_improve += 1

        if epochs_no_improve >= args.patience:
            print(f"Stopping early after {args.patience} epochs without validation improvement.")
            break

    print(f"\nTraining complete. Best validation accuracy: {best_val_acc:.4f}")


if __name__ == "__main__":
    main()
