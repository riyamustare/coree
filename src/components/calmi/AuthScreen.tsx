import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackSignUp, trackSignIn } from "@/lib/analytics";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import LoadingAnimation from "@/components/LoadingAnimation";

interface AuthScreenProps {
  onBack?: () => void;
}

export function AuthScreen({ onBack }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "verify" | "reset">("request");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const appOrigin = import.meta.env.VITE_APP_URL || "https://www.thecoree.com";


  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (isSignUp && !name.trim()) {
      setError("Please enter your name");
      return;
    }
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: appOrigin,
            data: { display_name: name.trim() },
          },
        });
        if (error) throw error;
        trackSignUp();
        toast({ title: "Check your email", description: "We sent you a confirmation link." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        trackSignIn();
      }
    } catch (err: any) {
      const errorMsg = err.message || "Something went wrong";
      setError(errorMsg);
      toast({
        title: "Something went wrong",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async () => {
    if (!email.trim()) {
      setError("Please enter your email to reset your password.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      toast({ title: "Check your inbox", description: "We sent a 6-digit code to your email." });
      setForgotStep("verify");
    } catch (err: any) {
      const errorMsg = err.message || "Unable to send reset code.";
      setError(errorMsg);
      toast({ title: "Unable to send reset code", description: errorMsg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordVerify = async () => {
    if (!email.trim() || otp.trim().length !== 6 || !newPassword.trim()) {
      setError("Enter your email, the 6-digit code, and a new password.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;

      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });
      if (updateError) throw updateError;

      toast({ title: "Password updated", description: "You can now log in with your new password." });
      setIsForgotPassword(false);
      setForgotStep("request");
      setOtp("");
      setNewPassword("");
      setPassword("");
      setError("");
      setIsSignUp(false);
    } catch (err: any) {
      const errorMsg = err.message || "Unable to reset password.";
      setError(errorMsg);
      toast({ title: "Unable to reset password", description: errorMsg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: appOrigin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      const errorMsg = err.message || "Failed to sign in with Google";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForgotFlow = () => {
    setIsForgotPassword(false);
    setForgotStep("request");
    setOtp("");
    setNewPassword("");
    setError("");
  };

  return (
    <div className="fixed inset-0 bg-background text-foreground flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-sm"
      >
        {/* Close Button */}
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute top-6 right-6 text-muted-foreground hover:text-foreground text-2xl"
          >
            ×
          </button>
        )}

        {/* Header Text */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {isSignUp ? "Start your journey with coree." : "all ears, always"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "your space to be heard" : "your space to be heard"}
          </p>
        </div>
        
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {isForgotPassword ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground">
                  {forgotStep === "request"
                    ? "Enter the email for your account and we’ll send a 6-digit code."
                    : "Enter the code from your email and choose a new password."}
                </p>
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email"
                  autoComplete="email"
                  maxLength={255}
                  className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-xl focus:outline-none focus:border-primary text-sm placeholder:text-muted-foreground"
                  required
                />
              </div>

              {forgotStep === "verify" && (
                <>
                  <div>
                    <label className="block text-sm text-foreground mb-2">6-digit code</label>
                    <InputOTP value={otp} onChange={setOtp} maxLength={6}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div>
                    <label className="block text-sm text-foreground mb-2">new password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="new password"
                      autoComplete="new-password"
                      minLength={6}
                      className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-xl focus:outline-none focus:border-primary text-sm placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                </>
              )}

              {error && <div className="text-destructive text-sm">{error}</div>}

              <button
                type="button"
                onClick={forgotStep === "request" ? handleForgotPasswordRequest : handleForgotPasswordVerify}
                disabled={loading}
                className="w-full bg-primary hover:opacity-90 text-primary-foreground py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {loading
                  ? "working..."
                  : forgotStep === "request"
                  ? "send reset code"
                  : "reset password"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resetForgotFlow}
                  className="text-foreground hover:opacity-70 font-medium text-sm underline"
                >
                  back to login
                </button>
              </div>
            </>
          ) : (
            <>
              {isSignUp && (
                <div>
                  <label className="block text-sm text-foreground mb-2">your name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="name"
                    maxLength={80}
                    className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-xl focus:outline-none focus:border-primary text-sm placeholder:text-muted-foreground"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-foreground mb-2">enter your email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email"
                  autoComplete="email"
                  maxLength={255}
                  className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-xl focus:outline-none focus:border-primary text-sm placeholder:text-muted-foreground"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength={6}
                  className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-xl focus:outline-none focus:border-primary text-sm placeholder:text-muted-foreground"
                  required
                />
              </div>

              {error && <div className="text-destructive text-sm">{error}</div>}

              {!isSignUp && (
                <div className="flex w-full justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setForgotStep("request");
                      setError("");
                    }}
                    className="self-end text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    forgot password?
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleAuth}
                disabled={loading}
                className="w-full bg-primary hover:opacity-90 text-primary-foreground py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {loading ? (isSignUp ? "creating account..." : "logging in...") : (isSignUp ? "sign up" : "login")}
              </button>

              {!isSignUp && (
                <div className="text-center mt-4">
                  <span className="text-muted-foreground text-sm">don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setError("");
                    }}
                    className="text-foreground hover:opacity-70 font-medium text-sm underline"
                  >
                    signup
                  </button>
                </div>
              )}

              {isSignUp && (
                <div className="text-center mt-4">
                  <span className="text-muted-foreground text-sm">already have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setError("");
                    }}
                    className="text-foreground hover:opacity-70 font-medium text-sm underline"
                  >
                    login
                  </button>
                </div>
              )}
            </>
          )}
        </form>

        {/* OR Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-border"></div>
          <span className="px-4 text-sm text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border"></div>
        </div>
        
        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-card text-foreground border border-border hover:border-primary py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          continue with google
        </button>

        {/* Footer Text */}
        <p className="text-sm text-muted-foreground text-center mt-6 leading-relaxed">
          by signing up you agree to our <strong>terms of service</strong>,<br />
          <strong>privacy policy</strong> and acknowledge <strong>ai disclaimer.</strong>
        </p>
      </motion.div>
    </div>
  );
}
