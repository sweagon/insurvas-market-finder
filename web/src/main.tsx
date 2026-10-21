import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PreferencesProvider } from "./design-system/providers/PreferencesProvider";
import { TooltipProvider } from "./design-system/primitives/tooltip";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PreferencesProvider>
      <TooltipProvider delayDuration={200}>
        <App />
      </TooltipProvider>
    </PreferencesProvider>
  </React.StrictMode>
);
