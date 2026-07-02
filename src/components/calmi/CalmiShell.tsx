import { useEffect, useState } from "react";
import { BookOpen, Clock, LogOut, Moon, Settings, Sparkles, Sun, ThumbsUp } from "lucide-react";
import { FeedbackModal } from "./FeedbackModal";

interface CalmiShellProps {
  userId: string;
  children: React.ReactNode;
  genzMode: boolean;
  onGenzToggle: (enabled: boolean) => void;
  onGoHome: () => void;
  onViewInsights: () => void;
  onViewHistory: () => void;
  onOpenNotes: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  theme?: "light" | "dark";
  onThemeToggle?: (event?: React.MouseEvent) => void;
}

export function CalmiShell({
  userId,
  children,
  genzMode,
  onGenzToggle,
  onGoHome,
  onViewInsights,
  onViewHistory,
  onOpenNotes,
  onOpenSettings,
  onSignOut,
  theme = "dark",
  onThemeToggle,
}: CalmiShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    if (!settingsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-settings-menu]")) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-20 bg-background flex flex-col items-center py-6 gap-6">
        <button
          type="button"
          onClick={onGoHome}
          className="h-10 w-10 rounded-full flex items-center justify-center transition hover:bg-muted"
          aria-label="Go home"
        >
          <img
            src="/logo-icon.svg"
            alt="coree"
            className="h-6 w-6 object-contain"
          />
        </button>

        <div className="flex flex-col gap-4">
          <div className="group relative">
            <button
              type="button"
              onClick={onViewInsights}
              className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted transition text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-sm">
              <span className="text-sm font-medium text-foreground">insights</span>
            </div>
          </div>

          <div className="group relative">
            <button
              type="button"
              onClick={onViewHistory}
              className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted transition text-muted-foreground hover:text-foreground"
            >
              <Clock className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-sm">
              <span className="text-sm font-medium text-foreground">history</span>
            </div>
          </div>

          <div className="group relative">
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted transition text-muted-foreground hover:text-foreground"
            >
              <ThumbsUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-sm">
              <span className="text-sm font-medium text-foreground">feedback</span>
            </div>
          </div>

          <div className="group relative">
            <button
              type="button"
              onClick={onOpenNotes}
              className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted transition text-muted-foreground hover:text-foreground"
            >
              <BookOpen className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-sm">
              <span className="text-sm font-medium text-foreground">journal</span>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted transition text-muted-foreground hover:text-foreground"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" strokeWidth={2.5} />
          </button>
          {settingsOpen && (
            <div data-settings-menu className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-lg p-4 w-56 z-50">
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  setSettingsOpen(false);
                }}
                className="w-full text-left py-3 flex items-center gap-2 text-foreground hover:opacity-70 transition"
              >
                <Settings className="h-4 w-4" />
                <span>open settings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  setSettingsOpen(false);
                }}
                className="w-full text-left py-3 flex items-center gap-2 text-foreground hover:opacity-70 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>sign out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="mx-auto max-w-4xl px-6 lg:px-8 py-4 flex justify-between items-center w-full">
            <div />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">gen z mode</span>
              <button
                type="button"
                onClick={() => onGenzToggle(!genzMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                  genzMode ? "bg-primary" : "bg-muted"
                }`}
                aria-label="Toggle gen z mode"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    genzMode ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              </div>
              {onThemeToggle && (
                <button
                  type="button"
                  onClick={(e) => onThemeToggle(e)}
                  className="h-10 w-10 rounded-full flex items-center justify-center bg-card border-2 border-border hover:border-primary/60 transition text-foreground active:translate-y-0.5"
                  style={{ boxShadow: "0 3px 0 0 hsl(var(--border))" }}
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  title={theme === "dark" ? "Light mode" : "Dark mode"}
                >
                  {theme === "dark"
                    ? <Sun className="h-5 w-5" strokeWidth={2.5} />
                    : <Moon className="h-5 w-5" strokeWidth={2.5} />}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <FeedbackModal userId={userId} open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
