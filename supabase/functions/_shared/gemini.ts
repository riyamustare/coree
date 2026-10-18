export function extractCandidateText(candidate: unknown): string {
  if (typeof candidate !== "object" || candidate === null) return "";
  const content = (candidate as { content?: unknown }).content;
  if (typeof content !== "object" || content === null) return "";
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .flatMap((part) => {
      if (
        typeof part !== "object" ||
        part === null ||
        (part as { thought?: unknown }).thought === true
      ) {
        return [];
      }
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? [text] : [];
    })
    .join("")
    .trim();
}
