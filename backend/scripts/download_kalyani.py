from datasets import load_dataset
import os
import soundfile as sf

# Load dataset
dataset = load_dataset("sarayusapa/carnatic-ragas", split="train")

# Create folder
os.makedirs("dataset/Kalyani", exist_ok=True)

count = 0

# Filter only Kalyani
for i, item in enumerate(dataset):
    if item["raga"] == "Kalyani":
        audio = item["audio"]["array"]
        sr = item["audio"]["sampling_rate"]

        file_path = f"dataset/Kalyani/kalyani_{i}.wav"
        sf.write(file_path, audio, sr)

        count += 1

print("Downloaded Kalyani files:", count)