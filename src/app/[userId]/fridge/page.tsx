"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type FridgeItem = {
  name: string;
  quantity?: string;
  condition?: string;
};

export default function FridgePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<"start" | "capture" | "processing" | "results">("start");
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [results, setResults] = useState<FridgeItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }, // rear camera
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStep("capture");
    } catch (err) {
      console.error(err);
      setError("Unable to access camera.");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        setPhotos((prev) => [...prev, blob].slice(0, 10));
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
    setPhotos([]);
    setResults([]);
    setStep("start");
    setError(null);
  };

  return (
    <main className="max-w-3xl mx-auto pt-20 px-6 space-y-6"> {/* pt-20 adds spacing below logo */}
      {step === "start" && (
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">What’s in My Fridge?</h1>
          <Button onClick={startCamera}>Start Scanning</Button>
          {error && <p className="text-red-500">{error}</p>}
        </div>
      )}

      {step === "capture" && (
        <div className="space-y-4">
          {/* Cream colored camera box */}
          <div className="rounded-2xl bg-[#fef9f3] border border-gray-200 p-4 shadow-md">
            <video ref={videoRef} autoPlay playsInline className="rounded w-full" />
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />

          <div className="flex justify-between items-center mt-4">
            <Button
              onClick={capturePhoto}
              disabled={photos.length >= 10}
              className="bg-black text-white"
            >
              {photos.length >= 10 ? "Limit Reached (10)" : "Capture Photo"}
            </Button>
            <Button
              onClick={finishScan}
              className="bg-green-600 text-white"
              disabled={photos.length === 0}
            >
              Finish Scan
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {photos.map((blob, idx) => (
              <img
                key={idx}
                src={URL.createObjectURL(blob)}
                alt={`Fridge photo ${idx + 1}`}
                className="rounded border object-cover"
              />
            ))}
          </div>
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
