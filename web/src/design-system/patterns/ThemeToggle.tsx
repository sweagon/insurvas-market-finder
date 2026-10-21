import { usePreferences } from "../providers/PreferencesProvider";
import { cn } from "../cn";
import { Moon, Sun } from "../icons";

/** Sun/moon pair with the active one filled (R3–R5). Keyboard: T (F.1). */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = usePreferences();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      aria-pressed={dark}
      className={cn(
        "inline-flex h-control items-center gap-1 rounded-control border border-subtle bg-surface2 px-1",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-[6px]",
          !dark ? "bg-surface3 text-primary" : "text-tertiary",
        )}
      >
        <Sun size={14} aria-hidden />
      </span>
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-[6px]",
          dark ? "bg-surface3 text-primary" : "text-tertiary",
        )}
      >
        <Moon size={14} aria-hidden />
      </span>
    </button>
  );
}
