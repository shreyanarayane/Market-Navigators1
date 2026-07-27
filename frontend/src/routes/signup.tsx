import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Radar, CheckCircle, Mail, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser, resendVerificationEmail } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — Compete IQ" },
      {
        name: "description",
        content: "Start a 14-day free trial of Compete IQ.",
      },
      { property: "og:title", content: "Create your account — Compete IQ" },
      {
        property: "og:description",
        content: "Start a 14-day free trial of Compete IQ.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const initialEmail = searchParams.get("email") || "";

  // Loading state
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Success state
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [devVerifyLink, setDevVerifyLink] = useState<string | undefined>(undefined);

  // ---------------------------------------------------------------------------
  // Handle Registration
  // ---------------------------------------------------------------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (password.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser(email.trim(), password, name.trim());

      setRegisteredEmail(result.email);
      if (result.verificationLink) {
        setDevVerifyLink(result.verificationLink);
      }
      setRegistered(true);
      toast.success("Account created! Check your email to verify.");
    } catch (err: any) {
      const msg: string = err?.message || "Registration failed. Please try again.";
      if (msg.toLowerCase().includes("already exists")) {
        toast.error("An account with this email already exists.", {
          action: { label: "Sign in", onClick: () => navigate({ to: "/login" }) },
          duration: 6000,
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Email Sent View (Legacy link flow)
  // ---------------------------------------------------------------------------
  if (registered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
            <Mail className="h-10 w-10 text-primary animate-pulse" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            We've sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{registeredEmail}</span>.
            Click the link in the email to activate your account.
          </p>

          <div className="mt-8 rounded-xl border border-border bg-muted/40 p-4 text-left space-y-3">
            {[
              "Check your inbox (and spam folder)",
              "Click the verification link in the email",
              "You'll be redirected to your dashboard",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>

          {devVerifyLink && (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left">
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">
                🛠 Dev Mode — No SMTP Configured
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                SMTP is not set up. Use this link to verify directly:
              </p>
              <a
                href={devVerifyLink}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
              >
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                {devVerifyLink}
              </a>
            </div>
          )}

          <div className="mt-8 space-y-3">
            <Button className="w-full" onClick={() => navigate({ to: "/login" })}>
              Go to Sign In
            </Button>
            <Button
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
              onClick={async () => {
                try {
                  const result = await resendVerificationEmail(registeredEmail);
                  toast.success("Verification email resent! Check your inbox.");
                  if (result.verificationLink) {
                    setDevVerifyLink(result.verificationLink);
                  }
                } catch (err: any) {
                  toast.error(err?.message || "Could not resend.");
                }
              }}
            >
              Resend verification email
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main Signup Form View
  // ---------------------------------------------------------------------------
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left branding panel */}
      <div className="relative hidden overflow-hidden bg-gradient-hero lg:block">
        <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-background/20 text-primary-foreground backdrop-blur">
              <Radar className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold">Compete IQ</span>
          </Link>
          <div>
            <div className="text-3xl font-semibold leading-tight">
              Start monitoring market intelligence in real-time.
            </div>
            <ul className="mt-6 space-y-2.5 text-sm opacity-90">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-300" /> Quick account creation with email verification
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-300" /> AI-extracted claims, ingredients & pricing
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-300" /> Instant access to the intelligence dashboard
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero text-primary-foreground shadow-elegant">
              <Radar className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold">Compete IQ</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Get started with email verification.
          </p>

          {/* ------------------------------------------------------------------- */}
          {/* SIMPLE REGISTRATION FORM */}
          {/* ------------------------------------------------------------------- */}
          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 4 characters"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating Account…
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
