/**
 * auth.ts
 * Handles authentication - supports both:
 * 1. Supabase Auth (OAuth: Google, GitHub) - Primary
 * 2. Railway Backend Auth (email/password) - Fallback
 */

// Supabase config
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000"

const AUTH_STORAGE_KEY = "competeiq-auth";

// Dynamically import supabase (only if configured)
let supabase: any = null
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  import('./supabase').then(m => {
    supabase = m.supabase
  })
}

export interface AuthSession {
  email: string;
  name: string;
  role: string;
  token: string;
  expiresAt: number;
  emailVerified: boolean;
  provider?: 'google' | 'github' | 'email'
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

// ---------------------------------------------------------------------------
// OAuth Login (Google/GitHub) via Supabase
// ---------------------------------------------------------------------------
export async function loginWithGoogle(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not configured. Use email/password login instead.')
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  
  if (error) throw error
  // Redirect happens automatically
}

export async function loginWithGitHub(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase not configured. Use email/password login instead.')
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  
  if (error) throw error
  // Redirect happens automatically
}

// Handle OAuth callback
export async function handleOAuthCallback(): Promise<AuthSession | null> {
  if (!supabase) return null
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) return null
  
  const user = session.user
  const userMetadata = user.user_metadata || {}
  
  const authSession: AuthSession = {
    email: user.email,
    name: userMetadata.full_name || userMetadata.name || user.email?.split('@')[0] || 'User',
    role: userMetadata.role || 'user',
    token: session.access_token,
    expiresAt: new Date(session.expires_at * 1000).getTime(),
    emailVerified: user.email_confirmed_at !== null,
    provider: user.app_metadata?.provider as 'google' | 'github' | 'email'
  }
  
  const storage = getStorage()
  if (storage) {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authSession))
  }
  
  return authSession
}

// ---------------------------------------------------------------------------
// Login with Credentials (Railway Backend fallback)
// ---------------------------------------------------------------------------
export async function loginWithCredentials(
  email: string,
  password: string
): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || "Invalid email or password.");
  }

  const data = await res.json();

  const session: AuthSession = {
    email: data.email,
    name: data.name,
    role: data.role,
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    emailVerified: data.email_verified ?? true,
    provider: 'email'
  };

  const storage = getStorage();
  if (storage) {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  return session;
}

// ---------------------------------------------------------------------------
// Register — creates an unverified account and triggers a verification email.
// Does NOT log the user in or store a session.
// Returns { email, verificationLink? } — verificationLink is only set in dev
// mode (when SMTP is not configured) so the frontend can offer a dev shortcut.
// ---------------------------------------------------------------------------
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ email: string; verificationLink?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || "Registration failed. Please try again.");
  }

  const data = await res.json();
  return {
    email: data.email,
    verificationLink: data.verification_link ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// OTP Authentication Helpers
// ---------------------------------------------------------------------------

export async function sendOtpEmail(email: string): Promise<{ email: string; devOtpCode?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || "Failed to send verification code. Please try again.");
  }

  const data = await res.json();
  return {
    email: data.email,
    devOtpCode: data.otp_code ?? undefined,
  };
}

export async function verifyOtpCode(email: string, otp: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || "Invalid verification code.");
  }
}

export async function completeOtpSignup(
  email: string,
  otp: string,
  name: string,
  password: string
): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/api/auth/complete-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      name: name.trim(),
      password,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || "Account creation failed. Please try again.");
  }

  const data = await res.json();

  const session: AuthSession = {
    email: data.email,
    name: data.name,
    role: data.role,
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    emailVerified: true,
  };

  const storage = getStorage();
  if (storage) {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  return session;
}


// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------
export function getAuthSession(): AuthSession | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.email || !parsed.token || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      storage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function getAuthToken(): string | null {
  return getAuthSession()?.token ?? null;
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthSession());
}

export function clearAuthSession(): void {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(AUTH_STORAGE_KEY);
  }
}

// ---------------------------------------------------------------------------
// Resend verification email
// ---------------------------------------------------------------------------
export async function resendVerificationEmail(email: string): Promise<{ verificationLink?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password: "" }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || "Failed to resend verification email.");
  }

  const data = await res.json();
  return { verificationLink: data.verification_link ?? undefined };
}

export async function verifyEmailToken(token: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || "Email verification failed or token expired.");
  }

  const data = await res.json();

  const session: AuthSession = {
    email: data.email,
    name: data.name,
    role: data.role,
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    emailVerified: true,
  };

  const storage = getStorage();
  if (storage) {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  return session;
}

// ---------------------------------------------------------------------------
// Legacy helper kept for backward-compat (no longer bypasses validation)
// ---------------------------------------------------------------------------
export function saveAuthSession(_email: string): void {
  // This is intentionally a no-op now.
  // Use loginWithCredentials() for proper authenticated login.
  console.warn(
    "saveAuthSession() is deprecated. Use loginWithCredentials() instead."
  );
}
