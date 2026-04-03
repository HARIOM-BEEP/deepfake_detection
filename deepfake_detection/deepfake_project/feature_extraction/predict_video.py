import joblib
import pandas as pd
from pathlib import Path

# Import your full pipeline
from deepfake_pipeline import DeepfakeDetectionPipeline
from cnn_visual_detector import resolve_cnn_checkpoint_path

# ===============================
# LOAD TRAINED MODEL + SCALER
# ===============================
MODEL_PATH = "deepfake_xgb_model.joblib"
SCALER_PATH = "deepfake_scaler.joblib"

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)

FEATURES = [
    "blink_rate",
    "interval_cv",
    "yaw_variance",
    "pitch_variance",
    "landmark_jitter",
    "cnn_score",
    "embedding_mean",
]

# ===============================
# INITIALIZE PIPELINE
# ===============================
pipeline = DeepfakeDetectionPipeline(
    blink_frame_skip=2,
    headpose_frame_skip=2,
    landmark_frame_skip=1,
    cnn_frame_skip=5,
    cnn_backbone="resnet50",
    cnn_weights_path=resolve_cnn_checkpoint_path(),
)

# ===============================
# 🎥 PREDICT FUNCTION
# ===============================
def predict_video(video_path):
    video_path = Path(video_path)

    print(f"\n🎥 Processing video: {video_path.name}")

    # Step 1: Extract features using YOUR pipeline
    feature_record, module_results = pipeline.extract_features(video_path)

    print("\n📊 Extracted Features:")
    for f in FEATURES:
        print(f"{f}: {feature_record.get(f, 0)}")

    # Step 2: Convert to DataFrame
    df = pd.DataFrame([{
        f: feature_record.get(f, 0) for f in FEATURES
    }])

    # Step 3: Apply SAME scaler (VERY IMPORTANT)
    df_scaled = scaler.transform(df)

    # Step 4: Predict using trained model
    pred = model.predict(df_scaled)[0]
    prob = model.predict_proba(df_scaled)[0][1]

    label = "FAKE" if pred == 1 else "REAL"

    print("\n🔥 FINAL RESULT:")
    print(f"Prediction  : {label}")
    print(f"Confidence  : {prob:.4f}")

    return {
        "prediction": label,
        "confidence": float(prob),
        "features": feature_record,
    }


# ===============================
# 🚀 RUN
# ===============================
if __name__ == "__main__":
    video_path = r"D:\New_folder\deepfake_detection\deepfake_project\data\fake\01_03__podium_speech_happy__480LQD1C.mp4"  # put your video here
    result = predict_video(video_path)
