import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { trackSignUp, trackSignIn } from "@/lib/analytics";

interface AuthScreenProps {
  onBack?: () => void;
}

export function AuthScreen({ onBack }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

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
            emailRedirectTo: window.location.origin,
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const callback = `${window.location.origin}/auth/callback`;
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: callback,
      });
      if (result.error) throw result.error;
    } catch (err: any) {
      const errorMsg = err.message || "Failed to sign in with Google";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#FAF7F2] flex items-center justify-center z-50 px-4">
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
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        )}

        {/* Header Text */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isSignUp ? "Start your journey with coree." : "all ears, always"}
          </h2>
          <p className="text-sm text-gray-600">
            {isSignUp ? "your space to be heard" : "your space to be heard"}
          </p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm text-gray-700 mb-2">your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="name"
                maxLength={80}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 text-sm placeholder-gray-400"
                required
              />
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">enter your email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              autoComplete="email"
              maxLength={255}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 text-sm placeholder-gray-400"
              required
            />
          </div>
          
          {/* Password Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 text-sm placeholder-gray-400"
              required
            />
          </div>
          
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          
          {/* Auth Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#277BD9] hover:bg-[#2e90ff] text-[#FAF7F2] py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (isSignUp ? "creating account..." : "logging in...") : (isSignUp ? "sign up" : "login")}
          </button>

          {/* Toggle Link */}
          <div className="text-center">
            <span className="text-gray-600 text-sm">
              {isSignUp ? "already have an account? " : "don't have an account? "}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-black hover:text-gray-700 font-medium text-sm underline"
            >
              {isSignUp ? "login" : "signup"}
            </button>
          </div>
        </form>

        {/* OR Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>
        
        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-[#277BD9] hover:bg-[#2e90ff] text-[#FAF7F2] py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          google
        </button>

        {/* Footer Text */}
        <p className="text-sm text-gray-500 text-center mt-6 leading-relaxed">
          by signing up you agree to our <strong>terms of service</strong>,<br />
          <strong>privacy policy</strong> and acknowledge <strong>ai disclaimer.</strong>
        </p>
      </motion.div>
    </div>
  );
}
