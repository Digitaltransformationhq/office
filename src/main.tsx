
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { ErrorBoundary } from "./app/components/ErrorBoundary.tsx";
  import "./styles/index.css";

  // The last line of defence. App.tsx catches a crash inside a screen; this
  // catches one in the shell itself — the sidebar, the navbar, the login page —
  // which would otherwise leave a blank white page with nothing to act on.
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
