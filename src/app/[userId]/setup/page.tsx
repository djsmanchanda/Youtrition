// src/app/[userId]/setup/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react"; // Back icon

// Questions list
const questions = [
  "What's your name?",
  "Choose your persona",
  "Any dietary restrictions? (comma separated)",
  "Any allergies? (comma separated)",
  "Cuisine preferences? (comma separated)",
  "Workout frequency (1-10)",
  "Workout intensity (1-10)",
];

export default function SetupPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);

  // Form states
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [customPersona, setCustomPersona] = useState(""); // For "Something else"
  const [dietaryStr, setDietaryStr] = useState("");
  const [allergiesStr, setAllergiesStr] = useState("");
  const [cuisinesStr, setCuisinesStr] = useState("");
  const [frequency, setFrequency] = useState(5);
  const [intensity, setIntensity] = useState(5);

  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  // Auto-focus when step changes
  useEffect(() => {
    if (!inputRef.current) return;

    const tagName = inputRef.current.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea") {
      inputRef.current.focus();
    }
  }, [currentStep]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName.toLowerCase();

      if (activeTag === "input" || activeTag === "select" || activeTag === "textarea") {
        // If user is typing
        if (e.key === "Enter") {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      if (e.key === "ArrowRight" && e.shiftKey) {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" && e.shiftKey) {
        e.preventDefault();
        handleBack();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep]);

  // Submit final form
  async function handleSubmitFinal() {
    setError(null);

    const dietary = dietaryStr.split(",").map((s) => s.trim()).filter(Boolean);
    const allergies = allergiesStr.split(",").map((s) => s.trim()).filter(Boolean);
    const cuisines = cuisinesStr.split(",").map((s) => s.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(userId),
          name,
          persona: persona === "Default" ? customPersona : persona,
          dietaryRestrictions: dietary,
          allergies,
          cuisinePreferences: cuisines,
          workoutFrequency: frequency,
          workoutIntensity: intensity,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }

      router.push(`/${userId}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  // Go to next step
  function handleNext(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (currentStep === questions.length - 1) {
      handleSubmitFinal();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  // Go to previous step
  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  // Safe input ref setter
  function setInputRef(el: HTMLInputElement | HTMLSelectElement | null) {
    if (el) {
      inputRef.current = el;
    }
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-6">
      {/* Back Button */}
      <div
        className="flex items-center space-x-2 mb-4 cursor-pointer"
        onClick={handleBack}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm text-gray-500">Shift + ← to go back</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-semibold text-center">Create Your Profile</h1>

      {/* Error message */}
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Animated form */}
      <AnimatePresence mode="wait">
        <motion.form
          key={currentStep}
          onSubmit={handleNext}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="space-y-4"
        >
          <div className="border border-gray-300 rounded p-6 space-y-4">
            {/* Current question */}
            <h2 className="text-lg font-medium">{questions[currentStep]}</h2>

            {/* Render fields */}
            {currentStep === 0 && (
              <input
                ref={setInputRef}
                className="input w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            )}

            {currentStep === 1 && (
              <>
                {!persona || persona === "Default" ? (
                  <div className="flex flex-col space-y-4">
                    <Button
                      type="button"
                      className="w-full bg-black text-white"
                      onClick={() => {
                        setPersona("Athlete");
                        handleNext();
                      }}
                    >
                      Athlete
                    </Button>
                    <Button
                      type="button"
                      className="w-full bg-black text-white"
                      onClick={() => {
                        setPersona("Vegetarian");
                        handleNext();
                      }}
                    >
                      Vegetarian
                    </Button>
                    <Button
                      type="button"
                      className="w-full bg-black text-white"
                      onClick={() => {
                        setPersona("Default");
                        setCustomPersona("");
                      }}
                    >
                      Something else
                    </Button>
                  </div>
                ) : (
                  <input
                    ref={setInputRef}
                    className="input w-full mt-4"
                    value={customPersona}
                    onChange={(e) => setCustomPersona(e.target.value)}
                    placeholder="Type your persona"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customPersona.trim()) {
                        e.preventDefault();
                        handleNext();
                      }
                    }}
                    required
                  />
                )}
              </>
            )}

            {currentStep === 2 && (
              <input
                ref={setInputRef}
                className="input w-full"
                value={dietaryStr}
                onChange={(e) => setDietaryStr(e.target.value)}
                placeholder="E.g., Gluten-free, Vegan"
              />
            )}

            {currentStep === 3 && (
              <input
                ref={setInputRef}
                className="input w-full"
                value={allergiesStr}
                onChange={(e) => setAllergiesStr(e.target.value)}
                placeholder="E.g., Nuts, Dairy"
              />
            )}

            {currentStep === 4 && (
              <input
                ref={setInputRef}
                className="input w-full"
                value={cuisinesStr}
                onChange={(e) => setCuisinesStr(e.target.value)}
                placeholder="E.g., Italian, Indian"
              />
            )}

            {currentStep === 5 && (
              <>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm">{frequency}</div>
              </>
            )}

            {currentStep === 6 && (
              <>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm">{intensity}</div>
              </>
            )}

            {/* Submit/Next Button */}
            <Button
              type="submit"
              className="w-full bg-black text-white"
            >
              {currentStep === questions.length - 1 ? "Submit" : "Next"}
            </Button>
          </div>
        </motion.form>
      </AnimatePresence>
    </main>
  );
}
