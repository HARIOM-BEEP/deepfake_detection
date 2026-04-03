"""
Dataset builder for the compact deepfake fusion schema.

This script only:
1. extracts the 8 agreed feature values,
2. validates the output rows,
3. writes the dataset CSV.
"""

from __future__ import annotations

import argparse
import multiprocessing
import time
import warnings
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import torch

from blink_test import BlinkDetector
from cnn_visual_detector import CNNVisualFeatureExtractor
from facial_landmarks import RobustFacialLandmarkExtractor
from fusion_classifier import FusionFeatureAssembler
from headpose_test import RobustHeadPoseEstimator

warnings.filterwarnings("ignore")


ExtractorCacheKey = Tuple[int, int, int, int, int, str, str, bool]
_PROCESS_LOCAL_EXTRACTORS: Dict[ExtractorCacheKey, Dict[str, object]] = {}


def _extractor_cache_key(
    blink_frame_skip: int,
    headpose_frame_skip: int,
    landmark_frame_skip: int,
    cnn_frame_skip: int,
    cnn_batch_size: int,
    cnn_backbone: str,
    cnn_weights_path: Optional[str],
    cnn_use_pretrained: bool,
) -> ExtractorCacheKey:
    return (
        int(blink_frame_skip),
        int(headpose_frame_skip),
        int(landmark_frame_skip),
        int(cnn_frame_skip),
        int(cnn_batch_size),
        cnn_backbone.lower().strip(),
        "" if cnn_weights_path is None else str(cnn_weights_path),
        bool(cnn_use_pretrained),
    )


def _get_process_local_extractors(
    blink_frame_skip: int,
    headpose_frame_skip: int,
    landmark_frame_skip: int,
    cnn_frame_skip: int,
    cnn_batch_size: int,
    cnn_backbone: str,
    cnn_weights_path: Optional[str],
    cnn_use_pretrained: bool,
) -> Dict[str, object]:
    cache_key = _extractor_cache_key(
        blink_frame_skip=blink_frame_skip,
        headpose_frame_skip=headpose_frame_skip,
        landmark_frame_skip=landmark_frame_skip,
        cnn_frame_skip=cnn_frame_skip,
        cnn_batch_size=cnn_batch_size,
        cnn_backbone=cnn_backbone,
        cnn_weights_path=cnn_weights_path,
        cnn_use_pretrained=cnn_use_pretrained,
    )

    if cache_key not in _PROCESS_LOCAL_EXTRACTORS:
        if torch.cuda.is_available():
            print(f"[Worker] GPU available: {torch.cuda.get_device_name(0)}")
        else:
            print("[Worker] No GPU detected - using CPU")

        cnn_extractor = CNNVisualFeatureExtractor(
            backbone_name=cnn_backbone,
            model_weights_path=cnn_weights_path,
            frame_skip=cnn_frame_skip,
            batch_size=cnn_batch_size,
            use_pretrained=cnn_use_pretrained,
        )

        _PROCESS_LOCAL_EXTRACTORS[cache_key] = {
            "blink": BlinkDetector(frame_skip=blink_frame_skip, tracking_mode="auto"),
            "headpose": RobustHeadPoseEstimator(frame_skip=headpose_frame_skip),
            "landmarks": RobustFacialLandmarkExtractor(frame_skip=landmark_frame_skip),
            "cnn": cnn_extractor,
        }

    return _PROCESS_LOCAL_EXTRACTORS[cache_key]


def _run_extractor_safely(extractor: Any, video_path: Path, module_name: str) -> Dict[str, Any]:
    try:
        result = extractor.process_video(video_path)
        return result if isinstance(result, dict) else {}
    except Exception as exc:
        print(f"  {video_path.name}: {module_name} extraction failed - {exc}")
        return {}


def extract_video_features(
    video_path: Path,
    label: str,
    blink_frame_skip: int = 2,
    headpose_frame_skip: int = 2,
    landmark_frame_skip: int = 1,
    cnn_frame_skip: int = 5,
    cnn_batch_size: int = 32,
    cnn_backbone: str = "resnet50",
    cnn_weights_path: Optional[str] = None,
    cnn_use_pretrained: bool = True,
) -> Optional[Dict[str, Any]]:
    try:
        extractors = _get_process_local_extractors(
            blink_frame_skip=blink_frame_skip,
            headpose_frame_skip=headpose_frame_skip,
            landmark_frame_skip=landmark_frame_skip,
            cnn_frame_skip=cnn_frame_skip,
            cnn_batch_size=cnn_batch_size,
            cnn_backbone=cnn_backbone,
            cnn_weights_path=cnn_weights_path,
            cnn_use_pretrained=cnn_use_pretrained,
        )

        blink_result = _run_extractor_safely(extractors["blink"], video_path, "blink")
        headpose_result = _run_extractor_safely(extractors["headpose"], video_path, "headpose")
        landmark_result = _run_extractor_safely(extractors["landmarks"], video_path, "landmarks")
        cnn_result = _run_extractor_safely(extractors["cnn"], video_path, "cnn")

        return FusionFeatureAssembler.from_extractor_results(
            video_path=video_path,
            label=label,
            blink_result=blink_result,
            headpose_result=headpose_result,
            landmark_result=landmark_result,
            cnn_result=cnn_result,
        )
    except Exception as exc:
        print(f"Error processing {video_path.name}: {exc}")
        return None


class FeatureExtractor:
    """Callable wrapper used by ProcessPoolExecutor."""

    def __init__(
        self,
        blink_frame_skip: int = 2,
        headpose_frame_skip: int = 2,
        landmark_frame_skip: int = 1,
        cnn_frame_skip: int = 5,
        cnn_batch_size: int = 32,
        cnn_backbone: str = "resnet50",
        cnn_weights_path: Optional[str] = None,
        cnn_use_pretrained: bool = True,
    ):
        self.blink_frame_skip = blink_frame_skip
        self.headpose_frame_skip = headpose_frame_skip
        self.landmark_frame_skip = landmark_frame_skip
        self.cnn_frame_skip = cnn_frame_skip
        self.cnn_batch_size = cnn_batch_size
        self.cnn_backbone = cnn_backbone
        self.cnn_weights_path = cnn_weights_path
        self.cnn_use_pretrained = cnn_use_pretrained

    def __call__(self, video_path: Path, label: str) -> Optional[Dict[str, Any]]:
        return extract_video_features(
            video_path=video_path,
            label=label,
            blink_frame_skip=self.blink_frame_skip,
            headpose_frame_skip=self.headpose_frame_skip,
            landmark_frame_skip=self.landmark_frame_skip,
            cnn_frame_skip=self.cnn_frame_skip,
            cnn_batch_size=self.cnn_batch_size,
            cnn_backbone=self.cnn_backbone,
            cnn_weights_path=self.cnn_weights_path,
            cnn_use_pretrained=self.cnn_use_pretrained,
        )


def process_videos_parallel(
    video_paths: Sequence[Tuple[Path, str]],
    num_workers: int = 2,
    blink_frame_skip: int = 2,
    headpose_frame_skip: int = 2,
    landmark_frame_skip: int = 1,
    cnn_frame_skip: int = 5,
    cnn_batch_size: int = 32,
    cnn_backbone: str = "resnet50",
    cnn_weights_path: Optional[str] = None,
    cnn_use_pretrained: bool = True,
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    total_videos = len(video_paths)
    worker_count = max(1, int(num_workers))
    extractor = FeatureExtractor(
        blink_frame_skip=blink_frame_skip,
        headpose_frame_skip=headpose_frame_skip,
        landmark_frame_skip=landmark_frame_skip,
        cnn_frame_skip=cnn_frame_skip,
        cnn_batch_size=cnn_batch_size,
        cnn_backbone=cnn_backbone,
        cnn_weights_path=cnn_weights_path,
        cnn_use_pretrained=cnn_use_pretrained,
    )

    print(f"Processing {total_videos} videos with {worker_count} worker(s)...")
    print(
        "Frame skip configuration: "
        f"blink={blink_frame_skip}, "
        f"headpose={headpose_frame_skip}, "
        f"landmarks={landmark_frame_skip}, "
        f"cnn={cnn_frame_skip}"
    )
    print(f"CNN batch size: {cnn_batch_size}")

    start_time = time.perf_counter()
    completed = 0
    failed = 0

    if worker_count == 1:
        for video_path, label in video_paths:
            completed += 1
            result = extractor(video_path, label)
            if result is not None:
                results.append(result)
            else:
                failed += 1
                print(f"  x {video_path.name}: no fused features returned")

            elapsed = max(1e-6, time.perf_counter() - start_time)
            rate = completed / elapsed
            print(
                f"  Progress: {completed}/{total_videos} "
                f"({rate:.2f} videos/sec) - "
                f"Success: {len(results)}, Failed: {failed}"
            )

        elapsed = time.perf_counter() - start_time
        print(f"\nCompleted in {elapsed:.1f} seconds")
        print(f"Successfully processed: {len(results)}/{total_videos} videos")
        return results

    with ProcessPoolExecutor(
        max_workers=worker_count,
        mp_context=multiprocessing.get_context("spawn"),
    ) as executor:
        future_to_video = {
            executor.submit(extractor, video_path, label): (video_path, label)
            for video_path, label in video_paths
        }

        for future in as_completed(future_to_video):
            video_path, _ = future_to_video[future]
            completed += 1

            try:
                result = future.result()
                if result is not None:
                    results.append(result)
                else:
                    failed += 1
                    print(f"  x {video_path.name}: no fused features returned")
            except Exception as exc:
                failed += 1
                print(f"  x {video_path.name}: error - {str(exc)[:120]}")

            if completed % 10 == 0 or completed == total_videos:
                elapsed = max(1e-6, time.perf_counter() - start_time)
                rate = completed / elapsed
                print(
                    f"  Progress: {completed}/{total_videos} "
                    f"({rate:.2f} videos/sec) - "
                    f"Success: {len(results)}, Failed: {failed}"
                )

    elapsed = time.perf_counter() - start_time
    print(f"\nCompleted in {elapsed:.1f} seconds")
    print(f"Successfully processed: {len(results)}/{total_videos} videos")
    return results


def collect_video_paths(data_dir: Path) -> List[Tuple[Path, str]]:
    real_dir = data_dir / "real"
    fake_dir = data_dir / "fake"

    if not real_dir.exists() or not fake_dir.exists():
        raise FileNotFoundError(f"Expected directories: {real_dir} and {fake_dir}")

    video_paths: List[Tuple[Path, str]] = []
    real_videos = sorted(real_dir.glob("*.mp4"))
    fake_videos = sorted(fake_dir.glob("*.mp4"))

    video_paths.extend((video_path, "real") for video_path in real_videos)
    video_paths.extend((video_path, "fake") for video_path in fake_videos)

    print(f"Found {len(real_videos)} real videos")
    print(f"Found {len(fake_videos)} fake videos")
    print(f"Total: {len(video_paths)} videos\n")

    return video_paths


def resolve_cnn_weights_path(script_dir: Path, cli_value: Optional[str]) -> Path:
    if cli_value:
        candidate = Path(cli_value)
    else:
        candidate = Path("D:/New_folder/deepfake_detection/deepfake_project/Deepfake_cnn_weights.pth")

    candidate = candidate.resolve()
    if not candidate.exists():
        raise FileNotFoundError(
            "A compatible CNN checkpoint is required so cnn_score is a real prediction. "
            f"Checkpoint not found: {candidate}"
        )

    return candidate


def validate_dataset_rows(rows: Sequence[Dict[str, Any]]) -> None:
    rows = list(rows)
    if not rows:
        raise ValueError("No rows are available for dataset validation.")

    required_columns = set(FusionFeatureAssembler.FEATURE_COLUMNS)
    allowed_columns = set(FusionFeatureAssembler.METADATA_COLUMNS + FusionFeatureAssembler.FEATURE_COLUMNS)

    for index, row in enumerate(rows, start=1):
        row_keys = set(row.keys())
        missing_columns = sorted(required_columns - row_keys)
        extra_columns = sorted(row_keys - allowed_columns)
        if missing_columns:
            raise RuntimeError(f"Row {index} is missing required columns: {missing_columns}")
        if extra_columns:
            raise RuntimeError(f"Row {index} contains unexpected columns: {extra_columns}")

        cnn_score = FusionFeatureAssembler._safe_float(row.get("cnn_score"), default=np.nan)
        if not np.isfinite(cnn_score) or not 0.0 <= cnn_score <= 1.0:
            raise RuntimeError(f"Row {index} has invalid cnn_score={row.get('cnn_score')!r}")

    cnn_scores = np.asarray(
        [FusionFeatureAssembler._safe_float(row.get("cnn_score"), default=np.nan) for row in rows],
        dtype=np.float32,
    )
    finite_scores = cnn_scores[np.isfinite(cnn_scores)]
    if len(finite_scores) < 2:
        raise RuntimeError(
            "Dataset validation needs at least two valid cnn_score values to verify "
            "the CNN output is not constant."
        )

    score_span = float(np.max(finite_scores) - np.min(finite_scores))
    if score_span <= 1e-6:
        raise RuntimeError(
            "cnn_score is constant across the dataset. Check that the CNN checkpoint "
            "is a compatible VisualDeepfakeNet classifier."
        )


def validate_written_csv(output_csv: Path) -> List[Dict[str, Any]]:
    rows = FusionFeatureAssembler.read_csv(output_csv)
    if not rows:
        raise RuntimeError("The output CSV was written but contains no data rows.")

    expected_columns = ["video_path", "label", *FusionFeatureAssembler.FEATURE_COLUMNS]
    actual_columns = list(rows[0].keys())
    if actual_columns != expected_columns:
        raise RuntimeError(
            f"CSV columns do not match the required schema. "
            f"Expected {expected_columns}, got {actual_columns}."
        )

    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the compact deepfake feature CSV.")
    parser.add_argument(
        "--data-dir",
        type=str,
        default=None,
        help="Path to directory containing 'real' and 'fake' subfolders (default: ../data)",
    )
    parser.add_argument(
        "--cnn-weights",
        type=str,
        default=None,
        help="Path to a compatible CNN checkpoint (.pth file).",
    )
    parser.add_argument(
        "--cnn-batch-size",
        type=int,
        default=32,
        help="Batch size for CNN inference (reduce if you hit OOM).",
    )
    parser.add_argument(
        "--num-workers",
        type=int,
        default=None,
        help="Number of parallel workers (default: 1 if GPU else CPU count//2).",
    )
    parser.add_argument(
        "--output-csv",
        type=str,
        default="dataset_features.csv",
        help="Output CSV filename.",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    data_dir = Path(args.data_dir) if args.data_dir else script_dir.parent / "data"
    output_csv = Path(args.output_csv)
    cnn_weights_path = resolve_cnn_weights_path(script_dir, args.cnn_weights)

    gpu_available = torch.cuda.is_available()
    if gpu_available:
        print(f"GPU detected: {torch.cuda.get_device_name(0)}")
        print(f"Using {torch.cuda.device_count()} GPU(s)")
        num_workers = args.num_workers if args.num_workers is not None else max(
            1, min(2, multiprocessing.cpu_count() // 2 or 1)
        )
    else:
        print("No GPU detected - processing will run on CPU")
        num_workers = args.num_workers if args.num_workers is not None else max(
            1, multiprocessing.cpu_count() // 2 or 1
        )

    print(f"Using {num_workers} parallel worker(s)")
    print(f"Using CNN weights: {cnn_weights_path}")

    blink_frame_skip = 4
    headpose_frame_skip = 4
    landmark_frame_skip = 2
    cnn_frame_skip = 10
    cnn_backbone = "resnet50"
    cnn_use_pretrained = True

    video_paths = collect_video_paths(data_dir)
    if not video_paths:
        print("No videos found to process.")
        return

    results = process_videos_parallel(
        video_paths=video_paths,
        num_workers=num_workers,
        blink_frame_skip=blink_frame_skip,
        headpose_frame_skip=headpose_frame_skip,
        landmark_frame_skip=landmark_frame_skip,
        cnn_frame_skip=cnn_frame_skip,
        cnn_batch_size=args.cnn_batch_size,
        cnn_backbone=cnn_backbone,
        cnn_weights_path=str(cnn_weights_path),
        cnn_use_pretrained=cnn_use_pretrained,
    )

    if not results:
        print("No videos were successfully processed.")
        return

    rows = FusionFeatureAssembler.tabularize_records(results)
    validate_dataset_rows(rows)

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    FusionFeatureAssembler.write_csv(rows, output_csv)
    written_rows = validate_written_csv(output_csv)

    finite_scores = np.asarray(
        [float(row["cnn_score"]) for row in rows if np.isfinite(float(row["cnn_score"]))],
        dtype=np.float32,
    )

    print(f"\nDataset saved to: {output_csv.resolve()}")
    print(f"Shape: {len(rows)} rows x {len(written_rows[0]) if written_rows else 0} columns")

    print("\n" + "=" * 52)
    print("DATASET SUMMARY")
    print("=" * 52)
    print(f"Feature count        : {len(FusionFeatureAssembler.FEATURE_COLUMNS)}")
    print(f"Dataset rows         : {len(rows)}")
    print(f"CSV columns          : {', '.join(written_rows[0].keys())}")
    print(f"CNN score min        : {float(np.min(finite_scores)):.4f}")
    print(f"CNN score max        : {float(np.max(finite_scores)):.4f}")

    real_rows = [row for row in rows if str(row.get("label", "")).strip().lower() == "real"]
    fake_rows = [row for row in rows if str(row.get("label", "")).strip().lower() == "fake"]
    print(f"Real videos processed: {len(real_rows)}")
    print(f"Fake videos processed: {len(fake_rows)}")


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
