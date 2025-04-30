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
  "Any dietary restrictions?",
  "Any allergies?",
  "What are your goals?",
  "Cuisine preferences?",
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
    <main className="max-w-4xl mx-auto p-6 space-y-6" style={{ backgroundColor: "#eaf1e4", minHeight: "100vh" }}>
      <div className="flex items-baseline space-x-4 mb-4">
        <NavButtons />

      </div>

      <h1 className="text-3xl font-semibold text-center text-[#496028]">Create Your Profile</h1>
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
          <div className="bg-white/100 backdrop-blur-md rounded-3xl shadow-md border border-gray-200 p-6 space-y-6">
            {/* Question */}
            <h2 className="text-lg font-medium">{questions[currentStep]}</h2>

            {/* Input fields per step */}
            {currentStep === 0 && (
              <input
              ref={setInputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full rounded-lg p-3 text-black border border-gray-300 focus:border-[#496028] focus:ring-1 focus:ring-[#496028] focus:outline-none transition-all duration-200"
              />
            )}

            {currentStep === 1 && !showCustomPersonaInput ? (
              <div className="flex flex-col space-y-4">
                {["Athlete", "Vegetarian", "Default"].map(option => (
                  <Button
                  key={option}
                  type="button"
                  className={`w-full font-medium transition-colors duration-200 ${
                    persona === option
                      ? "bg-[#496028] text-white"
                      : "bg-gray-100 text-black hover:bg-[#496028] hover:text-white"
                  }`}
                  onClick={() => {
                    if (option === "Default") {
                      setPersona("Default");
                      setShowCustomPersonaInput(true);
                    } else {
                      setPersona(option);
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
              <>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {["Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free", "Eggitarian","Halal", "Kosher","Keto"].map(option => (
                    <button
                      type="button"
                      key={option}
                      className={`
                        border rounded-lg px-3 py-2 text-sm font-medium
                        ${dietaryStr.toLowerCase().includes(option.toLowerCase())
                          ? "bg-[#496028] text-white"
                          : "bg-gray-100 text-black hover:bg-[#496028]/90 hover:text-white"
                        }
                      `}
                      onClick={() => {
                        const selected = dietaryStr.split(",").map(s => s.trim()).filter(Boolean);
                        const alreadySelected = selected.map(s => s.toLowerCase()).includes(option.toLowerCase());
                        const updated = alreadySelected
                          ? selected.filter(s => s.toLowerCase() !== option.toLowerCase())
                          : [...selected, option];
                        setDietaryStr(updated.join(", "));
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <input
                  ref={setInputRef}
                  type="text"
                  value={dietaryStr}
                  onChange={e => setDietaryStr(e.target.value)}
                  placeholder="Add custom (comma separated)"
                  className="w-full rounded-lg p-3 text-black border border-gray-300 focus:border-[#496028] focus:ring-1 focus:ring-[#496028] focus:outline-none transition-all duration-200"
                />
              </>
            )}

            {currentStep === 3 && (
              <>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    "Nuts", "Dairy", "Eggs", "Soy", "Gluten",
                    "Shellfish", "Wheat", "Sesame"
                  ].map(option => (
                    <button
                      type="button"
                      key={option}
                      className={`
                        border rounded-lg px-3 py-2 text-sm font-medium
                        ${allergiesStr.toLowerCase().includes(option.toLowerCase())
                          ? "bg-[#496028] text-white"
                          : "bg-gray-100 text-black hover:bg-[#496028]/90 hover:text-white"
                        }
                      `}
                      onClick={() => {
                        const selected = allergiesStr.split(",").map(s => s.trim()).filter(Boolean);
                        const alreadySelected = selected.map(s => s.toLowerCase()).includes(option.toLowerCase());
                        const updated = alreadySelected
                          ? selected.filter(s => s.toLowerCase() !== option.toLowerCase())
                          : [...selected, option];
                        setAllergiesStr(updated.join(", "));
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <input
                  ref={setInputRef}
                  type="text"
                  value={allergiesStr}
                  onChange={e => setAllergiesStr(e.target.value)}
                  placeholder="Add custom allergies (comma separated)"
                  className="w-full rounded-lg p-3 text-black border border-gray-300 focus:border-[#496028] focus:ring-1 focus:ring-[#496028] focus:outline-none transition-all duration-200"
                />
              </>
            )}

            {currentStep === 4 && (
              <>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    "Lose weight",
                    "Gain muscle",
                    "Maintain weight",
                    "Eat healthier",
                    "Improve energy",
                    "Manage blood sugar",
                    "Meal recommendations",
                    "Just trying things out"
                  ].map(option => (
                    <button
                      type="button"
                      key={option}
                      className={`
                        border rounded-lg px-3 py-2 text-sm font-medium
                        ${goalsStr.toLowerCase().includes(option.toLowerCase())
                          ? "bg-[#496028] text-white"
                          : "bg-gray-100 text-black hover:bg-[#496028]/90 hover:text-white"
                        }
                      `}
                      onClick={() => {
                        const selected = goalsStr.split(",").map(s => s.trim()).filter(Boolean);
                        const alreadySelected = selected.map(s => s.toLowerCase()).includes(option.toLowerCase());
                        const updated = alreadySelected
                          ? selected.filter(s => s.toLowerCase() !== option.toLowerCase())
                          : [...selected, option];
                        setGoalsStr(updated.join(", "));
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <input
                  ref={setInputRef}
                  type="text"
                  value={goalsStr}
                  onChange={e => setGoalsStr(e.target.value)}
                  placeholder="Add custom goals (comma separated)"
                  className="w-full rounded-lg p-3 text-black border border-gray-300 focus:border-[#496028] focus:ring-1 focus:ring-[#496028] focus:outline-none transition-all duration-200"
                />
              </>
            )}

            {currentStep === 5 && (
              <>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    "Italian",
                    "Indian",
                    "Chinese",
                    "Mexican",
                    "Japanese",
                    "Jain",
                    "Thai",
                    "American",
                    "French",
                    "Middle Eastern"
                  ].map(option => (
                    <button
                      type="button"
                      key={option}
                      className={`
                        border rounded-lg px-3 py-2 text-sm font-medium
                        ${cuisinesStr.toLowerCase().includes(option.toLowerCase())
                          ? "bg-[#496028] text-white"
                          : "bg-gray-100 text-black hover:bg-[#496028]/90 hover:text-white"
                        }
                      `}
                      onClick={() => {
                        const selected = cuisinesStr.split(",").map(s => s.trim()).filter(Boolean);
                        const alreadySelected = selected.map(s => s.toLowerCase()).includes(option.toLowerCase());
                        const updated = alreadySelected
                          ? selected.filter(s => s.toLowerCase() !== option.toLowerCase())
                          : [...selected, option];
                        setCuisinesStr(updated.join(", "));
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <input
                  ref={setInputRef}
                  type="text"
                  value={cuisinesStr}
                  onChange={e => setCuisinesStr(e.target.value)}
                  placeholder="Add custom cuisines (comma separated)"
                  className="w-full rounded-lg p-3 text-black border border-gray-300 focus:border-[#496028] focus:ring-1 focus:ring-[#496028] focus:outline-none transition-all duration-200"
                />
              </>
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
                <div className="text-center text-sm mt-2">
                  <span className="font-medium text-lg">{frequency}</span>{" "}
                  <span className="font-medium text-lg">
                    {(() => {
                      if (frequency <= 1) return "- Never";
                      if (frequency === 2) return "- Almost never";
                      if (frequency <= 4) return "- A few times a week";
                      if (frequency === 5) return "- Most days";
                      if (frequency === 6) return "- Almost every day";
                      if (frequency === 7) return "- Every day";
                      if (frequency === 8) return "- At least once a day";
                      if (frequency === 9) return "- More than once a day";
                      return "- Multiple times a day";
                    })()}
                  </span>
                </div>
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
                <div className="text-center text-sm mt-2">
                  <span className="font-medium text-lg">{intensity}</span>{" "}
                  <span className="font-medium text-lg">
                    {(() => {
                      if (intensity === 1) return "- I warm up by sitting.";
                      if (intensity === 2) return "- Light walks, remote in hand.";
                      if (intensity === 3) return "- Took the stairs... once.";
                      if (intensity === 4) return "- Cycled a bit, broke a light sweat.";
                      if (intensity === 5) return "- Weekend jogger, occasional gym bro.";
                      if (intensity === 6) return "- Played a sport, maybe scored too.";
                      if (intensity === 7) return "- Consistent workouts, feeling strong.";
                      if (intensity === 8) return "- Gym is my second home.";
                      if (intensity === 9) return "- Intensity? Call me beast mode.";
                      return "- Olympic-level grind. I eat burpees for breakfast.";
                    })()}
                  </span>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full border-2 border-[#496028] text-[#496028] font-bold bg-transparent hover:bg-[#496028] hover:text-white transition-colors duration-200"
            >
              {currentStep === questions.length - 1 ? "Submit" : "Next"}
            </Button>
          </div>
        </motion.form>
      </AnimatePresence>
    </main>
  );
}
