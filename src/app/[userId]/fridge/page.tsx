// src/app/[userId]/fridge/page.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type FridgeItem = {
  name: string;
  quantity?: string;
  condition?: string;
};

export default function FridgePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const [step, setStep] = useState<"start" | "capture" | "processing" | "results">("start");
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [results, setResults] = useState<FridgeItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step === "capture" && videoRef.current) {
      setIsVideoReady(true);
    } else {
      setIsVideoReady(false);
    }
  }, [step]);

  const startCamera = async () => {
    setError(null);
    console.log("Starting camera...");

    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("Your browser does not support camera access. Try Chrome or Safari.");
      return;
    }

    try {
      console.log("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
      });

      console.log("Camera access granted, setting up video element...");
      setStep("capture");

      await new Promise(resolve => setTimeout(resolve, 100));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded, playing...");
          videoRef.current?.play().then(() => {
            console.log("Video playing successfully");
          }).catch(err => {
            console.error("Error playing video:", err);
            setError("Failed to start camera preview.");
          });
        };
      } else {
        console.error("Video ref is null");
        setError("Failed to initialize camera preview.");
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setError("Camera access was denied. Please allow camera access and try again.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found. Please check your device's camera.");
      } else {
        setError("Failed to access camera. Please try again or use the upload option.");
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    console.log("Stopping camera...");
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const flash = () => {
    if (flashRef.current) {
      flashRef.current.classList.remove("opacity-0");
      flashRef.current.classList.add("opacity-100");
      setTimeout(() => {
        flashRef.current?.classList.remove("opacity-100");
        flashRef.current?.classList.add("opacity-0");
      }, 200);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    flash();

    canvas.toBlob((blob) => {
      if (blob) {
        setPhotos((prev) => [...prev, blob].slice(0, 10));
      } else {
        console.error("Failed to capture photo.");
      }
    }, "image/jpeg");
  };

  const finishScan = async () => {
    if (photos.length === 0) return;

    stopCamera();
    setStep("processing");
    setError(null);

    const formData = new FormData();
    photos.forEach((photo, idx) => {
      formData.append(`image${idx + 1}`, photo);
    });

    try {
      const res = await fetch("/api/fridge", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze fridge.");
      }

      setResults(data.items);
      setStep("results");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
      setStep("start");
    }
  };

  const reset = () => {
    stopCamera();
    setPhotos([]);
    setResults([]);
    setStep("start");
    setError(null);
  };

  return (
    <main className="max-w-3xl mx-auto pt-20 px-6 space-y-6 relative">
      {/* Flash effect */}
      <div
        ref={flashRef}
        className="absolute inset-0 bg-white transition-opacity duration-150 pointer-events-none opacity-0 z-50"
      />

      {step === "start" && (
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">What's in My Fridge?</h1>
          <Button onClick={startCamera}>Start Scanning</Button>
          {error && (
            <div className="text-red-500 space-y-2">
              <p>{error}</p>
              <Button onClick={startCamera} className="bg-black text-white">
                Try Again
              </Button>
              <div>
                <label
                  htmlFor="fridge-upload"
                  className="cursor-pointer text-blue-600 underline text-sm"
                >
                  Or upload photos instead
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  id="fridge-upload"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      const blobs = Array.from(files).slice(0, 10);
                      setPhotos(blobs);
                      setStep("capture");
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {step === "capture" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#fef9f3] border border-gray-200 p-4 shadow-md relative overflow-hidden">
            {!isVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`rounded w-full h-[60vh] max-h-[600px] object-cover ${!isVideoReady ? 'invisible' : ''}`}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/50 rounded-lg w-[90%] h-[90%]"></div>
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button
                onClick={capturePhoto}
                disabled={photos.length >= 10 || !isVideoReady}
                className="bg-black text-white px-8 py-6 text-lg rounded-full shadow-lg hover:bg-black/90"
              >
                {photos.length >= 10 ? "Limit Reached (10)" : "Take Photo"}
              </Button>
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {photos.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Captured Photos ({photos.length}/10)</h3>
                <Button
                  onClick={finishScan}
                  className="bg-green-600 text-white px-6 py-2 hover:bg-green-700"
                >
                  Submit Photos
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                {photos.map((blob, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={URL.createObjectURL(blob)}
                      alt={`Fridge photo ${idx + 1}`}
                      className="rounded border object-cover aspect-square"
                    />
                    <button
                      onClick={() => {
                        setPhotos(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "processing" && (
        <div className="text-center space-y-4 animate-pulse">
          <h2 className="text-xl font-semibold">Analyzing fridge contents...</h2>
          <p className="text-gray-500">This may take a few seconds.</p>
        </div>
      )}

      {step === "results" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Fridge Contents</h2>

          {results.length === 0 ? (
            <p className="text-gray-500">No items detected.</p>
          ) : (
            <ul className="space-y-2">
              {results.map((item, idx) => (
                <li
                  key={idx}
                  className="border rounded-lg p-3 shadow-sm bg-white space-y-1"
                >
                  <div className="font-medium capitalize">{item.name}</div>
                  {item.quantity && <div>Quantity: {item.quantity}</div>}
                  {item.condition && <div>Condition: {item.condition}</div>}
                </li>
              ))}
            </ul>
          )}

          <div className="text-center">
            <Button onClick={reset} className="bg-black text-white">
              Start New Scan
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
