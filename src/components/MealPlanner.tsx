// src/components/MealPlanner.tsx
"use client";
import React, { useState, useMemo, useId } from "react";
import { Button } from "@/components/ui/button";
import RecipeOptions from "./RecipeOptions";

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

// Define ingredient type for proper typing
interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
}

// Define recipe type for proper typing
interface Recipe {
  id: string;
  title: string;
  cuisine: string;
  instructions: string;
  cookTime: number;
  dietaryInfo?: string;
  ingredients: Ingredient[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | string;
}

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
  const [recipeOptions, setRecipeOptions] = useState<Recipe[] | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"form" | "options" | "result">("form");

  // Memoize the payload to prevent unnecessary recalculations
  const payload = useMemo(() => {
    const cuisine = selectedCuisine === "Custom..." ? customCuisine : selectedCuisine;
    return {
      profile,
      plan: { cuisine, mealType, todayWorkout, calories, macroType },
    };
  }, [profile, selectedCuisine, customCuisine, mealType, todayWorkout, calories, macroType]);

  // Generate multiple recipe options
  async function handleSubmit() {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate recipes");
      }
      
      // Set the recipe options and change to options view
      setRecipeOptions(data.results);
      setStage("options");
    } catch (e: any) {
      console.error("API error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle recipe selection
  async function handleRecipeSelect(recipe: Recipe) {
    setSelectedRecipe(recipe);
    setStage("result");
    
    // Optionally, you could make an API call to mark this recipe as selected
    // or perform any other actions needed when a recipe is selected
    try {
      await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          recipeId: recipe.id
        }),
      });
    } catch (e) {
      // This is optional, so we don't need to show an error if it fails
      console.warn("Failed to record recipe selection:", e);
    }
  }

  // Go back to options from results
  function handleBackToOptions() {
    setStage("options");
    setSelectedRecipe(null);
  }

  // Go back to form from options
  function handleBackToForm() {
    setStage("form");
    setRecipeOptions(null);
  }

  // Define meal types as a constant to prevent recreating the array on each render
  const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Pre-Workout'];
  const MACRO_TYPES = ['Protein-Intensive', 'Carb-Intensive'];

  // Format the recipe result for better display
  const renderRecipe = () => {
    if (!selectedRecipe) return null;
    
    // Parse nutrition data if it exists
    const nutrition = selectedRecipe.nutrition ? 
      (typeof selectedRecipe.nutrition === 'string' ? 
        JSON.parse(selectedRecipe.nutrition) : 
        selectedRecipe.nutrition) : 
      null;
    
    return (
      <div className="bg-gray-50 p-4 mt-4 rounded">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold">{selectedRecipe.title}</h3>
          <Button variant="outline" size="sm" onClick={handleBackToOptions}>
            Back to Options
          </Button>
        </div>
        <div className="text-sm text-gray-600 mb-3">Cuisine: {selectedRecipe.cuisine}</div>
        
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
            {selectedRecipe.ingredients.map((ing: Ingredient, i: number) => (
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
            {selectedRecipe.instructions.split("\n").map((step: string, i: number) => (
              <li key={i} className="text-sm mb-1">{step}</li>
            ))}
          </ol>
        </div>
        
        <div className="flex text-sm text-gray-600">
          <div>Cook time: {selectedRecipe.cookTime} min</div>
        </div>
        
        {selectedRecipe.dietaryInfo && (
          <div className="mt-3 bg-yellow-50 p-2 rounded">
            <h4 className="font-semibold text-sm">Dietary Information</h4>
            <p className="text-xs">{selectedRecipe.dietaryInfo}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded p-6 space-y-4">
      <h2 className="text-xl font-semibold">Plan a meal</h2>
      
      {/* Recipe form - shown in the initial stage */}
      {stage === "form" && (
        <>
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
            {loading ? "Generating recipes..." : "Generate Recipe Options"}
          </Button>
        </>
      )}
      
      {/* Recipe options - shown after form submission */}
      {stage === "options" && (
        <>
          <div className="mb-4">
            <Button variant="outline" size="sm" onClick={handleBackToForm}>
              Back to Recipe Form
            </Button>
          </div>
          
          <RecipeOptions 
            recipes={recipeOptions || []} 
            onSelectRecipe={handleRecipeSelect}
            isLoading={loading}
          />
        </>
      )}
      
      {/* Selected recipe details - shown after recipe selection */}
      {stage === "result" && renderRecipe()}
      
      {/* Show error message if any */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}