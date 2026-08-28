import React, { useEffect, useRef, useState } from "react";
import { UploadCloud, Mic2, FileAudio, AlertCircle } from "lucide-react";
import AudioRecorder from "../components/AudioRecorder";
import ResultPanel from "../components/ResultPanel";
import { usePrediction } from "../context/PredictionContext";

export default function Identify() {
 const [mode, setMode] = useState("live"); // "live" | "upload"
const [file, setFile] = useState(null);
const [previewUrl, setPreviewUrl] = useState(null);
const [predictionStarted, setPredictionStarted] = useState(false);
useEffect(() => {
  setPredictionStarted(false);
}, []);
  const fileInputRef = useRef(null);

  const {
    loading,
    result,
    error,
    runPrediction,
    resetPrediction,
  } = usePrediction();

  const resetOutput = () => {
    resetPrediction();
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];

    if (!f) return;

    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    resetPrediction();
  };

const handleUploadSubmit = () => {
  if (!file || loading) return;

  setPredictionStarted(true);
  runPrediction(file, file.name, "upload");
};  
const handleRecordingComplete = (blob) => {
  if (loading) return;

  const ext = blob.type.includes("ogg")
    ? "ogg"
    : blob.type.includes("mp4")
    ? "m4a"
    : "webm";

  setPredictionStarted(true);
  runPrediction(blob, `live_recording.${ext}`, "live");
};
  return (
    <div className="bg-radial-glow min-h-[calc(100vh-64px)] py-10 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="text-center mb-8 fade-in">
          <h1 className="font-display text-3xl font-bold gold-text mb-2">
            Identify a Raga
          </h1>

          <p className="text-white/50 text-sm">
            Sing live into your microphone, or upload an existing recording
            of a Carnatic phrase.
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="inline-flex glass-panel rounded-xl p-1">

            <button
              onClick={() => {
                setMode("live");
                resetOutput();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "live"
                  ? "bg-gold-500/20 text-gold-300"
                  : "text-white/60"
              }`}
            >
              <Mic2 size={16} />
              Live Recording
            </button>

            <button
              onClick={() => {
                setMode("upload");
                resetOutput();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "upload"
                  ? "bg-gold-500/20 text-gold-300"
                  : "text-white/60"
              }`}
            >
              <UploadCloud size={16} />
              Upload File
            </button>

          </div>
        </div>

        <div className="glass-panel rounded-2xl p-8 mb-6">

          {mode === "live" ? (

          <AudioRecorder
  onRecordingStart={() => {
    resetPrediction();
    setPredictionStarted(false);
  }}
  onRecordingComplete={handleRecordingComplete}
  disabled={loading}
/>

          ) : (

            <div className="flex flex-col items-center gap-4">

              <label
                htmlFor="audio-upload"
                className="w-full border-2 border-dashed border-gold-500/30 rounded-xl py-10 flex flex-col items-center gap-3 cursor-pointer hover:border-gold-500/60 transition-colors"
              >

                <FileAudio
                  size={32}
                  className="text-gold-400"
                />

                <span className="text-white/70 text-sm text-center px-4">
                  {file
                    ? file.name
                    : "Click to choose an audio file (wav, mp3, ogg, m4a, flac)"}
                </span>

                <input
                  id="audio-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

              </label>

              <p className="text-center text-xs text-white/50 mt-1">
                Only Carnatic raga songs can be uploaded.
              </p>

              {previewUrl && (
                <audio
                  controls
                  src={previewUrl}
                  className="w-full"
                />
              )}

              <button
                onClick={handleUploadSubmit}
                disabled={!file || loading}
                className="btn-primary px-6 py-2.5 rounded-lg text-sm w-full sm:w-auto"
              >
                {loading ? "Analyzing..." : "Identify Raga"}
              </button>

            </div>
          )}

        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-6">

            <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-400 rounded-full animate-spin" />

            Analyzing audio...

          </div>
        )}

        {error && (
          <div className="glass-panel rounded-xl p-4 mb-6 flex items-start gap-2 text-sm text-maroon-500 border-maroon-500/30">

            <AlertCircle
              size={16}
              className="mt-0.5 shrink-0"
            />

            {error}

          </div>
        )}

        <ResultPanel result={result} />

      </div>
    </div>
  );
}