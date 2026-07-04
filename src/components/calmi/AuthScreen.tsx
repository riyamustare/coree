import { useState } from "react";
import { motion } from "framer-motion";
import { X, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackSignUp, trackSignIn } from "@/lib/analytics";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface AuthScreenProps {
  onBack?: () => void;
}

export function AuthScreen({ onBack }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "verify" | "reset">("request");
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"enter" | "verify">("enter");
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

  const normalizePhone = (raw: string) => {
    const trimmed = raw.trim().replace(/\s|-|\(|\)/g, "");
    return trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/^0+/, "")}`;
  };

  const handleSendPhoneOtp = async () => {
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (isSignUp && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const normalized = normalizePhone(phone);
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: {
          channel: "sms",
          shouldCreateUser: true,
          data: isSignUp && name.trim() ? { display_name: name.trim() } : undefined,
        },
      });
      if (error) throw error;
      toast({ title: "code sent", description: `we sent a 6-digit code to ${normalized}.` });
      setPhoneStep("verify");
    } catch (err: any) {
      const msg = err.message || "Unable to send code. Make sure the phone provider is enabled.";
      setError(msg);
      toast({ title: "couldn't send code", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const normalized = normalizePhone(phone);
      const { error } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: phoneOtp.trim(),
        type: "sms",
      });
      if (error) throw error;
      isSignUp ? trackSignUp() : trackSignIn();
    } catch (err: any) {
      const msg = err.message || "Invalid or expired code.";
      setError(msg);
      toast({ title: "couldn't verify", description: msg, variant: "destructive" });
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
    <div className="fixed inset-0 bg-background text-foreground z-50 overflow-y-auto">
      {/* Close button */}
      {onBack && (
        <button
          onClick={onBack}
          className="fixed top-5 right-5 z-50 h-10 w-10 rounded-full flex items-center justify-center bg-card border-2 border-border-color text-foreground hover:border-primary/60 active:translate-y-0.5 transition"
          style={{ boxShadow: "0 3px 0 0 hsl(var(--border))" }}
          aria-label="close"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
      )}

      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left brand panel */}
        <aside className="hidden lg:flex relative overflow-hidden bg-primary text-primary-foreground p-12 flex-col justify-between">
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(hsl(0 0% 100% / 0.3) 1.5px, transparent 1.5px)",
              backgroundSize: "26px 26px",
              maskImage: "radial-gradient(ellipse at 30% 30%, black 40%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at 30% 30%, black 40%, transparent 75%)",
            }}
          />
          <div className="relative z-10">
            <img src="/logo.svg" alt="coree" className="h-6 brightness-0 invert" />
          </div>
          <div className="relative z-10 max-w-md">
            <h1 className="text-4xl xl:text-5xl font-black leading-[1.05] lowercase mb-4">
              your space to
              <br />
              process it all.
            </h1>
            <p className="text-base xl:text-lg opacity-90 font-medium lowercase leading-relaxed">
              coree is your wise-friend companion. talk, type, unpack - as much or as little as you want.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-3">
              {[
                { icon: Heart, t: "no judgment, ever" },
                { icon: ShieldCheck, t: "encrypted & private by design" },
                { icon: Sparkles, t: "picks up where you left off" },
              ].map(({ icon: Icon, t }) => (
                <div key={t} className="flex items-center gap-3 rounded-2xl bg-primary-foreground/10 border-2 border-primary-foreground/15 px-4 py-3">
                  <div className="h-8 w-8 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
                    <Icon className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-bold lowercase">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="relative z-10 text-xs font-bold uppercase tracking-widest opacity-70">
            loved by 50+ people like you
          </p>
        </aside>

        {/* Right form panel */}
        <section className="flex items-center justify-center px-4 py-12 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-sm"
          >
            {/* Mobile logo */}
            <div className="flex lg:hidden justify-center mb-6">
              <img src="/logo.svg" alt="coree" className="h-6" />
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-foreground mb-2 lowercase">
                {isForgotPassword
                  ? "reset your password"
                  : isSignUp
                    ? "start your journey"
                    : "welcome back"}
              </h2>
              <p className="text-sm text-muted-foreground font-medium lowercase">
                {isForgotPassword
                  ? "we'll help you back in."
                  : isSignUp
                    ? "your space to be heard - free forever."
                    : "all ears, always."}
              </p>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {!isForgotPassword && (
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1 border-2 border-border-color">
              <button
                type="button"
                onClick={() => { setAuthMode("email"); setError(""); setPhoneStep("enter"); setPhoneOtp(""); }}
                className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  authMode === "email"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                email
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("phone"); setError(""); }}
                className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  authMode === "phone"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                phone
              </button>
            </div>
          )}

          {isForgotPassword ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground font-medium lowercase">
                  {forgotStep === "request"
                    ? "enter your email and we'll send a 6-digit code."
                    : "enter the code from your email and choose a new password."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email"
                  autoComplete="email"
                  maxLength={255}
                  className="w-full px-4 py-3 bg-card text-foreground border-2 border-border-color rounded-2xl focus:outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground transition"
                  required
                />
              </div>

              {forgotStep === "verify" && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">6-digit code</label>
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">new password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="new password"
                      autoComplete="new-password"
                      minLength={6}
                      className="w-full px-4 py-3 bg-card text-foreground border-2 border-border-color rounded-2xl focus:outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground transition"
                      required
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="text-destructive text-sm font-medium lowercase bg-destructive/10 border-2 border-destructive/30 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={forgotStep === "request" ? handleForgotPasswordRequest : handleForgotPasswordVerify}
                disabled={loading}
                className="btn-duo w-full py-4 text-sm"
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
                  className="text-foreground hover:text-primary font-bold text-sm lowercase transition"
                >
                  back to login
                </button>
              </div>
            </>
          ) : authMode === "email" ? (
            <>
              {isSignUp && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">your name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="name"
                    maxLength={80}
                    className="w-full px-4 py-3 bg-card text-foreground border-2 border-border-color rounded-2xl focus:outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground transition"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email"
                  autoComplete="email"
                  maxLength={255}
                  className="w-full px-4 py-3 bg-card text-foreground border-2 border-border-color rounded-2xl focus:outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength={6}
                  className="w-full px-4 py-3 bg-card text-foreground border-2 border-border-color rounded-2xl focus:outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground transition"
                  required
                />
              </div>

              {error && (
                <div className="text-destructive text-sm font-medium lowercase bg-destructive/10 border-2 border-destructive/30 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}

              {!isSignUp && (
                <div className="flex w-full justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setForgotStep("request");
                      setError("");
                    }}
                    className="text-xs font-bold text-muted-foreground hover:text-primary uppercase tracking-wide transition"
                  >
                    forgot password?
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleAuth}
                disabled={loading}
                className="btn-duo w-full py-4 text-sm"
              >
                {loading ? (isSignUp ? "creating account..." : "logging in...") : (isSignUp ? "sign up" : "login")}
              </button>

              <div className="text-center pt-2">
                <span className="text-muted-foreground text-sm font-medium lowercase">
                  {isSignUp ? "already have an account? " : "don't have an account? "}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                  }}
                  className="text-primary hover:text-primary/80 font-black text-sm lowercase transition"
                >
                  {isSignUp ? "log in" : "sign up"}
                </button>
              </div>
            </>
          ) : (
            <>
              {isSignUp && phoneStep === "enter" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">your name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="name"
                    maxLength={80}
                    className="w-full px-4 py-3 bg-card text-foreground border-2 border-border-color rounded-2xl focus:outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground transition"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98xxxxxxxx"
                  autoComplete="tel"
                  maxLength={32}
                  disabled={phoneStep === "verify"}
                  className="w-full px-4 py-3 bg-card text-foreground border-2 border-border-color rounded-2xl focus:outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground transition disabled:opacity-60"
                  required
                />
                <p className="text-[11px] text-muted-foreground mt-1.5 font-medium lowercase">
                  include country code (e.g. +91 for india).
                </p>
              </div>

              {phoneStep === "verify" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">6-digit code</label>
                  <InputOTP value={phoneOtp} onChange={setPhoneOtp} maxLength={6}>
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
              )}

              {error && (
                <div className="text-destructive text-sm font-medium lowercase bg-destructive/10 border-2 border-destructive/30 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={phoneStep === "enter" ? handleSendPhoneOtp : handleVerifyPhoneOtp}
                disabled={loading}
                className="btn-duo w-full py-4 text-sm"
              >
                {loading
                  ? "working..."
                  : phoneStep === "enter"
                  ? isSignUp
                    ? "send code & sign up"
                    : "send login code"
                  : "verify & continue"}
              </button>

              {phoneStep === "verify" && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setPhoneStep("enter"); setPhoneOtp(""); setError(""); }}
                    className="text-foreground hover:text-primary font-bold text-sm lowercase transition"
                  >
                    use a different number
                  </button>
                </div>
              )}

              {phoneStep === "enter" && (
                <div className="text-center pt-2">
                  <span className="text-muted-foreground text-sm font-medium lowercase">
                    {isSignUp ? "already have an account? " : "new here? "}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                    className="text-primary hover:text-primary/80 font-black text-sm lowercase transition"
                  >
                    {isSignUp ? "log in" : "sign up"}
                  </button>
                </div>
              )}
            </>
          )}
            </form>

            {!isForgotPassword && (
              <>
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t-2 border-border-color" />
                  <span className="px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">or</span>
                  <div className="flex-1 border-t-2 border-border-color" />
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="btn-duo-secondary w-full py-3 text-sm flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                  </svg>
                  <span>continue with google</span>
                </button>
              </>
            )}

            <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed font-medium lowercase">
              by signing up you agree to our{" "}
              <span className="font-bold text-foreground">terms of service</span>,{" "}
              <span className="font-bold text-foreground">privacy policy</span>{" "}
              and acknowledge our <span className="font-bold text-foreground">ai disclaimer</span>.
            </p>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
