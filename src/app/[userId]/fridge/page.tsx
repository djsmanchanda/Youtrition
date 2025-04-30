// src/app/[userId]/fridge/page.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";

export default function FridgePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  const [capturing, setCapturing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [scanningIntervalId, setScanningIntervalId] = useState<NodeJS.Timeout | null>(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCapturing(true);
      setSessionFinished(false);
      setDetectedItems([]);
      startAutoScan();
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCapturing(false);
    stopAutoScan();
  }

  async function captureAndSend() {
    if (!videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (canvas && ctx) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/jpeg")
      );

      const formData = new FormData();
      formData.append("image", blob);

      try {
        await fetch("http://localhost:5000/detect", {
          method: "POST",
          body: formData,
        });
        triggerFlash();
      } catch (err) {
        console.error("Error sending frame:", err);
      }
    }
  }

  function triggerFlash() {
    if (flashRef.current) {
      flashRef.current.style.opacity = "1";
      setTimeout(() => {
        if (flashRef.current) flashRef.current.style.opacity = "0";
      }, 150);
    }
  }

  function startAutoScan() {
    const id = setInterval(() => {
      captureAndSend();
    }, 2000); // scan every 2 seconds
    setScanningIntervalId(id);
  }

  function stopAutoScan() {
    if (scanningIntervalId) {
      clearInterval(scanningIntervalId);
      setScanningIntervalId(null);
    }
  }

  async function finishDetection() {
    try {
      stopAutoScan();
      const res = await fetch("http://localhost:5000/finish", {
        method: "POST",
      });
      const data = await res.json();
      if (data.detected_items) {
        setDetectedItems(data.detected_items);
        setSessionFinished(true);
      }
      stopCamera();
    } catch (err) {
      console.error("Error finishing detection:", err);
    }
  }

  useEffect(() => {
    return () => {
      stopAutoScan();
      stopCamera();
    };
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6 relative">
      <h1 className="text-2xl font-bold">What's in My Fridge?</h1>

      {/* Flash animation */}
      <div
        ref={flashRef}
        className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-150"
      />

      {!capturing && !sessionFinished && (
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Start Scanning
        </button>
      )}

      {capturing && (
        <div className="space-y-4">
          <video ref={videoRef} className="w-full rounded" autoPlay muted playsInline />

          <canvas ref={canvasRef} style={{ display: "none" }} />

          <div className="flex gap-4">
            <button
              onClick={finishDetection}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Finish Detection
            </button>
          </div>
        </div>
      )}

      {sessionFinished && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Detected Items:</h2>
          {detectedItems.length === 0 ? (
            <p>No items detected.</p>
          ) : (
            <ul className="list-disc list-inside">
              {detectedItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}

          <button
            onClick={startCamera}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Start New Scan
          </button>
        </div>
      )}
    </main>
  );
}
