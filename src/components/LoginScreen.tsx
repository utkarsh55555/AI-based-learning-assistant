import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Sparkles, Chrome, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { ObsidianCore } from "./ObsidianCore";
import { supabase } from "../utils/supabase";
import { authAPI } from "../utils/api";

interface LoginScreenProps {
  onLogin: (user: { id?: string; name: string; email: string; isNewUser?: boolean; total_xp?: number; current_streak?: number }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);

  // Listen for Supabase auth state changes — this fires when the user returns
  // from Google OAuth and the session is established in the browser.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          setIsProcessingCallback(true);
          try {
            // Store the Supabase JWT so the backend can verify it
            localStorage.setItem('access_token', session.access_token);
            if (session.refresh_token) {
              localStorage.setItem('refresh_token', session.refresh_token);
            }

            // Fetch the user profile from our backend (auto-creates profile if new)
            const currentUser = await authAPI.getCurrentUser();
            if (currentUser?.user) {
              const u = currentUser.user;
              localStorage.setItem('user', JSON.stringify(u));
              onLogin({
                id: u.id,
                name: u.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                email: u.email || session.user.email || '',
                isNewUser: u.is_new_user ?? false,
                total_xp: u.total_xp,
                current_streak: u.current_streak,
              });
              toast.success('Signed in with Google!');
            }
          } catch (error: any) {
            console.error('Error finalizing Google login:', error);
            const msg: string = error?.message || '';
            // Translate known backend/Supabase messages to user-friendly ones
            if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('sign up')) {
              toast.error('No account found. Please sign up first.', { duration: 6000 });
            } else if (msg.toLowerCase().includes('valid email') || msg.toLowerCase().includes('invalid email')) {
              toast.error('Enter a valid email address.');
            } else if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('already registered')) {
              toast.error('An account with this email already exists. Please log in.');
            } else {
              toast.error(msg || 'Sign-in failed. Please try again.');
            }
            // Clear tokens if something went wrong
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

          } finally {
            setIsLoading(false);
            setIsProcessingCallback(false);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [onLogin]);

  const handleGoogleLogin = async () => {
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error(
        'Google Login is not configured yet.',
        {
          description: 'Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file, and enable Google provider in your Supabase Dashboard.',
          duration: 8000,
        }
      );
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
      // Browser will redirect to Google — no further action needed here.
      // The onAuthStateChange listener above handles the callback.
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(error.message || 'Failed to initiate Google Sign-In. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="size-full flex items-center justify-center relative overflow-hidden">
      {/* Stealth Blue Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#0F1419] to-[#0A0A0A]" />
      
      {/* Electric Blue Floating Particles */}
      <div className="absolute inset-0">
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
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
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
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20">
              <ObsidianCore />
            </div>
          </div>
          <h1 className="text-4xl mb-2 bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">
            Obsidian
          </h1>
          <p className="text-muted-foreground">Your Personal AI Learning Companion</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 rounded-2xl space-y-6">

          {/* Processing callback state */}
          {isProcessingCallback ? (
            <div className="text-center py-6">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-4" />
              <p className="text-muted-foreground">Verifying your Google account...</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-1">Welcome Back</h2>
                <p className="text-sm text-muted-foreground">
                  Sign in with your Google account to continue
                </p>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-600/10 border border-blue-500/20">
                <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-300">Secure Authentication</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We use Google OAuth to verify your identity. Only real, active Google accounts are accepted — no fake accounts.
                  </p>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <Button
                id="google-signin-btn"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-6 text-base font-semibold bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 hover:border-gray-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(59,130,246,0.25)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Redirecting to Google...
                  </>
                ) : (
                  <>
                    {/* Google "G" SVG logo */}
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              {/* Email/Password disabled notice */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Email/password login is disabled. To protect account security, only verified Google accounts are allowed.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="glass-card p-3 rounded-lg">
            <p className="text-2xl mb-1">🤖</p>
            <p className="text-xs text-muted-foreground">AI Tutor</p>
          </div>
          <div className="glass-card p-3 rounded-lg">
            <p className="text-2xl mb-1">🎯</p>
            <p className="text-xs text-muted-foreground">Smart Quizzes</p>
          </div>
          <div className="glass-card p-3 rounded-lg">
            <p className="text-2xl mb-1">📊</p>
            <p className="text-xs text-muted-foreground">Track Progress</p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to Obsidian's Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
