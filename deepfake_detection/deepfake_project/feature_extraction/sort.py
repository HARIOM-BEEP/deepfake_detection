import pandas as pd

# Load datasets
df1 = pd.read_csv("dataset_features.csv")  # your main dataset
df2 = pd.read_csv("cnn_only_dataset.csv")  # cnn-only dataset

# Rename column for matching
df2 = df2.rename(columns={"video_name": "video_path"})

# Drop old CNN columns from dataset1
df1 = df1.drop(columns=["cnn_score", "embedding_mean"], errors="ignore")

# Merge datasets on video name
merged_df = df1.merge(
    df2[["video_path", "cnn_score", "embedding_mean"]],
    on="video_path",
    how="left"
)

# Optional: check missing merges
missing = merged_df["cnn_score"].isna().sum()
print(f"Missing CNN features for {missing} videos")

# Save final dataset
merged_df.to_csv("final_dataset.csv", index=False)

print("✅ Merged dataset saved as final_dataset.csv")