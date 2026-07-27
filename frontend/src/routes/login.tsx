import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Radar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithCredentials, resendVerificationEmail } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Compete IQ" },
      { name: "description", content: "Sign in to your Compete IQ workspace." },
      { property: "og:title", content: "Sign in — Compete IQ" },
      { property: "og:description", content: "Sign in to your Compete IQ workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [userNotFound, setUserNotFound] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUserNotFound(false);

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both your email and password.");
      return;
    }

    setLoading(true);

    try {
      await loginWithCredentials(email.trim(), password);
      toast.success("Signed in successfully!");
      navigate({ to: "/app" });
    } catch (err: any) {
      const msg: string = err?.message || "Sign in failed. Please check your credentials.";
      const isUnverified = msg.toLowerCase().includes("verify your email");
      const isNotFound = msg.toLowerCase().includes("no account found") || msg.toLowerCase().includes("not found");

      if (isNotFound) {
        setUserNotFound(true);
        toast.error(`No account found for ${email.trim()}. Please create an account.`, {
          action: {
            label: "Create account",
            onClick: () => navigate({ to: `/signup?email=${encodeURIComponent(email.trim())}&mode=otp` as any }),
          },
          duration: 8000,
        });
      } else if (isUnverified) {
        const currentEmail = email.trim();
        toast.error("Please verify your email before signing in.", {
          description: "Check your inbox for the verification link.",
          action: {
            label: "Resend email",
            onClick: async () => {
              try {
                await resendVerificationEmail(currentEmail);
                toast.success("Verification email sent! Check your inbox.");
              } catch {
                toast.error("Could not resend. Please try again.");
              }
            },
          },
          duration: 10000,
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero text-primary-foreground shadow-elegant">
              <Radar className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold">Compete IQ</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to your intelligence workspace.
          </p>

          {userNotFound && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-left">
              <p className="text-sm font-medium text-destructive">
                No account found for <span className="underline">{email}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Would you like to create a new account?
              </p>
              <Button
                type="button"
                className="mt-3 w-full text-xs"
                onClick={() => navigate({ to: `/signup?email=${encodeURIComponent(email)}` as any })}
              >
                Create Account
              </Button>
            </div>
          )}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-hero lg:block">
        <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div className="text-sm font-medium opacity-80">Market Intelligence</div>
          <div>
            <div className="text-3xl font-semibold leading-tight">
              "We caught three category shifts before they hit the top-10
              retailers — Compete IQ paid for itself in one quarter."
            </div>
            <div className="mt-6 text-sm opacity-80">
              Priya S. — VP Brand Strategy, NutraCraft
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
