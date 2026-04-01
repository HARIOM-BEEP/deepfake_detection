from __future__ import annotations
import argparse
import sys
from pathlib import Path
from typing import Iterable

import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms
from torch.optim.lr_scheduler import ReduceLROnPlateau

# Setup paths for custom module imports
PROJECT_DIR = Path(__file__).resolve().parent
FEATURE_EXTRACTION_DIR = PROJECT_DIR / "feature_extraction"
if str(FEATURE_EXTRACTION_DIR) not in sys.path:
    sys.path.insert(0, str(FEATURE_EXTRACTION_DIR))

try:
    from cnn_visual_detector import VisualDeepfakeNet
except ImportError:
    print("❌ Error: Could not find cnn_visual_detector. Check your directory structure.")
    sys.path.append(str(PROJECT_DIR)) # Fallback
    from cnn_visual_detector import VisualDeepfakeNet

# ==============================
# DATA TRANSFORMS
# ==============================
def build_transforms(train: bool = True) -> transforms.Compose:
    """Builds augmentation pipeline. Stronger for training, static for validation."""
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

# ==============================
# ARGUMENT PARSING
# ==============================
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CNN Deepfake Training Pipeline")
    parser.add_argument("--data-dir", type=str, default=str(PROJECT_DIR / "cnn_face_dataset"))
    parser.add_argument("--output", type=str, default=str(PROJECT_DIR / "cnn_weights.pth"))
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--finetune-lr", type=float, default=5e-6)
    parser.add_argument("--unfreeze-epoch", type=int, default=3)
    parser.add_argument("--patience", type=int, default=5)
    # Set num-workers to 0 if running on Windows to avoid Multiprocessing errors
    parser.add_argument("--num-workers", type=int, default=0) 
    return parser.parse_args()

# ==============================
# MAIN TRAINING LOOP
# ==============================
def main() -> None:
    args = parse_args()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    amp_enabled = device.type == "cuda"
    print(f"🚀 Initializing Training on: {device}")

    # --- DATA LOADING ---
    if not Path(args.data_dir).exists():
        print(f"❌ Error: Dataset directory {args.data_dir} does not exist.")
        return

    full_dataset = datasets.ImageFolder(args.data_dir)
    
    # Securely identify the 'fake' class index
    fake_idx = None
    for class_name, idx in full_dataset.class_to_idx.items():
        if class_name.lower() == "fake":
            fake_idx = idx
            break
    
    if fake_idx is None:
        print(f"❌ Error: Could not find 'fake' folder. Classes found: {full_dataset.class_to_idx}")
        return

    print(f"✅ Class Mapping: {full_dataset.class_to_idx} | Target (Fake) Index: {fake_idx}")

    # Train/Validation Split (80/20)
    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_ds, val_ds = random_split(full_dataset, [train_size, val_size])

    # Assign specific transforms to the datasets
    train_ds.dataset.transform = build_transforms(train=True)
    val_ds.dataset.transform = build_transforms(train=False)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, 
                              num_workers=args.num_workers, pin_memory=amp_enabled)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, 
                            num_workers=args.num_workers, pin_memory=amp_enabled)

    # --- MODEL SETUP ---
    model = VisualDeepfakeNet(backbone_name="resnet50", use_pretrained=True).to(device)
    
    # Phase 1: Freeze Backbone, train only Head
    set_requires_grad(model.feature_extractor.parameters(), False)
    
    # Calculate Class Weights to handle imbalance
    all_labels = torch.tensor([s[1] for s in full_dataset.samples])
    num_fake = (all_labels == fake_idx).sum().float()
    num_real = len(all_labels) - num_fake
    pos_weight = torch.tensor([num_real / max(num_fake, 1.0)]).to(device)
    
    print(f"⚖️ Loss Pos-Weight: {pos_weight.item():.2f}")

    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr)
    
    # Scheduler: Drops LR when val_loss plateaus
    scheduler = ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=2)
    scaler = torch.amp.GradScaler(enabled=amp_enabled)

    # --- TRAINING EXECUTION ---
    best_val_acc = 0.0
    epochs_no_improve = 0

    for epoch in range(args.epochs):
        # UNFREEZE BACKBONE (Fine-tuning phase)
        if epoch == args.unfreeze_epoch:
            print("\n🔓 Unfreezing Backbone Layers 3 & 4 for Fine-Tuning...")
            set_requires_grad(model.feature_extractor.layer3.parameters(), True)
            set_requires_grad(model.feature_extractor.layer4.parameters(), True)
            optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=args.finetune_lr)

        # Training Phase
        model.train()
        train_loss, train_correct, train_total = 0.0, 0, 0
        
        for images, labels in train_loader:
            images = images.to(device, non_blocking=amp_enabled)
            # Ensure label 'fake' is 1.0, others are 0.0
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

        # Validation Phase
        model.eval()
        val_loss, val_correct, val_total = 0.0, 0, 0
        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(device, non_blocking=amp_enabled)
                targets = (labels == fake_idx).float().unsqueeze(1).to(device)
                
                with torch.amp.autocast(device_type=device.type, enabled=amp_enabled):
                    _, logits = model(images)
                    v_loss = criterion(logits, targets)
                
                val_loss += v_loss.item()
                val_correct += ((torch.sigmoid(logits) >= 0.5) == targets).sum().item()
                val_total += targets.size(0)

        # Metrics Summary
        avg_train_acc = train_correct / train_total
        avg_val_acc = val_correct / val_total
        avg_val_loss = val_loss / len(val_loader)

        print(f"Epoch [{epoch+1}/{args.epochs}] | "
              f"Loss: {train_loss/len(train_loader):.4f} | "
              f"Acc: {avg_train_acc:.4f} | Val Acc: {avg_val_acc:.4f}")

        # Update Scheduler
        scheduler.step(avg_val_loss)

        # Save Best Model Logic
        if avg_val_acc > best_val_acc:
            best_val_acc = avg_val_acc
            epochs_no_improve = 0
            torch.save({
                "model_state_dict": model.state_dict(),
                "val_acc": best_val_acc,
                "epoch": epoch
            }, args.output)
            print(f"⭐ NEW BEST: Accuracy {best_val_acc:.4f}. Model Saved.")
        else:
            epochs_no_improve += 1

        # Early Stopping
        if epochs_no_improve >= args.patience:
            print(f"🛑 Stopping Early: No improvement in validation for {args.patience} epochs.")
            break

    print(f"\n✅ Training Complete. Best Validation Accuracy: {best_val_acc:.4f}")

if __name__ == "__main__":
    main()