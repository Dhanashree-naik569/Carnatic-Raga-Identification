"""
raga_engine.py
--------------
Orchestrates the full Carnatic raga identification pipeline:

1. Preprocess audio using preprocess.py
2. Extract shared audio features
3. Calculate pitch-class distribution
4. Compare the distribution against templates for the 11 trained ragas
5. Run the trained Keras model
6. Blend template and ML predictions
7. Return the final prediction, confidence, alternatives,
   pitch-class distribution, and display features

The template layer intentionally uses the SAME 11 class names as the
trained model and dataset.

TRAINED RAGAS:
    Anandabhairavi
    Bhairavi
    Bilahari
    Bowli
    Dwijavanthi
    Gaanamurthe
    Hamsadhwani
    Neelambari
    Poorvikalyani
    Saveri
    Thodi
"""

import numpy as np

from preprocess import preprocess_audio

from feature_extraction import (
    _compute_raw_features,
    extract_feature_vector,
    extract_display_features,
)

from config import Config

import predict as keras_predict


# ============================================================
# 11 TRAINED RAGA CLASSES
# ============================================================
#
# IMPORTANT:
# These names MUST match label_encoder.pkl exactly.
#
# The swara values use the same 0-11 pitch-class representation
# used by the project's raga template matcher.
#

MODEL_RAGA_SWARAS = {
    "Anandabhairavi": [0, 2, 3, 5, 7, 9, 10],

    "Bhairavi": [
        0, 1, 2, 3, 5, 7, 8, 9, 10
    ],

    "Bilahari": [
        0, 2, 4, 5, 7, 9, 11
    ],

    "Bowli": [
        0, 1, 4, 7, 11
    ],

    "Dwijavanthi": [
        0, 2, 3, 4, 5, 7, 9, 11
    ],

    "Gaanamurthe": [
        0, 1, 3, 5, 7, 9, 11
    ],

    "Hamsadhwani": [
        0, 2, 4, 7, 11
    ],

    "Neelambari": [
        0, 2, 3, 5, 7, 10
    ],

    "Poorvikalyani": [
        0, 2, 4, 5, 6, 7, 9, 11
    ],

    "Saveri": [
        0, 1, 4, 5, 7, 8, 11
    ],

    "Thodi": [
        0, 1, 3, 5, 7, 8, 10
    ],
}


# Keep the order explicit and deterministic.
RAGA_NAMES = list(MODEL_RAGA_SWARAS.keys())


# ============================================================
# TEMPLATE CREATION
# ============================================================

def _template_vector(swaras):
    """
    Convert a list of pitch classes into a normalized 12-dimensional
    template vector.

    Example:
        [0, 2, 4, 7, 11]

    becomes a 12-element vector where those pitch classes are 1
    and all other pitch classes are 0, followed by normalization.
    """

    vec = np.zeros(12, dtype=np.float64)

    for s in swaras:
        vec[s % 12] = 1.0

    return vec / (np.linalg.norm(vec) + 1e-9)


# Build exactly 11 templates.
TEMPLATES = {
    name: _template_vector(swaras)
    for name, swaras in MODEL_RAGA_SWARAS.items()
}


# ============================================================
# TEMPLATE MATCHING
# ============================================================

def best_rotation_match(pcd):
    """
    Compare the pitch-class distribution against every raga template
    under all 12 possible tonic rotations.

    Returns:
        List of tuples:
            (raga_name, rotation, score)

    sorted from highest score to lowest score.
    """

    results = []

    for rot in range(12):

        rotated = np.roll(pcd, -rot)

        for name, template in TEMPLATES.items():

            score = float(
                np.dot(rotated, template)
            )

            results.append(
                (
                    name,
                    rot,
                    score,
                )
            )

    results.sort(
        key=lambda x: x[2],
        reverse=True,
    )

    return results


# ============================================================
# MAIN IDENTIFICATION FUNCTION
# ============================================================

def identify_raga(
    file_bytes,
    top_k=5,
    include_display_features=True,
):
    """
    Identify the Carnatic raga from uploaded/recorded audio.

    Parameters
    ----------
    file_bytes:
        Raw uploaded audio bytes.

    top_k:
        Number of top predictions to return.

    include_display_features:
        Whether to include waveform/spectrogram/etc. data
        in the response.

    Returns
    -------
    dict
        Prediction result.
    """

    # ========================================================
    # 1. PREPROCESS AUDIO
    # ========================================================

    analysis_window = getattr(
        Config,
        "ANALYSIS_WINDOW_SECONDS",
        None,
    )

    y, sr = preprocess_audio(
        file_bytes,
        duration=(
            analysis_window
            if analysis_window
            else None
        ),
    )


    # ========================================================
    # 2. COMPUTE SHARED FEATURES ONCE
    # ========================================================
    #
    # This is important for performance and consistency.
    #
    # The same raw features are reused by:
    #
    #   - pitch-class distribution
    #   - ML feature vector
    #   - display features
    #

    raw = _compute_raw_features(
        y,
        sr,
    )


    # ========================================================
    # 3. PITCH-CLASS DISTRIBUTION
    # ========================================================

    chroma = raw["chroma"]

    pcd = chroma.mean(
        axis=1
    )

    pcd = pcd / (
        np.linalg.norm(pcd)
        + 1e-9
    )


    # ========================================================
    # 4. TEMPLATE MATCHING
    # ========================================================

    ranked = best_rotation_match(
        pcd
    )


    # ========================================================
    # 5. KEEP BEST ROTATION FOR EACH RAGA
    # ========================================================

    best_per_raga = {}

    for name, rot, score in ranked:

        if (
            name not in best_per_raga
            or score > best_per_raga[name][1]
        ):
            best_per_raga[name] = (
                rot,
                score,
            )


    template_ranked = sorted(
        best_per_raga.items(),
        key=lambda kv: kv[1][1],
        reverse=True,
    )


    # ========================================================
    # 6. KERAS MODEL PREDICTION
    # ========================================================
    #
    # The trained model uses the exact same 11 class names.
    #

    feature_vec = extract_feature_vector(
        y,
        sr,
        raw=raw,
    )

    ml_probs = (
        keras_predict.get_keras_probabilities(
            feature_vec
        )
    )


    # ========================================================
    # 7. NORMALIZE TEMPLATE SCORES
    # ========================================================

    scores = np.array(
        [
            score
            for _, (_, score)
            in template_ranked
        ]
    )

    scores_norm = (
        scores - scores.min()
    ) / (
        scores.max()
        - scores.min()
        + 1e-9
    )


    # ========================================================
    # 8. BLEND TEMPLATE + ML RESULTS
    # ========================================================

    combined = []

    for i, (
        name,
        (rot, score),
    ) in enumerate(
        template_ranked
    ):

        template_component = float(
            scores_norm[i]
        )

        if ml_probs:

            ml_component = float(
                ml_probs.get(
                    name,
                    0.0,
                )
            )

        else:

            ml_component = (
                template_component
            )


        # Equal weighting for now.
        blended = (
            0.5 * template_component
            + 0.5 * ml_component
        )


        combined.append(
            {
                "raga": name,

                "confidence": round(
                    blended * 100,
                    2,
                ),

                "template_score": round(
                    float(score),
                    4,
                ),

                "estimated_tonic_semitone_offset": int(
                    rot
                ),
            }
        )


    # ========================================================
    # 9. SORT FINAL PREDICTIONS
    # ========================================================

    combined.sort(
        key=lambda x: x["confidence"],
        reverse=True,
    )


    # ========================================================
    # 10. NORMALIZE TOP-K CONFIDENCES
    # ========================================================

    top_results = combined[
        :top_k
    ]

    total = sum(
        item["confidence"]
        for item in top_results
    )

    total = total or 1.0


    for item in top_results:

        item["confidence"] = round(
            item["confidence"]
            / total
            * 100,
            2,
        )


    # ========================================================
    # 11. BUILD RESPONSE
    # ========================================================

    result = {
        "prediction": combined[0]["raga"],

        "confidence": combined[0][
            "confidence"
        ],

        "alternatives": combined[
            1:top_k
        ],

        "top_k": combined[
            :top_k
        ],

        "pitch_class_distribution": [
            round(
                float(v),
                4,
            )
            for v in pcd.tolist()
        ],

        "estimated_tonic_semitone_offset": combined[
            0
        ][
            "estimated_tonic_semitone_offset"
        ],

        "used_ml_model": (
            ml_probs is not None
        ),
    }


    # ========================================================
    # 12. DISPLAY FEATURES
    # ========================================================

    if include_display_features:

        result[
            "features"
        ] = extract_display_features(
            y,
            sr,
            raw=raw,
        )


    return result