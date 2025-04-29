// src/app/[userId]/setup/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const questions = [
  "What's your name?",
  "Choose your persona",
  "Any dietary restrictions? (comma separated)",
  "Any allergies? (comma separated)",
  "What are your goals? (comma separated, e.g. Lose weight, Gain muscle)",
  "Cuisine preferences? (comma separated)",
  "Workout frequency (1-10)",
  "Workout intensity (1-10)",
];

export default function SetupPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);

  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [customPersona, setCustomPersona] = useState("");
  const [showCustomPersonaInput, setShowCustomPersonaInput] = useState(false);
  const [dietaryStr, setDietaryStr] = useState("");
  const [allergiesStr, setAllergiesStr] = useState("");
  const [cuisinesStr, setCuisinesStr] = useState("");
  const [frequency, setFrequency] = useState(5);
  const [intensity, setIntensity] = useState(5);
  const [goalsStr, setGoalsStr] = useState("");

  const [error, setError] = useState<string | null>(null);

  const [setupComplete, setSetupComplete] = useState(false); // Black screen
  const [startFadeToWhite, setStartFadeToWhite] = useState(false); // Fade to white

  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  // Auto-focus input
  useEffect(() => {
    if (!inputRef.current) return;
    const tagName = inputRef.current.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea") {
      inputRef.current.focus();
    }
  }, [currentStep]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName.toLowerCase();

      if (activeTag === "input" || activeTag === "select" || activeTag === "textarea") {
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

  async function handleSubmitFinal() {
    setError(null);

    const dietary = dietaryStr.split(",").map((s) => s.trim()).filter(Boolean);
    const allergies = allergiesStr.split(",").map((s) => s.trim()).filter(Boolean);
    const goals = goalsStr.split(",").map((s) => s.trim()).filter(Boolean);
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
          goals,
          cuisinePreferences: cuisines,
          workoutFrequency: frequency,
          workoutIntensity: intensity,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }

      setSetupComplete(true); // Show black screen first

      // After 2 seconds, start fade to white
      setTimeout(() => {
        setStartFadeToWhite(true);
      }, 2000);

      // After 3 seconds, navigate
      setTimeout(() => {
        router.push(`/${userId}`);
      }, 3000);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function handleNext(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (currentStep === questions.length - 1) {
      handleSubmitFinal();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  function setInputRef(el: HTMLInputElement | HTMLSelectElement | null) {
    if (el) {
      inputRef.current = el;
    }
  }

  // Setup complete screen
  if (setupComplete) {
    return (
      <motion.div
        initial={{ backgroundColor: "#000000" }}
        animate={{ backgroundColor: startFadeToWhite ? "#ffffff" : "#000000" }}
        transition={{ duration: 1 }}
        className="fixed inset-0 flex items-center justify-center"
      >
        {!startFadeToWhite && (
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: [20, 0, 20], opacity: 1 }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-4xl font-bold text-white"
          >
            Setup Complete
          </motion.h1>
        )}
      </motion.div>
    );
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

      {/* Error */}
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Form */}
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

            {/* Step fields */}
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
                {!showCustomPersonaInput ? (
                  <div className="flex flex-col space-y-4">
                    <Button
                      type="button"
                      className="w-full bg-gray-200 text-black"
                      onClick={() => {
                        setPersona("Athlete");
                        handleNext();
                      }}
                    >
                      Athlete
                    </Button>
                    <Button
                      type="button"
                      className="w-full bg-gray-200 text-black"
                      onClick={() => {
                        setPersona("Vegetarian");
                        handleNext();
                      }}
                    >
                      Vegetarian
                    </Button>
                    <Button
                      type="button"
                      className="w-full bg-gray-200 text-black"
                      onClick={() => {
                        setPersona("Default");
                        setShowCustomPersonaInput(true);
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
                value={goalsStr}
                onChange={(e) => setGoalsStr(e.target.value)}
                placeholder="E.g., Lose weight, Gain muscle"
              />
            )}

            {currentStep === 5 && (
              <input
                ref={setInputRef}
                className="input w-full"
                value={cuisinesStr}
                onChange={(e) => setCuisinesStr(e.target.value)}
                placeholder="E.g., Italian, Indian"
              />
            )}

            {currentStep === 6 && (
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

            {currentStep === 7 && (
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

            {/* Submit / Next Button */}
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
