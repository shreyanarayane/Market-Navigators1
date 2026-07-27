import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Radar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithCredentials, loginWithGoogle, resendVerificationEmail } from "@/lib/auth";

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
  const [oauthLoading, setOauthLoading] = useState(false);
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [userNotFound, setUserNotFound] = useState(false);

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    try {
      await loginWithGoogle();
      // Redirect happens automatically
    } catch (err: any) {
      toast.error(err?.message || "Google sign in failed. Please try again.");
      setOauthLoading(false);
    }
  };

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

          {/* OAuth Buttons */}
          <div className="mt-8 space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={oauthLoading}
              onClick={handleGoogleLogin}
            >
              {oauthLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Redirecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </span>
              )}
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 border-t" />
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
