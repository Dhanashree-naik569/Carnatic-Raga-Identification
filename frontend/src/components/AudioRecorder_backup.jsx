import React, { useRef, useState, useEffect, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

/**
 * Records microphone audio via MediaRecorder and hands the resulting Blob
 * back to the parent through onRecordingComplete(blob, mimeType).
 * Also renders a simple live amplitude visualizer using the Web Audio API.
 */
export default function AudioRecorder({ onRecordingComplete, disabled }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [levels, setLevels] = useState(Array(24).fill(4));

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);

  const cleanupAudioGraph = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioGraph();
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cleanupAudioGraph, stopStream]);

  const visualize = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bars = 24;
      const step = Math.floor(data.length / bars) || 1;
      const next = new Array(bars);
      for (let i = 0; i < bars; i++) {
        next[i] = 4 + (data[i * step] / 255) * 40;
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      visualize();

      const mimeCandidates = ["audio/webm", "audio/ogg", "audio/mp4"];
      const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported?.(m)) || "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
    recorder.onstop = () => {
  console.log("Recorded MIME:", recorder.mimeType);

  const blob = new Blob(chunksRef.current, {
    type: recorder.mimeType || "audio/webm",
  });

  console.log("Blob type:", blob.type);
  console.log("Blob size:", blob.size);

  cleanupAudioGraph();
  stopStream();
  onRecordingComplete(blob, recorder.mimeType || "audio/webm");
};

      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setError(
        "Microphone access was denied or is unavailable. Please allow microphone permissions and try again."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setLevels(Array(24).fill(4));
  };

  const format = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-end gap-1 h-16">
        {levels.map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-gradient-to-t from-gold-600 to-gold-300 transition-all duration-75"
            style={{ height: `${h}px`, opacity: recording ? 1 : 0.25 }}
          />
        ))}
      </div>

      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={disabled}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
          recording
            ? "bg-maroon-600 pulse-ring"
            : "bg-gradient-to-br from-gold-400 to-gold-600 hover:scale-105"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {disabled ? (
          <Loader2 className="animate-spin text-maroon-950" size={28} />
        ) : recording ? (
          <Square className="text-white" size={28} fill="white" />
        ) : (
          <Mic className="text-maroon-950" size={30} />
        )}
      </button>

      <div className="text-center">
        <p className="text-sm font-medium text-white/80">
          {recording ? `Listening… ${format(seconds)}` : "Tap to sing or play a phrase"}
        </p>
        <p className="text-xs text-white/40 mt-1">
          Sing a few phrases (5–15s) with steady Sa for best results
        </p>
      </div>

      {error && <p className="text-sm text-maroon-500 text-center max-w-xs">{error}</p>}
    </div>
  );
}
