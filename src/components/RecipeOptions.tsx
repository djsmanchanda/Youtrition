// src/components/RecipeOptions.tsx
"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";

// Types for the recipe data
type Ingredient = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
};

type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type Recipe = {
  id?: number;
  title: string;
  cuisine: string;
  instructions: string;
  cookTime: number;
  dietaryInfo: string;
  ingredients: Ingredient[];
  nutrition: Nutrition | null;
};

type RecipeOptionsProps = {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  isLoading?: boolean;
};

export default function RecipeOptions({ recipes, onSelectRecipe, isLoading = false }: RecipeOptionsProps) {
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<number | null>(null);

  // Toggle recipe expansion
  const toggleExpand = (index: number) => {
    setExpandedRecipe(expandedRecipe === index ? null : index);
  };

  // Select a recipe
  const handleSelect = (recipe: Recipe, index: number) => {
    setSelectedRecipe(index);
    setExpandedRecipe(index);
  };

  // Submit the selected recipe
  const handleSubmit = () => {
    if (selectedRecipe !== null) {
      onSelectRecipe(recipes[selectedRecipe]);
    }
  };

  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Generating recipe options...</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // If no recipes, show message
  if (!recipes || recipes.length === 0) {
    return <div className="text-center p-4">No recipe options available.</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Choose a recipe</h2>
      
      {recipes.map((recipe, index) => (
        <div 
          key={index} 
          className={`border rounded-lg overflow-hidden transition-all duration-300 ease-in-out ${
            selectedRecipe === index ? 'border-blue-500 border-2' : 'border-gray-200'
          }`}
        >
          {/* Recipe preview (always visible) */}
          <div 
            className={`p-4 cursor-pointer ${expandedRecipe === index ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            onClick={() => toggleExpand(index)}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-lg">{recipe.title}</h3>
                <p className="text-sm text-gray-600">{recipe.cuisine} • {recipe.cookTime} mins</p>
              </div>
              <div className="flex space-x-2 items-center">
                <Button
                  size="sm" 
                  variant={selectedRecipe === index ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(recipe, index);
                  }}
                >
                  {selectedRecipe === index ? 'Selected' : 'Select'}
                </Button>
                <span className="text-blue-500">
                  {expandedRecipe === index ? '▲' : '▼'}
                </span>
              </div>
            </div>
            
            {/* Nutrition preview */}
            {recipe.nutrition && (
              <div className="flex gap-2 mt-2 text-xs">
                <span className="bg-blue-100 px-2 py-1 rounded">{recipe.nutrition.calories} kcal</span>
                <span className="bg-red-100 px-2 py-1 rounded">{recipe.nutrition.protein}g protein</span>
                <span className="bg-yellow-100 px-2 py-1 rounded">{recipe.nutrition.carbs}g carbs</span>
                <span className="bg-green-100 px-2 py-1 rounded">{recipe.nutrition.fat}g fat</span>
              </div>
            )}
          </div>
          
          {/* Expanded details */}
          {expandedRecipe === index && (
            <div className="p-4 border-t border-gray-200 bg-white">
              {/* Dietary info */}
              {recipe.dietaryInfo && (
                <div className="mb-4">
                  <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                    {recipe.dietaryInfo}
                  </span>
                </div>
              )}
              
              {/* Ingredients */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Ingredients</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm">
                      {ing.quantity && ing.unit ? (
                        <span className="font-medium">{ing.quantity} {ing.unit}</span>
                      ) : null} {ing.name}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Instructions */}
              <div>
                <h4 className="font-medium mb-2">Instructions</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  {recipe.instructions.split('\n').map((step, i) => (
                    <li key={i} className="text-sm">{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Submit button */}
      <div className="pt-4">
        <Button 
          className="w-full" 
          disabled={selectedRecipe === null}
          onClick={handleSubmit}
        >
          Use Selected Recipe
        </Button>
      </div>
    </div>
  );
}