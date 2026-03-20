import { useState, useEffect } from "react";
import { Mic, MessageSquare, LogOut } from "lucide-react";

interface SessionHeaderProps {
  mode: "text" | "voice";
  onModeChange: (mode: "text" | "voice") => void;
  onEndSession: () => void;
  sessionStart: Date | null;
}

export function SessionHeader({ mode, onModeChange, onEndSession, sessionStart }: SessionHeaderProps) {
  const [elapsed, setElapsed] = useState("0:00");

  useEffect(() => {
    if (!sessionStart) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - sessionStart.getTime()) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${s.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStart]);

  return (
    <div className="flex items-center justify-between px-2 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-medium tracking-tight text-foreground">Calmi</h1>
        {sessionStart && (
          <span className="text-xs tabular-nums text-muted-foreground">{elapsed}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Mode toggle */}
        <div className="flex items-center rounded-xl bg-secondary p-1 gap-0.5">
          <button
            onClick={() => onModeChange("text")}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
              mode === "text"
                ? "bg-surface shadow-soft text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Text mode"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <button
            onClick={() => onModeChange("voice")}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
              mode === "voice"
                ? "bg-surface shadow-soft text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Voice mode"
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>

        {sessionStart && (
          <button
            onClick={onEndSession}
            className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
          >
            <LogOut className="h-3.5 w-3.5" />
            End
          </button>
        )}
      </div>
    </div>
  );
}
