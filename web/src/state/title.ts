import { useEffect } from "react";

const BASE = "Insurvas Market Finder";

/** Route-level document title so the browser tab matches the screen. */
export function useDocumentTitle(view: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = view ? `Insurvas · ${label(view)}` : BASE;
    return () => {
      document.title = previous;
    };
    function label(value: string) {
      if (value === "final_expense") return "Final Expense";
      if (value === "legacy_wealth") return "Legacy Wealth";
      if (value === "spouse_protection") return "Spouse Protection";
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
  }, [view]);
}
