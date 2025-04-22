// src/app/[userId]/(dashboard)/page.tsx
import { recommendRecipes, Filter } from "@/lib/recipes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

type Props = { params: { userId: string } };

const filter: Filter = { diet: ["Vegetarian"], allergies: ["peanut"] };

export default async function Dashboard({ params }: Props) {
  const userId = Number(params.userId);
  const recs = await recommendRecipes(userId, filter);

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">
        Tonight’s best matches
      </h1>

      {/* ⬇️  responsive grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recs.map((recipe) => {
          const missing = recipe.ingredients
            .filter((ing) => ing.profileId !== userId) // not in pantry
            .map((ing) => ing.name);

          return (
            <Card key={recipe.id} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>{recipe.title}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {recipe.cuisine ?? "Any cuisine"} · {recipe.cookTime ?? "?"} min
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Match progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Match</span>
                    <span>{recipe.match.toFixed(0)}%</span>
                  </div>
                  <Progress value={recipe.match} />
                </div>

                {/* Missing ingredients */}
                {missing.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs">You still need:</div>
                    <div className="flex flex-wrap gap-1">
                      {missing.slice(0, 4).map((m) => (
                        <Badge key={m} variant="secondary" className="text-xs">
                          {m}
                        </Badge>
                      ))}
                      {missing.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{missing.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
