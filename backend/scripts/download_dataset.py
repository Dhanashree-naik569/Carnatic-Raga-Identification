"""
download_dataset.py — downloads real, labelled Carnatic raga audio from the
HuggingFace dataset "sarayusapa/carnatic-ragas" into backend/dataset/<Raga>/,
generalized from the user-provided download_kalyani.py to pull EVERY raga
present in the dataset (not just one).

Usage:
    pip install datasets soundfile
    python scripts/download_dataset.py                 # download all ragas
    python scripts/download_dataset.py --raga Kalyani   # download one raga only

After downloading, run `python train.py` — it automatically detects and
trains on any real audio found under dataset/<Raga>/, falling back to the
synthetic pipeline only for ragas that still have no real files.
"""
import argparse
import os

from datasets import load_dataset
import soundfile as sf

DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dataset")


def download(raga_filter=None):
    print("Loading sarayusapa/carnatic-ragas from HuggingFace (this may take a while)...")
    dataset = load_dataset("sarayusapa/carnatic-ragas", split="train")

    counts = {}
    for i, item in enumerate(dataset):
        raga = item["raga"]
        if raga_filter and raga != raga_filter:
            continue

        audio = item["audio"]["array"]
        sr = item["audio"]["sampling_rate"]

        raga_dir = os.path.join(DATASET_DIR, raga)
        os.makedirs(raga_dir, exist_ok=True)

        file_path = os.path.join(raga_dir, f"{raga.lower().replace(' ', '_')}_{i}.wav")
        sf.write(file_path, audio, sr)

        counts[raga] = counts.get(raga, 0) + 1
        if sum(counts.values()) % 25 == 0:
            print(f"...{sum(counts.values())} files downloaded so far")

    print("\nDownload complete.")
    for raga, n in sorted(counts.items()):
        print(f"  {raga}: {n} files")
    print(f"\nTotal: {sum(counts.values())} files across {len(counts)} ragas")
    print(f"Saved under: {DATASET_DIR}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download real Carnatic raga audio into backend/dataset/")
    parser.add_argument("--raga", help="Download only this raga (must match the dataset's label exactly, e.g. Kalyani)")
    args = parser.parse_args()
    download(raga_filter=args.raga)
