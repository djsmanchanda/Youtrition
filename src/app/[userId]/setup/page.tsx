// src/app/[userId]/setup/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import NavButtons from "@/components/NavButtons";
import { motion, AnimatePresence } from "framer-motion";

import { ArrowLeft, ArrowRight, Plus, Slash } from "lucide-react";

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
  const [setupComplete, setSetupComplete] = useState(false);
  const [startFadeToWhite, setStartFadeToWhite] = useState(false);

  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  // Auto-focus input on step change
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName.toLowerCase();
      if ((tag === "input" || tag === "select" || tag === "textarea") && e.key === "Enter") {
        e.preventDefault();
        return handleNext();
      }
      if (e.shiftKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.shiftKey && e.key === "ArrowLeft") {
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
    const dietary = dietaryStr.split(",").map(s => s.trim()).filter(Boolean);
    const allergies = allergiesStr.split(",").map(s => s.trim()).filter(Boolean);
    const goals = goalsStr.split(",").map(s => s.trim()).filter(Boolean);
    const cuisines = cuisinesStr.split(",").map(s => s.trim()).filter(Boolean);

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
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      setSetupComplete(true);
      setTimeout(() => setStartFadeToWhite(true), 2000);
      setTimeout(() => router.push(`/${userId}`), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function handleNext(e?: React.FormEvent) {
    e?.preventDefault();
    if (currentStep === questions.length - 1) return handleSubmitFinal();
    setCurrentStep(s => s + 1);
  }

  function handleBack() {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }

  function setInputRef(el: HTMLInputElement | HTMLSelectElement | null) {
    inputRef.current = el;
  }

  // Final “black to white” screen
  if (setupComplete) {
    return (
      <motion.div
        initial={{ backgroundColor: "#000" }}
        animate={{ backgroundColor: startFadeToWhite ? "#fff" : "#000" }}
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
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-baseline space-x-4 mb-4">
        <NavButtons />
        <span className="text-sm text-gray-500 flex items-end space-x-1">
          Shift <Plus className="w-4 h-4 mx-1" /> <ArrowLeft className="w-4 h-4 mx-1" /> <Slash className="w-4 h-4 mx-1" /> <ArrowRight className="w-4 h-4 mx-1" />  to go back and forward
        </span>
      </div>

      <h1 className="text-3xl font-semibold text-center">Create Your Profile</h1>
      {error && <p className="text-red-500 text-center">{error}</p>}

      <AnimatePresence mode="wait">
        <motion.form
          key={currentStep}
          onSubmit={handleNext}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-white rounded-3xl shadow-md border border-gray-200 p-6 space-y-6">
            {/* Question */}
            <h2 className="text-lg font-medium">{questions[currentStep]}</h2>

            {/* Input fields per step */}
            {currentStep === 0 && (
              <input
                ref={setInputRef}
                className="input w-full"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            )}

            {currentStep === 1 && !showCustomPersonaInput ? (
              <div className="flex flex-col space-y-4">
                {["Athlete", "Vegetarian", "Default"].map(option => (
                  <Button
                    key={option}
                    type="button"
                    className="w-full bg-gray-200 text-black"
                    onClick={() => {
                      if (option === "Default") {
                        setPersona("Default");
                        setShowCustomPersonaInput(true);
                      } else {
                        setPersona(option);
                        handleNext();
                      }
                    }}
                  >
                    {option === "Default" ? "Something else" : option}
                  </Button>
                ))}
              </div>
            ) : currentStep === 1 ? (
              <input
                ref={setInputRef}
                className="input w-full"
                value={customPersona}
                onChange={e => setCustomPersona(e.target.value)}
                placeholder="Type your persona"
                required
              />
            ) : null}

            {currentStep === 2 && (
              <input
                ref={setInputRef}
                className="input w-full"
                value={dietaryStr}
                onChange={e => setDietaryStr(e.target.value)}
                placeholder="E.g., Gluten-free, Vegan"
              />
            )}

            {currentStep === 3 && (
              <input
                ref={setInputRef}
                className="input w-full"
                value={allergiesStr}
                onChange={e => setAllergiesStr(e.target.value)}
                placeholder="E.g., Nuts, Dairy"
              />
            )}

            {currentStep === 4 && (
              <input
                ref={setInputRef}
                className="input w-full"
                value={goalsStr}
                onChange={e => setGoalsStr(e.target.value)}
                placeholder="E.g., Lose weight, Gain muscle"
              />
            )}

            {currentStep === 5 && (
              <input
                ref={setInputRef}
                className="input w-full"
                value={cuisinesStr}
                onChange={e => setCuisinesStr(e.target.value)}
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
                  onChange={e => setFrequency(+e.target.value)}
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
                  onChange={e => setIntensity(+e.target.value)}
                  className="w-full"
                />
                <div className="text-center text-sm">{intensity}</div>
              </>
            )}

            <Button type="submit" className="w-full bg-black text-white">
              {currentStep === questions.length - 1 ? "Submit" : "Next"}
            </Button>
          </div>
        </motion.form>
      </AnimatePresence>
    </main>
  );
}
