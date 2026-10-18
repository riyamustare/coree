import { extractCandidateText } from "./gemini.ts";

Deno.test("excludes Gemini thought parts and returns the final answer", () => {
  const actual = extractCandidateText({
    content: {
      parts: [
        { text: "Shape: (1)", thought: true },
        { text: "you've made a meaningful change by starting yoga. " },
        { text: "what has felt different since you began?" },
      ],
    },
  });
  if (
    actual !==
      "you've made a meaningful change by starting yoga. what has felt different since you began?"
  ) {
    throw new Error(`Unexpected candidate text: ${actual}`);
  }
});

Deno.test("returns empty text when the candidate has no user-facing part", () => {
  const actual = extractCandidateText({
    content: { parts: [{ text: "internal reasoning", thought: true }] },
  });
  if (actual !== "") throw new Error(`Expected empty text, received ${actual}`);
});
