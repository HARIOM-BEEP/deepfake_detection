# =============================================================================
# train_fusion.py — Deepfake Detection: Improved XGBoost Training Pipeline
# =============================================================================
# ✔ Feature scaling with StandardScaler (fit on train only)
# ✔ Stratified train/test split to preserve class balance
# ✔ 5-fold stratified cross-validation
# ✔ Hyperparameter tuning via RandomizedSearchCV
# ✔ Class imbalance handling via scale_pos_weight
# ✔ Feature importance plot
# ✔ Confusion matrix display
# ✔ ROC-AUC score + ROC curve plot
# ✔ Model and scaler saved via joblib
# ✔ Clean modular code structure
# =============================================================================

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import joblib

from sklearn.model_selection import (
    train_test_split,
    StratifiedKFold,
    cross_val_score,
    RandomizedSearchCV,
)
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
    roc_auc_score,
    RocCurveDisplay,
)
from xgboost import XGBClassifier

# ── Constants ────────────────────────────────────────────────────────────────

DATA_PATH    = "final_dataset.csv"
MODEL_PATH   = "deepfake_xgb_model.joblib"
SCALER_PATH  = "deepfake_scaler.joblib"
RANDOM_STATE = 42
TEST_SIZE    = 0.20
CV_FOLDS     = 5

FEATURES = [
    "blink_rate",
    "interval_cv",
    "yaw_variance",
    "pitch_variance",
    "landmark_jitter",
    "cnn_score",
    "embedding_mean",
]


# ── 1. Data Loading ───────────────────────────────────────────────────────────

def load_data(path: str) -> tuple[pd.DataFrame, pd.Series]:
    """
    Load CSV, select feature columns, encode labels.
    ✔ Validates that required columns exist before proceeding.
    """
    print(f"\n{'='*60}")
    print(" STEP 1 — Loading Data")
    print(f"{'='*60}")

    df = pd.read_csv(path)
    print(f"  Dataset shape   : {df.shape}")
    print(f"  Label counts    :\n{df['label'].value_counts().to_string()}")

    missing = [c for c in FEATURES + ["label"] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in dataset: {missing}")

    X = df[FEATURES].copy()
    # ❌ REMOVED: X.fillna(X.mean()) applied globally — causes data leakage
    #             (mean computed on full dataset, including test rows)
    y = df["label"].map({"real": 0, "fake": 1})

    if y.isna().any():
        raise ValueError("Found unexpected label values. Expected 'real' / 'fake'.")

    return X, y


# ── 2. Preprocessing ──────────────────────────────────────────────────────────

def preprocess(
    X: pd.DataFrame,
    y: pd.Series,
) -> tuple:
    """
    ✔ Stratified split — preserves class ratio in both splits.
    ✔ Impute NaN with column mean computed ONLY on training data.
    ✔ StandardScaler fitted ONLY on training data, applied to test data.
    ✔ scale_pos_weight computed from training labels (class imbalance).
    """
    print(f"\n{'='*60}")
    print(" STEP 2 — Preprocessing")
    print(f"{'='*60}")

    # ✔ ADDED: stratify=y — prevents class skew in splits
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,                   # ➕ stratified split
    )

    # ✔ ADDED: Impute using train-set mean only — no leakage
    train_means = X_train.mean()
    X_train = X_train.fillna(train_means)
    X_test  = X_test.fillna(train_means)   # ➕ reuse train means on test

    # ✔ ADDED: StandardScaler fitted on train, transformed on both
    scaler  = StandardScaler()
    X_train = scaler.fit_transform(X_train)   # ➕ fit+transform train
    X_test  = scaler.transform(X_test)        # ➕ transform test only

    # ✔ ADDED: Compute scale_pos_weight for class imbalance
    neg = (y_train == 0).sum()
    pos = (y_train == 1).sum()
    scale_pos_weight = neg / pos if pos > 0 else 1.0

    print(f"  Train size      : {len(X_train)}")
    print(f"  Test size       : {len(X_test)}")
    print(f"  Train class dist: real={neg}, fake={pos}")
    print(f"  scale_pos_weight: {scale_pos_weight:.4f}")

    # Save scaler for inference reuse
    joblib.dump(scaler, SCALER_PATH)
    print(f"  Scaler saved    → {SCALER_PATH}")

    return X_train, X_test, y_train, y_test, scaler, scale_pos_weight


# ── 3. Model Training ─────────────────────────────────────────────────────────

def train_model(
    X_train: np.ndarray,
    y_train: pd.Series,
    scale_pos_weight: float,
) -> XGBClassifier:
    """
    ✔ RandomizedSearchCV over a broad hyperparameter space.
    ✔ StratifiedKFold used inside CV to preserve class balance.
    ✔ 5-fold cross-validation reported before final fit.
    ✔ Best model saved via joblib.
    """
    print(f"\n{'='*60}")
    print(" STEP 3 — Hyperparameter Tuning + Cross-Validation")
    print(f"{'='*60}")

    # ❌ REMOVED: Static XGBClassifier with fixed hyperparameters
    # ➕ ADDED: RandomizedSearchCV with broad search space
    param_dist = {
        "n_estimators"    : [100, 200, 300, 400, 500],
        "max_depth"       : [3, 4, 5, 6, 7],
        "learning_rate"   : [0.01, 0.03, 0.05, 0.1, 0.2],
        "subsample"       : [0.6, 0.7, 0.8, 0.9, 1.0],
        "colsample_bytree": [0.6, 0.7, 0.8, 0.9, 1.0],
        "min_child_weight": [1, 3, 5],
        "gamma"           : [0, 0.1, 0.3, 0.5],
        "reg_alpha"       : [0, 0.01, 0.1],       # L1 regularisation
        "reg_lambda"      : [1, 1.5, 2],           # L2 regularisation
    }

    base_model = XGBClassifier(
        scale_pos_weight=scale_pos_weight,       # ✔ class imbalance
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    cv_strategy = StratifiedKFold(
        n_splits=CV_FOLDS,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    search = RandomizedSearchCV(
        estimator=base_model,
        param_distributions=param_dist,
        n_iter=40,                               # 40 random combinations
        scoring="accuracy",
        cv=cv_strategy,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbose=1,
    )

    search.fit(X_train, y_train)
    best_model = search.best_estimator_

    print(f"\n  Best params     :")
    for k, v in search.best_params_.items():
        print(f"    {k:<22}: {v}")

    # ✔ ADDED: Standalone 5-fold CV on best model
    print(f"\n  5-Fold Cross-Validation (best model):")
    cv_scores = cross_val_score(
        best_model, X_train, y_train,
        cv=cv_strategy, scoring="accuracy", n_jobs=-1
    )
    print(f"    Fold accuracies : {np.round(cv_scores, 4)}")
    print(f"    Mean accuracy   : {cv_scores.mean():.4f}")
    print(f"    Std deviation   : {cv_scores.std():.4f}")

    # Save model
    joblib.dump(best_model, MODEL_PATH)
    print(f"\n  Model saved     → {MODEL_PATH}")

    return best_model


# ── 4. Evaluation ─────────────────────────────────────────────────────────────

def evaluate_model(
    model: XGBClassifier,
    X_test: np.ndarray,
    y_test: pd.Series,
    X_train: np.ndarray,
    y_train: pd.Series,
) -> None:
    """
    ✔ Accuracy, classification report
    ✔ Overfitting check (train vs test accuracy gap)
    ✔ Confusion matrix plot
    ✔ ROC-AUC + ROC curve plot
    ✔ Feature importance plot
    """
    print(f"\n{'='*60}")
    print(" STEP 4 — Evaluation")
    print(f"{'='*60}")

    y_pred      = model.predict(X_test)
    y_pred_prob = model.predict_proba(X_test)[:, 1]

    # ── Accuracy ──────────────────────────────────────────────────
    test_acc  = accuracy_score(y_test, y_pred)
    train_acc = accuracy_score(y_train, model.predict(X_train))
    gap       = train_acc - test_acc

    print(f"\n  Train Accuracy  : {train_acc:.4f}")
    print(f"  Test Accuracy   : {test_acc:.4f}")
    print(f"  Overfit Gap     : {gap:.4f}  ", end="")
    print("⚠ Possible overfitting" if gap > 0.05 else "✔ Generalising well")

    # ── Classification Report ─────────────────────────────────────
    print(f"\n  Classification Report:\n")
    print(classification_report(y_test, y_pred, target_names=["real", "fake"]))

    # ── ROC-AUC ───────────────────────────────────────────────────
    roc_auc = roc_auc_score(y_test, y_pred_prob)
    print(f"  ROC-AUC Score   : {roc_auc:.4f}")

    fig, axes = plt.subplots(1, 3, figsize=(20, 5))
    fig.suptitle("Deepfake Detection — Model Evaluation", fontsize=14, fontweight="bold")

    # ── Plot 1: Confusion Matrix ──────────────────────────────────
    cm = confusion_matrix(y_test, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["real", "fake"])
    disp.plot(ax=axes[0], colorbar=False, cmap="Blues")
    axes[0].set_title("Confusion Matrix")

    # ── Plot 2: ROC Curve ─────────────────────────────────────────
    RocCurveDisplay.from_predictions(
        y_test, y_pred_prob,
        name=f"XGBoost (AUC = {roc_auc:.3f})",
        ax=axes[1],
    )
    axes[1].plot([0, 1], [0, 1], "k--", label="Random classifier")
    axes[1].set_title("ROC Curve")
    axes[1].legend(loc="lower right")

    # ── Plot 3: Feature Importance ────────────────────────────────
    importances = model.feature_importances_
    sorted_idx  = np.argsort(importances)[::-1]
    sorted_feats = [FEATURES[i] for i in sorted_idx]
    sorted_imps  = importances[sorted_idx]

    bars = axes[2].barh(sorted_feats[::-1], sorted_imps[::-1], color="steelblue")
    axes[2].bar_label(bars, fmt="%.3f", padding=3)
    axes[2].set_xlabel("Importance Score")
    axes[2].set_title("Feature Importance (XGBoost)")
    axes[2].set_xlim(0, sorted_imps.max() * 1.2)

    print(f"\n  Feature Importance Ranking:")
    for rank, (feat, imp) in enumerate(zip(sorted_feats, sorted_imps), 1):
        print(f"    {rank}. {feat:<25} {imp:.4f}")

    plt.tight_layout()
    out_path = "evaluation_plots.png"
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.show()
    print(f"\n  Plots saved     → {out_path}")


# ── 5. Main Entrypoint ────────────────────────────────────────────────────────

def main():
    print("\n" + "=" * 60)
    print("  DEEPFAKE DETECTION — XGBoost Training Pipeline v2.0")
    print("=" * 60)

    X, y = load_data(DATA_PATH)

    X_train, X_test, y_train, y_test, scaler, scale_pos_weight = preprocess(X, y)

    model = train_model(X_train, y_train, scale_pos_weight)

    evaluate_model(model, X_test, y_test, X_train, y_train)

    print(f"\n{'='*60}")
    print("  Pipeline complete. Artifacts saved:")
    print(f"    Model  → {MODEL_PATH}")
    print(f"    Scaler → {SCALER_PATH}")
    print(f"    Plots  → evaluation_plots.png")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()