// src/components/MealPlanner.tsx
"use client";
import React, { useState, useMemo, useId } from "react";
import { Button } from "@/components/ui/button";
import RecipeOptions from "./RecipeOptions";
import { Recipe as RecipeOptionsRecipe } from "./RecipeOptions";
import { Heart, HeartFilled } from "./icons";

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

export interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
}

export type Recipe = RecipeOptionsRecipe & {
  favorite?: boolean;
};

type MealPlannerProps = {
  profile: ProfileData;
};

export default function MealPlanner({ profile }: MealPlannerProps) {
  const formId = useId();
  const userCuisines = profile.cuisinePreferences || [];
  const isAthlete = profile.persona === "Athlete";

  const options = useMemo(() => {
    let picks = [...userCuisines];
    if (picks.length >= 3) {
      picks = picks.sort(() => 0.5 - Math.random()).slice(0, 3);
    } else {
      const needed = 3 - picks.length;
      const fill = ALL_CUISINES.filter((c) => !picks.includes(c))
        .sort(() => 0.5 - Math.random())
        .slice(0, needed);
      picks = [...picks, ...fill];
    }
    return [...picks, "Custom..."];
  }, [userCuisines]);

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
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // Substitution UI state
  const [editMode, setEditMode] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<number[]>([]);
  const [substitutionNotes, setSubstitutionNotes] = useState<Record<number, string>>({});
  const [substitutionInfo, setSubstitutionInfo] = useState<string | null>(null);
  const [removalInfo, setRemovalInfo] = useState<string | null>(null);

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
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate recipes");
      setRecipeOptions(data.results);
      setStage("options");
    } catch (e: any) {
      console.error("API error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleRecipeSelect(recipe: Recipe) {
    setSelectedRecipe(recipe);
    setIsFavorite(recipe.favorite || false);
    setStage("result");
    setSubstitutionInfo(null);
    setEditMode(false);
    setSelectedIngredients([]);
    setSubstitutionNotes({});
  }

  function handleBackToOptions() {
    setStage("options");
    setSelectedRecipe(null);
  }

  function handleBackToForm() {
    setStage("form");
    setRecipeOptions(null);
  }

  async function handleRemoveIngredient(index: number) {
    if (!selectedRecipe) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          selectedRecipe,
          ingredientToRemove: selectedRecipe.ingredients[index],
          profile,
          plan: payload.plan
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove ingredient");
      setRemovalInfo(data.removalInfo);
      setSelectedRecipe(data.result);
      setEditMode(false);
      setSelectedIngredients([]);
      setSubstitutionNotes({});
    } catch (e: any) {
      console.error("Removal error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitSubstitution() {
    if (!selectedRecipe || !selectedIngredients.length) {
      setError("Please select ingredients to substitute");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const substitutions = selectedIngredients.map(i => {
        const ingredient = selectedRecipe.ingredients[i];
        if (!ingredient) {
          throw new Error(`Invalid ingredient index: ${i}`);
        }
        return {
          ingredientToReplace: ingredient,
          note: substitutionNotes[i] || ""
        };
      });

      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "substitute",
          selectedRecipe,
          substitutions,
          profile,
          plan: payload.plan
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to substitute ingredients");
      setSubstitutionInfo(data.substitutionInfo);
      setSelectedRecipe(data.result);
      setEditMode(false);
      setSelectedIngredients([]);
      setSubstitutionNotes({});
    } catch (e: any) {
      console.error("Substitution error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle toggling the favorite status
  async function handleToggleFavorite() {
    if (!selectedRecipe || !selectedRecipe.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "favorite",
          recipeId: selectedRecipe.id,
          isFavorite: !isFavorite
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update favorite status");
      
      setIsFavorite(!isFavorite);
      setSelectedRecipe({
        ...selectedRecipe,
        favorite: !isFavorite
      });
    } catch (e: any) {
      console.error("API error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Pre-Workout"];
  const MACRO_TYPES = ["Protein-Intensive", "Carb-Intensive"];

  const renderRecipe = () => {
    if (!selectedRecipe) return null;
    const nutrition = selectedRecipe.nutrition
      ? (typeof selectedRecipe.nutrition === "string"
          ? JSON.parse(selectedRecipe.nutrition)
          : selectedRecipe.nutrition)
      : null;

    return (
      <div className="bg-gray-50 p-4 mt-4 rounded">
        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={handleBackToOptions}>
            Back to Options
          </Button>
          <Button variant="default" size="sm" onClick={() => setEditMode(!editMode)}>
            {editMode ? "Cancel Substitution" : "Substitute Ingredients"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleToggleFavorite}
            className={isFavorite ? "text-red-500 hover:text-red-600" : "text-gray-500 hover:text-gray-600"}
            disabled={loading}
          >
            {isFavorite ? <HeartFilled className="h-4 w-4 mr-1" /> : <Heart className="h-4 w-4 mr-1" />}
            {isFavorite ? "Favorited" : "Favorite"}
          </Button>
        </div>

        <h3 className="text-xl font-bold mb-1">{selectedRecipe.title}</h3>
        {substitutionInfo && (
          <p className="text-sm text-green-700 italic mb-3">{substitutionInfo}</p>
        )}
        {removalInfo && (
          <p className="text-sm text-green-700 italic mb-3">{removalInfo}</p>
        )}

        <p className="text-sm text-gray-600 mb-3">Cuisine: {selectedRecipe.cuisine}</p>

        {nutrition && (
          <div className="flex gap-3 text-sm mb-4">
            <span className="bg-blue-100 px-2 py-1 rounded">{nutrition.calories} kcal</span>
            <span className="bg-red-100 px-2 py-1 rounded">{nutrition.protein}g protein</span>
            <span className="bg-yellow-100 px-2 py-1 rounded">{nutrition.carbs}g carbs</span>
            <span className="bg-green-100 px-2 py-1 rounded">{nutrition.fat}g fat</span>
          </div>
        )}

        <div className="mb-4">
          <h4 className="font-semibold mb-1">Ingredients</h4>
          <ul className="list-disc pl-5">
            {selectedRecipe.ingredients.map((ing, i) => (
              <li key={i} className="text-sm flex items-center">
                {editMode && (
                  <div className="flex gap-2 mr-2">
                    <input
                      type="checkbox"
                      checked={selectedIngredients.includes(i)}
                      onChange={() =>
                        selectedIngredients.includes(i)
                          ? setSelectedIngredients(selectedIngredients.filter(idx => idx !== i))
                          : setSelectedIngredients([...selectedIngredients, i])
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleRemoveIngredient(i)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                {ing.quantity && ing.unit ? (
                  <>
                    <span className="font-medium">{ing.quantity} {ing.unit}</span>
                    <span className="ml-2">{ing.name}</span>
                  </>
                ) : (
                  <span>{ing.name}</span>
                )}
                {editMode && selectedIngredients.includes(i) && (
                  <input
                    type="text"
                    placeholder="Optional note for substitution"
                    value={substitutionNotes[i] || ""}
                    onChange={e =>
                      setSubstitutionNotes({ ...substitutionNotes, [i]: e.target.value })
                    }
                    className="ml-2 border rounded px-2 py-1 text-xs"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>

        {editMode && (
          <Button
            onClick={handleSubmitSubstitution}
            disabled={loading || selectedIngredients.length === 0}
            className="w-full"
          >
            {loading ? "Submitting..." : "Submit Substitution"}
          </Button>
        )}

        <div className="mt-4">
          <h4 className="font-semibold mb-1">Instructions</h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            {selectedRecipe.instructions.split("\n").map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 space-y-4">
      <h2 className="text-xl font-semibold">Plan a meal</h2>
  
      {stage === "form" && (
        <>
          {/* Cuisine Section */}
          <h3 className="text-md font-semibold text-[#496028] mb-1">Cuisine</h3>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {options.map(c => (
              <button
                key={`${formId}-cuisine-${c}`}
                type="button"
                className={`
                  px-3 py-1.5 text-sm rounded-md font-medium transition-all
                  ${selectedCuisine === c
                    ? "bg-[#496028] text-white"
                    : "bg-gray-100 text-black hover:bg-[#496028]/90 hover:text-white"}
                `}
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
              onChange={e => setCustomCuisine(e.target.value)}
              className="w-full mt-3 rounded-lg p-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#496028]"
              id={`${formId}-custom-cuisine`}
            />
          )}
  
          {/* Meal of the Day Section */}
          <h3 className="text-md font-semibold text-[#496028] mt-4 mb-1">Meal of the Day</h3>
          <div className="grid grid-cols-2 gap-3">
            {["Breakfast", "Lunch", "Dinner", "Pre-Workout"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMealType(type as any)}
                className={`
                  px-3 py-1.5 text-sm rounded-md font-medium transition-all
                  ${mealType === type 
                    ? "bg-[#496028] text-white" 
                    : "bg-gray-100 text-black hover:bg-[#496028]/90 hover:text-white"}
                `}
              >
                {type}
              </button>
            ))}
          </div>
  
          {/* Athlete only: Workout intensity */}
          {isAthlete && (
            <div className="mt-4">
              <label htmlFor={`${formId}-workout`} className="block text-sm mb-1">
                Today's workout intensity (1–10)
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={todayWorkout}
                onChange={e => setTodayWorkout(Number(e.target.value))}
                className="w-full"
                id={`${formId}-workout`}
              />
              <div className="text-xs text-center">{todayWorkout}</div>
            </div>
          )}
  
          {/* Desired Calories Section */}
          <h3 className="text-md font-semibold text-[#496028] mt-4 mb-1">Desired Calories</h3>
          <input
            type="range"
            min={100}
            max={1500}
            step={100}
            value={calories}
            onChange={e => setCalories(Number(e.target.value))}
            className="w-full"
            id={`${formId}-calories`}
          />
          <div className="text-xs text-center mt-1">
            <span className="font-medium">{calories} kcal</span>{" "}
            <span className="text-muted-foreground">
              {(() => {
                if (calories <= 400) return "- Light meal (100–300 kcal)";
                if (calories <= 600) return "- Balanced meal (300–500 kcal)";
                if (calories <= 900) return "- High-fuel meal (600–800 kcal)";
                if (calories <= 1200) return "- Super Heavy meal (900–1200 kcal)";

                return "- High Intensity Athlete Meal (1200+ kcal)";
              })()}
            </span>
          </div>
  
          {/* Meal Type (Macro) Section */}
          <h3 className="text-md font-semibold text-[#496028] mt-4 mb-1">Meal Type</h3>
          <div className="grid grid-cols-2 gap-3">
            {["Protein-Intensive", "Carb-Intensive", "Balanced", "Random"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMacroType(m as any)}
                className={`
                  px-3 py-1.5 text-sm rounded-md font-medium transition-all
                  ${macroType === m 
                    ? "bg-[#496028] text-white" 
                    : "bg-gray-100 text-black hover:bg-[#496028]/90 hover:text-white"}
                `}
              >
                {m}
              </button>
            ))}
          </div>
  
          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={loading || (selectedCuisine === "Custom..." && !customCuisine)}
            className="w-full mt-6 border-2 bg-[#496028] text-white font-bold hover:bg-[#3b4f21] hover:text-white transition-colors duration-200"
          >
            {loading ? "Generating recipes..." : "Generate Recipe Options"}
          </Button>
        </>
      )}

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

      {stage === "result" && renderRecipe()}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}