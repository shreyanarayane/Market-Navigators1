import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ingredientTrend } from "@/lib/mock-data";

import { useMarketData } from "./app";
import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/ingredients")({
  component: IngredientsPage,
});

const topMock = [
  { name: "Ashwagandha KSM-66", score: 92 },
  { name: "Marine Collagen", score: 84 },
  { name: "Lion's Mane", score: 71 },
  { name: "Black Elderberry", score: 63 },
  { name: "Magnesium Glycinate", score: 58 },
  { name: "Spirulina", score: 42 },
];

// Generate mock trend data for actual ingredients found
function generateIngredientTrends(topIngredients: { name: string; score: number }[]) {
  const weeks = ["W1", "W2", "W3", "W4", "W5"];
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  
  if (!topIngredients.length) {
    return { data: ingredientTrend, ingredients: [] };
  }
  
  const data = weeks.map((week, i) => {
    const row: Record<string, string | number> = { week };
    topIngredients.slice(0, 4).forEach((ing, j) => {
      // Generate trending data (increasing trend)
      const baseValue = ing.score * (0.3 + Math.random() * 0.2);
      const growthFactor = 1 + (i * 0.15) + Math.random() * 0.1;
      row[ing.name] = Math.round(baseValue * growthFactor);
    });
    return row;
  });
  
  const ingredientLines = topIngredients.slice(0, 4).map((ing, i) => ({
    name: ing.name,
    color: colors[i % colors.length]
  }));
  
  return { data, ingredients: ingredientLines };
}

function IngredientsPage() {
  const { results } = useMarketData();

  const displayedTop = useMemo(() => {
    if (!results || !results.ingredients.length) {
      return topMock;
    }
    const counts: Record<string, number> = {};
    results.ingredients.forEach(i => {
      counts[i.ingredient_name] = (counts[i.ingredient_name] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxFreq = sorted[0]?.[1] || 1;
    return sorted.slice(0, 8).map(([name, freq]) => ({
      name,
      score: Math.round((freq / maxFreq) * 100)
    }));
  }, [results]);

  const trendData = useMemo(() => {
    return generateIngredientTrends(displayedTop);
  }, [displayedTop]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ingredients</h1>
        <p className="text-sm text-muted-foreground">
          Hero ingredient adoption across the tracked catalog.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Adoption over time</CardTitle>
            <CardDescription>Weekly mentions in new launches</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {trendData.ingredients.map((ing, i) => (
                  <Line
                    key={ing.name}
                    type="monotone"
                    dataKey={ing.name}
                    stroke={ing.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Trending ingredients</CardTitle>
            <CardDescription>{results ? "Frequencies in query results" : "Growth score, last 30 days"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayedTop.map((t) => (
              <div key={t.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-muted-foreground">{t.score}</span>
                </div>
                <Progress value={t.score} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {results && results.ingredients.length > 0 && (
        <Card className="shadow-soft animate-fade-in">
          <CardHeader>
            <CardTitle className="text-base">Active Ingredients & Formulations</CardTitle>
            <CardDescription>Flagged ingredients extracted from matched SKUs</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient Name</TableHead>
                    <TableHead>Active Component?</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount per Serving</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.ingredients.map((ing, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium capitalize">{ing.ingredient_name}</TableCell>
                      <TableCell>
                        <Badge variant={ing.is_active_ingredient ? "default" : "secondary"}>
                          {ing.is_active_ingredient ? "Active" : "Standard"}
                        </Badge>
                      </TableCell>
                      <TableCell>{ing.category || "General formulation"}</TableCell>
                      <TableCell>{ing.amount_per_serving || "Not specified"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
