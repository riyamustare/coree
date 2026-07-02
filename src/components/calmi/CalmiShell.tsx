import { useEffect, useState } from "react";
import { BookHeart, Compass, History, LogOut, Menu, MessageSquareHeart, Moon, Settings, Sun, X } from "lucide-react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const wrap = (fn: () => void) => () => {
    fn();
    setMobileOpen(false);
  };

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
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 h-10 w-10 rounded-2xl bg-card border-2 border-border-color flex items-center justify-center text-foreground"
        style={{ boxShadow: "0 3px 0 0 hsl(var(--border))" }}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" strokeWidth={2.5} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static top-0 left-0 z-50 h-full w-60 md:w-20 bg-background flex flex-col md:items-center py-6 gap-6 transition-transform duration-200 md:transition-none border-r-2 border-border-color md:border-r-0 px-4 md:px-0`}
      >
        {mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden absolute top-3 right-[-44px] h-9 w-9 rounded-xl bg-card border-2 border-border-color flex items-center justify-center text-foreground"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
        <button
          type="button"
          onClick={wrap(onGoHome)}
          className="h-10 w-full md:w-10 rounded-full flex items-center md:justify-center gap-3 transition hover:bg-muted px-2 md:px-0"
          aria-label="Go home"
        >
          <img src="/logo-icon.svg" alt="coree" className="h-6 w-6 object-contain" />
          <span className="md:hidden text-sm font-black lowercase text-foreground">coree</span>
        </button>

        <nav className="flex flex-col gap-2 md:gap-3 w-full md:w-auto">
          {[
            { icon: Compass, label: "insights", onClick: wrap(onViewInsights) },
            { icon: History, label: "history", onClick: wrap(onViewHistory) },
            { icon: BookHeart, label: "journal", onClick: wrap(onOpenNotes) },
            { icon: MessageSquareHeart, label: "feedback", onClick: wrap(() => setFeedbackOpen(true)) },
          ].map(({ icon: Icon, label, onClick }) => (
            <div key={label} className="group relative w-full md:w-auto">
              <button
                type="button"
                onClick={onClick}
                className="h-11 w-full md:w-11 rounded-2xl flex items-center md:justify-center gap-3 px-3 md:px-0 bg-transparent border-2 border-transparent text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 active:translate-y-0.5 transition-all duration-150"
                aria-label={label}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={2.5} />
                <span className="md:hidden text-sm font-bold lowercase">{label}</span>
              </button>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden md:group-hover:flex items-center gap-2 bg-card border-2 border-border rounded-xl px-3 py-1.5 whitespace-nowrap z-50 shadow-md">
                <span className="text-xs font-bold uppercase tracking-wide text-foreground">{label}</span>
              </div>
            </div>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="relative w-full md:w-auto">
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="h-11 w-full md:w-11 rounded-2xl flex items-center md:justify-center gap-3 px-3 md:px-0 bg-transparent border-2 border-transparent text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 active:translate-y-0.5 transition-all duration-150"
            aria-label="Settings"
          >
            <Settings className="h-[22px] w-[22px]" strokeWidth={2.5} />
            <span className="md:hidden text-sm font-bold lowercase">settings</span>
          </button>
          {settingsOpen && (
            <div data-settings-menu className="absolute bottom-full left-0 mb-2 bg-card border-2 border-border-color rounded-2xl shadow-lg p-2 w-56 z-50">
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  setSettingsOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 text-foreground text-sm font-bold lowercase hover:bg-muted transition"
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
                className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 text-foreground text-sm font-bold lowercase hover:bg-muted transition"
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
