// src/components/MealPlanner.tsx
"use client";
import React, { useState, useMemo, useId } from "react";
import { Button } from "@/components/ui/button";

const ALL_CUISINES = [
  "Italian",
  "Chinese",
  "Indian",
  "French",
  "Mexican",
  "Thai",
  "Japanese",
  "Mediterranean",
  "American",
];

export type ProfileData = {
  id: number;
  name: string;
  persona: string;
  dietaryRestrictions?: string[];
  allergies?: string[];
  cuisinePreferences?: string[];
  workoutFrequency?: number;
  workoutIntensity?: number;
};

type MealPlannerProps = {
  profile: ProfileData;
};

export default function MealPlanner({ profile }: MealPlannerProps) {
  // Generate stable IDs for form elements
  const formId = useId();
  
  // Initialize state from props in a stable way
  const userCuisines = profile.cuisinePreferences || [];
  const isAthlete = profile.persona === "Athlete";

  // Generate cuisine options with randomization that remains stable during component lifecycle
  // This will randomize only on initial render or page refresh
  const options = useMemo(() => {
    let picks = [...userCuisines];
    if (picks.length >= 3) {
      // Keep the random sorting for cuisine selections
      picks = picks.sort(() => 0.5 - Math.random()).slice(0, 3);
    } else {
      const needed = 3 - picks.length;
      const fill = ALL_CUISINES.filter((c) => !picks.includes(c))
        .sort(() => 0.5 - Math.random())
        .slice(0, needed);
      picks = [...picks, ...fill];
    }
    return [...picks, "Custom..."];
  }, []); // Empty dependency array ensures this only runs once during component mount

  // Initialize state with lazy initialization to prevent unnecessary rerenders
  const [selectedCuisine, setSelectedCuisine] = useState<string>(() => options[0]);
  const [customCuisine, setCustomCuisine] = useState<string>("");
  const [mealType, setMealType] = useState<"Breakfast" | "Lunch" | "Dinner" | "Pre-Workout">("Breakfast");
  const [todayWorkout, setTodayWorkout] = useState<number>(() => profile.workoutIntensity ?? 5);
  const [calories, setCalories] = useState<number>(500);
  const [macroType, setMacroType] = useState<"Protein-Intensive" | "Carb-Intensive">("Protein-Intensive");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Memoize the payload to prevent unnecessary recalculations
  const payload = useMemo(() => {
    const cuisine = selectedCuisine === "Custom..." ? customCuisine : selectedCuisine;
    return {
      profile,
      plan: { cuisine, mealType, todayWorkout, calories, macroType },
    };
  }, [profile, selectedCuisine, customCuisine, mealType, todayWorkout, calories, macroType]);


  async function handleSubmit() {
    setLoading(true);
    setError(null);
    
    try {
      // Make sure the URL matches exactly what Next.js expects for API routes
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate meal plan");
      }
      
      setResult(data.result);
    } catch (e: any) {
      console.error("API error:", e);
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  // Define meal types as a constant to prevent recreating the array on each render
  const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Pre-Workout'];
  const MACRO_TYPES = ['Protein-Intensive', 'Carb-Intensive'];

  // Format the recipe result for better display
  const renderRecipe = () => {
    if (!result) return null;
    
    // Parse nutrition data if it exists
    const nutrition = result.nutrition ? 
      (typeof result.nutrition === 'string' ? 
        JSON.parse(result.nutrition) : 
        result.nutrition) : 
      null;
    
    return (
      <div className="bg-gray-50 p-4 mt-4 rounded">
        <h3 className="text-xl font-bold mb-2">{result.title}</h3>
        <div className="text-sm text-gray-600 mb-3">Cuisine: {result.cuisine}</div>
        
        {nutrition && (
          <div className="mb-4">
            <h4 className="font-semibold mb-1">Nutrition</h4>
            <div className="flex gap-3 text-sm">
              <div className="bg-blue-100 px-2 py-1 rounded">{nutrition.calories} kcal</div>
              <div className="bg-red-100 px-2 py-1 rounded">{nutrition.protein}g protein</div>
              <div className="bg-yellow-100 px-2 py-1 rounded">{nutrition.carbs}g carbs</div>
              <div className="bg-green-100 px-2 py-1 rounded">{nutrition.fat}g fat</div>
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <h4 className="font-semibold mb-1">Ingredients</h4>
          <ul className="list-disc pl-5">
            {result.ingredients.map((ing, i) => (
              <li key={i} className="text-sm">
                {ing.quantity && ing.unit ? 
                  <span className="font-medium">{ing.quantity} {ing.unit}</span> : 
                  ''} {ing.name}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mb-4">
          <h4 className="font-semibold mb-1">Instructions</h4>
          <ol className="list-decimal pl-5">
            {result.instructions.split("\n").map((step, i) => (
              <li key={i} className="text-sm mb-1">{step}</li>
            ))}
          </ol>
        </div>
        
        <div className="flex text-sm text-gray-600">
          <div>Cook time: {result.cookTime} min</div>
        </div>
        
        {result.dietaryInfo && (
          <div className="mt-3 bg-yellow-50 p-2 rounded">
            <h4 className="font-semibold text-sm">Dietary Information</h4>
            <p className="text-xs">{result.dietaryInfo}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded p-6 space-y-4">
      <h2 className="text-xl font-semibold">Plan a meal</h2>
      <div className="flex flex-wrap gap-2">
        {options.map((c) => (
          <button
            key={`${formId}-cuisine-${c}`}
            type="button"
            className={`px-3 py-1 rounded ${c === selectedCuisine ? "bg-blue-500 text-white" : "border"}`}
            onClick={() => setSelectedCuisine(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {selectedCuisine === "Custom..." && (
        <input
          type="text"
          placeholder="Enter a cuisine"
          value={customCuisine}
          onChange={(e) => setCustomCuisine(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          id={`${formId}-custom-cuisine`}
        />
      )}
      <div className="flex space-x-4">
        {MEAL_TYPES.map((type) => (
          <label key={`${formId}-meal-${type}`} className="flex items-center space-x-2">
            <input
              type="radio"
              name={`${formId}-mealType`}
              value={type}
              checked={mealType === type}
              onChange={() => setMealType(type as any)}
              id={`${formId}-meal-${type}`}
            />
            <span>{type}</span>
          </label>
        ))}
      </div>
      {isAthlete && (
        <div>
          <label htmlFor={`${formId}-workout`} className="block text-sm mb-1">Today's workout intensity (1–10)</label>
          <input
            type="range" 
            min={1} 
            max={10} 
            value={todayWorkout}
            onChange={(e) => setTodayWorkout(Number(e.target.value))}
            className="w-full"
            id={`${formId}-workout`}
          />
          <div className="text-xs text-center">{todayWorkout}</div>
        </div>
      )}
      <div>
        <label htmlFor={`${formId}-calories`} className="block text-sm mb-1">Desired calories</label>
        <input
          type="range" 
          min={200} 
          max={2000} 
          step={50}
          value={calories}
          onChange={(e) => setCalories(Number(e.target.value))}
          className="w-full"
          id={`${formId}-calories`}
        />
        <div className="text-xs text-center">{calories} kcal</div>
      </div>
      <div className="flex space-x-4">
        {MACRO_TYPES.map((m) => (
          <label key={`${formId}-macro-${m}`} className="flex items-center space-x-2">
            <input
              type="radio" 
              name={`${formId}-macroType`} 
              value={m}
              checked={macroType === m}
              onChange={() => setMacroType(m as any)}
              id={`${formId}-macro-${m}`}
            />
            <span>{m}</span>
          </label>
        ))}
      </div>
      <Button 
        onClick={handleSubmit} 
        disabled={loading || (selectedCuisine === "Custom..." && !customCuisine)} 
        className="w-full mt-4"
      >
        {loading ? "Generating meal plan..." : "Submit Plan"}
      </Button>
      
      {/* Show error message if any */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded">
          {error}
        </div>
      )}
      
      {/* Display the recipe result */}
      {result && renderRecipe()}
    </div>
  );
}