import React, { useEffect, useRef, useState } from "react";
import { Mic2, Square } from "lucide-react";

export default function AudioRecorder({
  onRecordingComplete,
  onRecordingStart,
  disabled = false,
}) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    if (disabled || recording) return;

    setError("");
    setRecordingSeconds(0);

   try {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  if (onRecordingStart) {
    onRecordingStart();
  }

  streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        stream.getTracks().forEach((track) => track.stop());

        streamRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];

        setRecording(false);

        // Prediction starts ONLY after recording is stopped.
        if (blob.size > 0 && onRecordingComplete) {
          onRecordingComplete(blob);
        }
      };

      mediaRecorder.onerror = () => {
        setError("Unable to record audio. Please try again.");

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setRecording(false);

        stream.getTracks().forEach((track) => track.stop());

        streamRef.current = null;
        mediaRecorderRef.current = null;
      };

      mediaRecorder.start();

      setRecording(true);

      const startTime = Date.now();

      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor(
          (Date.now() - startTime) / 1000
        );

        setRecordingSeconds(elapsedSeconds);
      }, 250);
    } catch (err) {
      console.error("Microphone error:", err);

      setError(
        "Microphone access is required. Please allow microphone permission and try again."
      );

      setRecording(false);
      setRecordingSeconds(0);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <div className="text-center">
        <div
          className={`mx-auto mb-4 w-20 h-20 rounded-full flex items-center justify-center border ${
            recording
              ? "bg-gold-500/20 border-gold-500/50"
              : "bg-white/5 border-white/10"
          }`}
        >
          <Mic2
            size={32}
            className={
              recording
                ? "text-gold-400 animate-pulse"
                : "text-gold-400"
            }
          />
        </div>

        <p className="text-white/70 text-sm">
          {recording
            ? "Listening... Click Stop when you finish singing."
            : "Click the microphone to start recording."}
        </p>

        {recording && (
          <p className="mt-2 text-gold-400 font-mono text-lg font-semibold">
            {formatTime(recordingSeconds)}
          </p>
        )}
      </div>

      {!recording ? (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="btn-primary px-6 py-2.5 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Mic2 size={17} />
          Start Recording
        </button>
      ) : (
        <button
          type="button"
          onClick={stopRecording}
          className="btn-primary px-6 py-2.5 rounded-lg text-sm flex items-center gap-2"
        >
          <Square size={16} />
          Stop Recording
        </button>
      )}

      {error && (
        <p className="text-sm text-maroon-500 text-center">
          {error}
        </p>
      )}

      {recording && (
        <p className="text-xs text-white/40">
          Your audio will be analyzed after you stop recording.
        </p>
      )}
    </div>
  );
}