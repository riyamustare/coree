import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Default to dark mode across the app (including landing/auth for
// unauthenticated users). Index.tsx will override this once the user's
// profile.theme preference loads.
if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
