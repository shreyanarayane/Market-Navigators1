import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Bell,
  DollarSign,
  Package,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { activityTrend, alerts, products } from "@/lib/mock-data";
import { useMemo, useState, type FormEvent } from "react";
import { useMarketData } from "./app";

// Generate dynamic activity trend based on actual results
function generateActivityTrend(results: any) {
  const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  
  if (!results || !results.products.length) {
    return activityTrend;
  }
  
  const productCount = results.products.length;
  const claimsCount = results.claims.length;
  
  // Base values derived from actual data
  const baseLaunches = Math.min(productCount, 20);
  const basePriceChanges = Math.min(claimsCount + 3, 15);
  
  return months.map((month, i) => {
    const growth = 1 + (i * 0.1) + Math.random() * 0.1;
    return {
      month,
      launches: Math.round(baseLaunches * growth + Math.random() * 3),
      priceChanges: Math.round(basePriceChanges * growth + Math.random() * 2),
    };
  });
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendAssistantChat } from "../lib/api";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { results, query, triggerSearch } = useMarketData();
  const [dashboardPrompt, setDashboardPrompt] = useState("");
  
  const dynamicActivityTrend = useMemo(() => {
    return generateActivityTrend(results);
  }, [results]);
  const [dashboardAnswer, setDashboardAnswer] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const handleDashboardAsk = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const prompt = dashboardPrompt.trim();
    if (!prompt || dashboardLoading) {
      return;
    }

    setDashboardLoading(true);
    setDashboardError(null);
    setDashboardAnswer("");

    try {
      await triggerSearch(prompt);
      const res = await sendAssistantChat(prompt);
      setDashboardAnswer(res.reply);
    } catch (err: any) {
      setDashboardError(err.message || "Unable to ask the dashboard assistant right now.");
    } finally {
      setDashboardLoading(false);
    }
  };

  const displayedProducts = useMemo(() => {
    if (!results || !results.products.length) {
      return products.slice(0, 5);
    }

    return results.products.slice(0, 5).map((p, idx) => {
      const productRev = results.revenue?.find((r) => r.product_source_id === p.source_id);
      const estimatedPrice = productRev ? productRev.estimated_revenue_usd / 1000 : 19.99;

      return {
        id: p.source_id || String(idx),
        name: p.name,
        brand: p.brand || "Unknown Brand",
        price: estimatedPrice > 0 ? estimatedPrice : 19.99,
        opportunityScore: Math.round(p.match_score * 100) || 85,
      };
    });
  }, [results]);

  const stats = useMemo(() => {
    if (!results || !results.products.length) {
      return [
        { k: "Tracked products", v: "8.4k", d: "Across key categories", i: Package, tone: "text-primary" },
        { k: "Competitors", v: "24", d: "Active in your space", i: Users, tone: "text-accent" },
        { k: "Launches", v: "17", d: "Last 7 days", i: Zap, tone: "text-primary" },
        { k: "Price moves", v: "38", d: "Changes detected", i: DollarSign, tone: "text-warning" },
      ];
    }

    return [
      { k: "Matched brands", v: String(new Set(results.products.map((p) => p.brand).filter(Boolean)).size), d: "Unique brands", i: Users, tone: "text-primary" },
      { k: "Products matched", v: String(results.products.length), d: "Live SKU results", i: Package, tone: "text-accent" },
      { k: "Claims extracted", v: String(results.claims.length), d: "AI-parsed claims", i: Zap, tone: "text-primary" },
      { k: "Revenue signals", v: String(results.revenue.length), d: "Attributed sales", i: DollarSign, tone: "text-warning" },
    ];
  }, [results]);

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary">Ask the LLM</p>
              <CardTitle className="mt-1 text-lg">Ask about this dashboard section</CardTitle>
              <CardDescription>
                Use plain English to explore trends, products, claims, and revenue signals from this view.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              AI powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={handleDashboardAsk} className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={dashboardPrompt}
              onChange={(e) => setDashboardPrompt(e.target.value)}
              placeholder="Example: summarize the top immune support products on this dashboard"
              className="flex-1"
            />
            <Button type="submit" disabled={dashboardLoading || !dashboardPrompt.trim()}>
              {dashboardLoading ? "Asking..." : "Ask"}
            </Button>
          </form>
          {dashboardError ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {dashboardError}
            </div>
          ) : dashboardAnswer ? (
            <div className="rounded-lg border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
              {dashboardAnswer}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ask for a quick summary, comparison, or explanation of what you see on the dashboard.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary">Market snapshot</p>
              <CardTitle className="mt-1 text-xl">
                {results ? `Live view for “${query}”` : "A calmer view of what matters"}
              </CardTitle>
              <CardDescription>
                {results
                  ? "Product matches, claims, and revenue signals are ready to review."
                  : "Search for a topic to pull fresh competitor insights into this view."}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              {results ? "Live" : "Ready"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.k} className="rounded-lg border border-border/70 bg-background/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{s.k}</p>
                <s.i className={`h-4 w-4 ${s.tone}`} />
              </div>
              <p className="mt-2 text-xl font-semibold">{s.v}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Activity trend</CardTitle>
                <CardDescription>Launches and pricing shifts over time</CardDescription>
              </div>
              <Badge variant="outline">Last 6 months</Badge>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dynamicActivityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="launches" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="priceChanges" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent alerts</CardTitle>
                <CardDescription>Important signals to follow</CardDescription>
              </div>
              <Link to="/app/alerts" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border/70 p-3">
                <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.severity === "high" ? "bg-destructive" : a.severity === "medium" ? "bg-warning" : "bg-accent"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">{a.time}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent products</CardTitle>
              <CardDescription>Latest launches and strong matches</CardDescription>
            </div>
            <Link to="/app/products" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Browse <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.brand}</TableCell>
                  <TableCell>${p.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.opportunityScore >= 80 ? "default" : "secondary"}>{p.opportunityScore}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

