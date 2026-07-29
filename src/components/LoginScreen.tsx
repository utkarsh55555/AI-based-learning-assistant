import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Sparkles, Loader2, ShieldCheck, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ObsidianCore } from "./ObsidianCore";
import { supabase } from "../utils/supabase";
import { authAPI } from "../utils/api";

interface LoginScreenProps {
  onLogin: (user: {
    id?: string;
    name: string;
    email: string;
    avatar_url?: string;
    isNewUser?: boolean;
    total_xp?: number;
    current_streak?: number;
  }) => void;
}

type AuthTab = "login" | "signup";

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [tab, setTab] = useState<AuthTab>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Google OAuth callback handler ──────────────────────────────────────────
  // Only fires on a fresh redirect from Google (has access_token or code in URL)
  useEffect(() => {
    const hash = window.location.hash;
    const isFreshOAuthCallback =
      hash.includes("access_token") ||
      hash.includes("error_description") ||
      new URLSearchParams(window.location.search).has("code");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session && isFreshOAuthCallback) {
        setIsProcessingCallback(true);
        try {
          localStorage.setItem("access_token", session.access_token);
          if (session.refresh_token) {
            localStorage.setItem("refresh_token", session.refresh_token);
          }

          // Real Google profile data from Supabase metadata
          const meta = session.user?.user_metadata || {};
          const googleName =
            meta.full_name || meta.name || session.user.email?.split("@")[0] || "User";
          const googleEmail = session.user.email || "";
          const googleAvatar = meta.avatar_url || meta.picture || "";

          // Try backend first (creates XP profile etc.), fall back to Supabase data if offline
          try {
            const currentUser = await authAPI.getCurrentUser();
            if (!currentUser?.user) throw new Error("Backend returned no user object");
            const u = currentUser.user;
            const userPayload = {
              id: u.id,
              name: u.name || googleName,
              email: u.email || googleEmail,
              avatar_url: u.avatar_url || googleAvatar,
              isNewUser: u.is_new_user ?? false,
              total_xp: u.total_xp,
              current_streak: u.current_streak,
            };
            localStorage.setItem("user", JSON.stringify(userPayload));
            onLogin(userPayload);
            toast.success(`Welcome, ${userPayload.name}! 🎉`);
          } catch (backendError: any) {
            console.warn("[OAuth] Backend offline or returned no user, using Supabase session:", backendError.message);
            const fallbackUser = {
              id: session.user.id,
              name: googleName,
              email: googleEmail,
              avatar_url: googleAvatar,
              isNewUser: false,
              total_xp: 0,
              current_streak: 0,
            };
            localStorage.setItem("user", JSON.stringify(fallbackUser));
            onLogin(fallbackUser);
            toast.success(`Welcome, ${googleName}! 🎉`, {
              description: "Running in offline mode — some features may be limited.",
            });
          }

          // Clean URL so refresh doesn't re-trigger
          window.history.replaceState(null, "", window.location.pathname);
        } catch (error: any) {
          console.error("OAuth callback error:", error);
          toast.error(error?.message || "Sign-in failed. Please try again.");
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        } finally {
          setIsGoogleLoading(false);
          setIsProcessingCallback(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [onLogin]);

  // ── Email / Password Login ─────────────────────────────────────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await authAPI.login(email.trim(), password);
      if (response?.user) {
        const u = response.user;
        onLogin({
          id: u.id,
          name: u.name || email.split("@")[0],
          email: u.email,
          isNewUser: u.is_new_user ?? false,
          total_xp: (u as any).total_xp,
          current_streak: (u as any).current_streak,
        });
        toast.success(`Welcome back, ${u.name || email.split("@")[0]}! 👋`);
      }
    } catch (error: any) {
      toast.error(error.message || "Login failed. Check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Email / Password Sign Up ───────────────────────────────────────────────
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await authAPI.signup(email.trim(), password, name.trim());
      if (response?.user) {
        const u = response.user;
        onLogin({
          id: u.id,
          name: u.name || name.trim(),
          email: u.email,
          isNewUser: true,
        });
        toast.success(`Account created! Welcome, ${u.name || name.trim()}! 🎉`);
      }
    } catch (error: any) {
      toast.error(error.message || "Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error("Google Login is not configured.", {
        description: "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.",
        duration: 8000,
      });
      return;
    }

    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: "offline",
            prompt: "select_account consent",
          },
        },
      });
      if (error) throw error;
      // Browser redirects to Google — callback handled in useEffect above
    } catch (error: any) {
      console.error("Google login error:", error);
      toast.error(error.message || "Failed to start Google Sign-In.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="size-full flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#0F1419] to-[#0A0A0A]" />

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: `rgba(59, 130, 246, ${0.2 + Math.random() * 0.4})`,
              boxShadow: `0 0 ${4 + Math.random() * 6}px rgba(59, 130, 246, 0.6)`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ y: [0, -30, 0], opacity: [0.3, 0.8, 0.3] }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16">
              <ObsidianCore />
            </div>
          </div>
          <h1 className="text-4xl mb-1 bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">
            Obsidian
          </h1>
          <p className="text-sm text-muted-foreground">Your Personal AI Learning Companion</p>
        </div>

        {/* Card */}
        <div className="glass-card p-7 rounded-2xl">
          {isProcessingCallback ? (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-4" />
              <p className="text-muted-foreground">Verifying your Google account...</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex rounded-xl bg-white/5 p-1 mb-6">
                {(["login", "signup"] as AuthTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      tab === t
                        ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "login" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {tab === "login" ? (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleEmailLogin}
                    className="space-y-4"
                  >
                    {/* Email */}
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="login-email"
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all"
                      />
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <Button
                      id="email-login-btn"
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleEmailSignup}
                    className="space-y-4"
                  >
                    {/* Name */}
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="signup-name"
                        type="text"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all"
                      />
                    </div>

                    {/* Email */}
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="signup-email"
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all"
                      />
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password (min 8 chars)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Confirm Password */}
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <Button
                      id="email-signup-btn"
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Google OAuth Button */}
              <Button
                id="google-signin-btn"
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-3 text-sm font-semibold bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 hover:border-gray-300 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-3 animate-spin text-gray-600" />
                    Redirecting to Google...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              {/* Security badge */}
              <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-blue-600/8 border border-blue-500/15">
                <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Your data is encrypted. Email/password and Google OAuth are both fully supported.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Feature chips */}
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="glass-card p-3 rounded-lg">
            <p className="text-xl mb-1">🤖</p>
            <p className="text-xs text-muted-foreground">AI Tutor</p>
          </div>
          <div className="glass-card p-3 rounded-lg">
            <p className="text-xl mb-1">🎯</p>
            <p className="text-xs text-muted-foreground">Smart Quizzes</p>
          </div>
          <div className="glass-card p-3 rounded-lg">
            <p className="text-xl mb-1">📊</p>
            <p className="text-xs text-muted-foreground">Track Progress</p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          By continuing, you agree to Obsidian's Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
