import React, { useRef, useState } from "react";
import { Mic2, Square } from "lucide-react";

export default function AudioRecorder({
  onRecordingComplete,
  disabled = false,
}) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  const startRecording = async () => {
    if (disabled || recording) return;

    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

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
        setRecording(false);

        stream.getTracks().forEach((track) => track.stop());

        streamRef.current = null;
        mediaRecorderRef.current = null;
      };

      mediaRecorder.start();

      setRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);

      setError(
        "Microphone access is required. Please allow microphone permission and try again."
      );

      setRecording(false);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();
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