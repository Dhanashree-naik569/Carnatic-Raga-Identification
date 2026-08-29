from predict import predict_file
import glob
import os

folders = glob.glob(r".\dataset\*")

total = 0
correct = 0
failed = 0

print("\n========== DATASET TEST ==========\n")

for d in folders:

    if not os.path.isdir(d):
        continue

    actual_raga = os.path.basename(d)

    files = glob.glob(os.path.join(d, "*.wav"))[:5]

    for f in files:

        total += 1

        print("\n----------------------------------------")
        print(f"Actual Raga : {actual_raga}")
        print(f"File        : {os.path.basename(f)}")

        try:

            result = predict_file(f)

            prediction = result["prediction"]
            confidence = result["confidence"]

            print(f"Prediction  : {prediction}")
            print(f"Confidence  : {confidence}%")

            if prediction.lower() == actual_raga.lower():
                correct += 1
                print("Result      : CORRECT")
            else:
                print("Result      : WRONG")

        except Exception as e:

            failed += 1

            print("Result      : FAILED")
            print(f"Reason      : {e}")

print("\n========================================")
print("FINAL RESULTS")
print("========================================")

print(f"Total files tested : {total}")
print(f"Correct            : {correct}")
print(f"Failed             : {failed}")

successful = total - failed

if successful > 0:
    accuracy = correct / successful * 100
    print(f"Accuracy           : {accuracy:.2f}%")
else:
    print("Accuracy           : N/A")

print("========================================")