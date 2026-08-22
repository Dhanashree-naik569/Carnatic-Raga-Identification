"""
scan_dataset.py — adapted from the user-provided raga_identification.py.
Scans backend/dataset/ and reports which raga folders exist and how many
audio files are in each. Run from the backend/ folder:

    python scripts/scan_dataset.py
"""
import os
import numpy as np

DATASET_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dataset")

print("Checking dataset folders...\n")

labels = []

for raga_name in sorted(os.listdir(DATASET_PATH)):
    raga_folder = os.path.join(DATASET_PATH, raga_name)

    if os.path.isdir(raga_folder):
        print("Found Raga Folder:", raga_name)

        file_count = 0
        for file in os.listdir(raga_folder):
            if file.endswith(".wav") or file.endswith(".mp3") or file.endswith(".flac"):
                file_count += 1
                labels.append(raga_name)

        print("Files inside:", file_count)
        print()

labels = np.array(labels)

print("Detected Classes:", np.unique(labels))
print("Total labelled audio files:", len(labels))
