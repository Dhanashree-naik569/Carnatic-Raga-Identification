import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Mic, Square, Loader2 } from "lucide-react";

/**
 * Records microphone audio using MediaRecorder.
 *
 * Prediction starts ONLY after:
 * 1. The user clicks the microphone button.
 * 2. Recording actually starts.
 * 3. The user clicks the stop button.
 * 4. A non-empty audio Blob is created.
 */
export default function AudioRecorder({
  onRecordingComplete,
  disabled = false,
}) {
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

  // Important guards
  const recordingStartedRef = useRef(false);
  const stoppingRef = useRef(false);

  const cleanupAudioGraph = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    analyserRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore already-stopped tracks
        }
      });

      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      recordingStartedRef.current = false;
      stoppingRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      cleanupAudioGraph();
      stopStream();

      mediaRecorderRef.current = null;
      chunksRef.current = [];
    };
  }, [cleanupAudioGraph, stopStream]);

  const visualize = useCallback(() => {
    const analyser = analyserRef.current;

    if (!analyser) {
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!analyserRef.current || !recordingStartedRef.current) {
        return;
      }

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
    if (disabled || recording || recordingStartedRef.current) {
      return;
    }

    setError("");
    stoppingRef.current = false;
    recordingStartedRef.current = false;
    chunksRef.current = [];

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Microphone recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // The component could have become disabled while permission was being requested.
      if (disabled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (AudioContext) {
        const ctx = new AudioContext();

        audioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();

        analyser.fftSize = 256;

        source.connect(analyser);

        analyserRef.current = analyser;

        visualize();
      }

      const mimeCandidates = [
        "audio/webm",
        "audio/ogg",
        "audio/mp4",
      ];

      const mimeType =
        mimeCandidates.find((mime) =>
          MediaRecorder.isTypeSupported?.(mime)
        ) || "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        /*
         * Safety check:
         * Do not send anything to the prediction API unless
         * an actual recording was started.
         */
        if (!recordingStartedRef.current) {
          return;
        }

        if (stoppingRef.current === false) {
          return;
        }

        const finalMimeType =
          recorder.mimeType || "audio/webm";

        const blob = new Blob(chunksRef.current, {
          type: finalMimeType,
        });

        console.log("Recorded MIME:", finalMimeType);
        console.log("Recorded Blob type:", blob.type);
        console.log("Recorded Blob size:", blob.size);

        recordingStartedRef.current = false;
        stoppingRef.current = false;

        cleanupAudioGraph();
        stopStream();

        mediaRecorderRef.current = null;
        chunksRef.current = [];

        if (!blob || blob.size === 0) {
          setError(
            "No audio was recorded. Please try recording again."
          );
          return;
        }

        // Prediction starts HERE — after a real recording.
        onRecordingComplete(blob, finalMimeType);
      };

      recorder.onerror = () => {
        recordingStartedRef.current = false;
        stoppingRef.current = false;

        setRecording(false);
        setError(
          "Recording failed. Please check your microphone and try again."
        );

        cleanupAudioGraph();
        stopStream();

        mediaRecorderRef.current = null;
        chunksRef.current = [];
      };

      recorder.start();

      // Mark recording as started ONLY after recorder.start()
      // succeeds.
      recordingStartedRef.current = true;
      stoppingRef.current = false;

      setRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((current) => current + 1);
      }, 1000);
    } catch (err) {
      recordingStartedRef.current = false;
      stoppingRef.current = false;

      cleanupAudioGraph();
      stopStream();

      setRecording(false);

      setError(
        "Microphone access was denied or is unavailable. Please allow microphone permissions and try again."
      );
    }
  };

  const stopRecording = () => {
    if (
      !recordingStartedRef.current ||
      stoppingRef.current
    ) {
      return;
    }

    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

    stoppingRef.current = true;

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    setRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setLevels(Array(24).fill(4));
  };

  const format = (value) => {
    return `${String(Math.floor(value / 60)).padStart(
      2,
      "0"
    )}:${String(value % 60).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Audio waveform */}
      <div className="flex items-end gap-1 h-16">
        {levels.map((height, index) => (
          <div
            key={index}
            className="w-1.5 rounded-full bg-gradient-to-t from-gold-600 to-gold-300 transition-all duration-75"
            style={{
              height: `${height}px`,
              opacity: recording ? 1 : 0.25,
            }}
          />
        ))}
      </div>

      {/* Microphone / Stop button */}
      <button
        type="button"
        onClick={
          recording ? stopRecording : startRecording
        }
        disabled={disabled}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
          recording
            ? "bg-maroon-600 pulse-ring"
            : "bg-gradient-to-br from-gold-400 to-gold-600 hover:scale-105"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {disabled ? (
          <Loader2
            className="animate-spin text-maroon-950"
            size={28}
          />
        ) : recording ? (
          <Square
            className="text-white"
            size={28}
            fill="white"
          />
        ) : (
          <Mic
            className="text-maroon-950"
            size={30}
          />
        )}
      </button>

      {/* Recording status */}
      <div className="text-center">
        <p className="text-sm font-medium text-white/80">
          {recording
            ? `Listening… ${format(seconds)}`
            : disabled
            ? "Analyzing audio…"
            : "Tap to sing or play a phrase"}
        </p>

        <p className="text-xs text-white/40 mt-1">
          {recording
            ? "Sing for 5–15 seconds with steady Sa"
            : "Sing a few phrases (5–15s) with steady Sa for best results"}
        </p>
      </div>

      {error && (
        <p className="text-sm text-maroon-500 text-center max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}