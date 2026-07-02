// Circular reveal theme transition using the View Transitions API.
// Falls back to instant toggle when the API isn't available.
export function toggleThemeWithTransition(
  event: React.MouseEvent | MouseEvent | null,
  applyTheme: () => void,
) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void> };
  };

  if (!doc.startViewTransition || typeof window === "undefined") {
    applyTheme();
    return;
  }

  // Anchor point: click coordinates, or center of viewport.
  const x = event ? (event as MouseEvent).clientX : window.innerWidth / 2;
  const y = event ? (event as MouseEvent).clientY : window.innerHeight / 2;
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  document.documentElement.style.setProperty("--theme-x", `${x}px`);
  document.documentElement.style.setProperty("--theme-y", `${y}px`);
  document.documentElement.style.setProperty("--theme-r", `${maxRadius}px`);

  doc.startViewTransition(() => {
    applyTheme();
  });
}
