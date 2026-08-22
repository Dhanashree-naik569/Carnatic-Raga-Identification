import React, { createContext, useContext, useRef, useState } from "react";
import { predictApi } from "../api/client";

const PredictionContext = createContext(null);

export function PredictionProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState(null);

  // Keeps the request alive even when Identify.jsx is unmounted.
  const abortControllerRef = useRef(null);

  const resetPrediction = () => {
    setResult(null);
    setError("");
    setSource(null);
  };

  const runPrediction = async (blob, filename, predictionSource) => {
    // Prevent two predictions from running at the same time.
    if (abortControllerRef.current) {
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSource(predictionSource);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();

      formData.append("audio", blob, filename);
      formData.append("source", predictionSource);

      const response = await predictApi.predict(
        formData,
        controller.signal
      );

      setResult(response.data);
    } catch (err) {
      if (
        err.code === "ERR_CANCELED" ||
        err.name === "CanceledError" ||
        err.name === "AbortError"
      ) {
        return;
      }

      setError(
        err.response?.data?.error ||
          "Something went wrong while analyzing the audio. Please try again."
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setLoading(false);
      }
    }
  };

  const cancelPrediction = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setLoading(false);
  };

  const value = {
    loading,
    result,
    error,
    source,
    runPrediction,
    cancelPrediction,
    resetPrediction,
  };

  return (
    <PredictionContext.Provider value={value}>
      {children}
    </PredictionContext.Provider>
  );
}

export function usePrediction() {
  const context = useContext(PredictionContext);

  if (!context) {
    throw new Error(
      "usePrediction must be used inside PredictionProvider"
    );
  }

  return context;
}