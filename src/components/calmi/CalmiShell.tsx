import { useEffect, useState } from "react";
import { BookOpen, Clock, LogOut, Settings, Sparkles, ThumbsUp } from "lucide-react";
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
    <div className="flex min-h-screen bg-[#FAF7F2]">
      <aside className="w-20 bg-[#FAF7F2] flex flex-col items-center py-6 gap-6">
        <button
          type="button"
          onClick={onGoHome}
          className="h-10 w-10 rounded-full flex items-center justify-center transition hover:bg-gray-200"
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
              className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-gray-200 transition text-gray-600 hover:text-gray-900"
            >
              <Sparkles className="h-5 w-5" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-sm">
              <span className="text-sm font-medium text-gray-900">insights</span>
            </div>
          </div>

          <div className="group relative">
            <button
              type="button"
              onClick={onViewHistory}
              className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-gray-200 transition text-gray-600 hover:text-gray-900"
            >
              <Clock className="h-5 w-5" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-sm">
              <span className="text-sm font-medium text-gray-900">history</span>
            </div>
          </div>

          <div className="group relative">
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-gray-200 transition text-gray-600 hover:text-gray-900"
            >
              <ThumbsUp className="h-5 w-5" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-sm">
              <span className="text-sm font-medium text-gray-900">feedback</span>
            </div>
          </div>

          <div className="group relative">
            <button
              type="button"
              onClick={onOpenNotes}
              className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-gray-200 transition text-gray-600 hover:text-gray-900"
            >
              <BookOpen className="h-5 w-5" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-sm">
              <span className="text-sm font-medium text-gray-900">journal</span>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-gray-200 transition text-gray-600 hover:text-gray-900"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          {settingsOpen && (
            <div data-settings-menu className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-56 z-50">
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  setSettingsOpen(false);
                }}
                className="w-full text-left py-3 flex items-center gap-2 text-gray-900 hover:text-gray-700 transition"
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
                className="w-full text-left py-3 flex items-center gap-2 text-gray-900 hover:text-gray-700 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>sign out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-[#FAF7F2]/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="mx-auto max-w-4xl px-6 lg:px-8 py-4 flex justify-between items-center w-full">
            <div />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">gen z mode</span>
              <button
                type="button"
                onClick={() => onGenzToggle(!genzMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                  genzMode ? "bg-[#277BD9]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    genzMode ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <FeedbackModal userId={userId} open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
