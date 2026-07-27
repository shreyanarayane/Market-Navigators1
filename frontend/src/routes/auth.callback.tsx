import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { handleOAuthCallback } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing in..." },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const session = await handleOAuthCallback();
        
        if (session) {
          // Successfully authenticated via OAuth
          navigate({ to: "/app" });
        } else {
          // No session found - might be an error or expired
          setError("Authentication failed. Please try again.");
        }
      } catch (err: any) {
        setError(err?.message || "Authentication failed. Please try again.");
      }
    };

    processCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Authentication Error</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <button
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            onClick={() => navigate({ to: "/login" })}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
