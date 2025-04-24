// src/components/RecipeOptions.tsx
import React from 'react';
import { Button } from "@/components/ui/button";

// Define the Ingredient interface
export interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
}

// Export the Recipe interface for use in other components
export interface Recipe {
  id: string;  // This should match what your API returns
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

export interface RecipeOptionsProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  isLoading: boolean;
}

export default function RecipeOptions({ recipes, onSelectRecipe, isLoading }: RecipeOptionsProps) {
  if (isLoading) {
    return <div className="text-center p-4">Loading recipe options...</div>;
  }

  if (!recipes || recipes.length === 0) {
    return <div className="text-center p-4">No recipes found</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {recipes.map((recipe) => (
        <div key={recipe.id} className="border rounded p-3 hover:shadow-md">
          <h3 className="font-bold text-lg">{recipe.title}</h3>
          <p className="text-sm text-gray-600 mb-2">{recipe.cuisine}</p>
          <p className="text-sm text-gray-700 mb-2">Cook time: {recipe.cookTime} min</p>
          <Button onClick={() => onSelectRecipe(recipe)} size="sm" className="w-full">
            Select Recipe
          </Button>
        </div>
      ))}
    </div>
  );
}