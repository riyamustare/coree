import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toDirectAddress } from "@/lib/personLanguage";

interface ExplainedMemory {
  id: string;
  labels?: string[];
  text?: string;
  episode_text?: string;
  episode_date?: string;
  superseded_text?: string;
  superseded_by_text?: string;
  episodes?: Array<{ id: string; text: string; date: string | null }>;
  supersededFacts?: Array<{ id: string; text: string }>;
  supersededBy?: Array<{ id: string; text: string }>;
}

interface MemoryTraceButtonProps {
  trace: string[];
}

export function MemoryTraceButton({ trace }: MemoryTraceButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ExplainedMemory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [incomplete, setIncomplete] = useState(false);

  const showExplanation = async () => {
    setOpen(true);
    if (items.length || !trace.length || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "memory",
        {
          body: { action: "explain", ids: trace },
        },
      );
      if (invokeError) throw invokeError;
      const rows = Array.isArray(data?.items) ? data.items : [];
      setIncomplete(data?.incomplete === true);
      setItems(
        rows.filter(
          (item: unknown): item is ExplainedMemory =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as ExplainedMemory).id === "string",
        ),
      );
    } catch (cause) {
      console.error("Could not load memory explanation:", cause);
      setError("Core couldn't load the source for this reply.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={showExplanation}
        className="mt-2 block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Why did Core say this?
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Why Core said this"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Why Core said this
                </h2>
                <p className="text-sm text-muted-foreground">
                  The memories that informed this reply.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                close
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading sources…</p>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {incomplete ? (
              <p className="mb-3 text-xs text-muted-foreground">
                Some graph sources are temporarily unavailable.
              </p>
            ) : null}
            {!loading && !error && items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved memory details are available for this reply.
              </p>
            ) : null}
            <div className="max-h-[55vh] space-y-3 overflow-y-auto">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-border p-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {toDirectAddress(item.text || "Conversation detail")}
                  </p>
                  {item.episode_text && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Source conversation
                      {item.episode_date
                        ? ` · ${new Date(item.episode_date).toLocaleDateString()}`
                        : ""}
                      : {toDirectAddress(item.episode_text)}
                    </p>
                  )}
                  {item.episodes?.map((episode) => (
                    <p
                      key={episode.id}
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      Source conversation
                      {episode.date
                        ? ` · ${new Date(episode.date).toLocaleDateString()}`
                        : ""}
                      : {toDirectAddress(episode.text)}
                    </p>
                  ))}
                  {item.superseded_text && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Previously remembered:{" "}
                      {toDirectAddress(item.superseded_text)}
                    </p>
                  )}
                  {item.supersededFacts?.map((fact) => (
                    <p
                      key={fact.id}
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      Previously remembered: {toDirectAddress(fact.text)}
                    </p>
                  ))}
                  {item.superseded_by_text && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Later updated to:{" "}
                      {toDirectAddress(item.superseded_by_text)}
                    </p>
                  )}
                  {item.supersededBy?.map((fact) => (
                    <p
                      key={fact.id}
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      Later updated to: {toDirectAddress(fact.text)}
                    </p>
                  ))}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
