import { useState } from "react";
import { useStore } from "../../state/store";
import { Button } from "../primitives/Button";
import { Check, Link2 } from "../icons";

/** Share dialog: copies the URL and shows exactly what state it encodes (D.5). */
export function ShareDialog({ onDone }: { onDone: () => void }) {
  const { lens, filters, selectedFips, compare } = useStore();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable: the field below still shows the link */
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-body text-secondary">
        The link encodes the lens, filters, selection and compare set. Anyone who opens it sees the
        same view.
      </p>
      <div className="rounded-card border border-subtle bg-surface2 p-3">
        <p className="mb-2 text-micro uppercase text-tertiary">Included state</p>
        <ul className="space-y-1 text-body-sm text-secondary">
          <li>
            Lens: <span className="text-primary">{lens}</span>
          </li>
          <li>
            States: <span className="text-primary">{filters.states.length || "all"}</span>
          </li>
          <li>
            60+ floor: <span className="text-primary">{filters.minPop60.toLocaleString()}</span>
          </li>
          {selectedFips && (
            <li>
              Area: <span className="font-mono text-mono text-primary">{selectedFips}</span>
            </li>
          )}
          <li>
            Compare: <span className="text-primary">{compare.length}</span>
          </li>
        </ul>
      </div>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={typeof window === "undefined" ? "" : window.location.href}
          aria-label="Shareable link"
          className="h-control w-full rounded-control border border-default bg-surface1 px-3 text-body-sm text-secondary"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          variant="primary"
          onClick={copy}
          iconLeft={copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-caption text-tertiary" role="status" aria-live="polite">
          {copied ? "Link copied" : ""}
        </span>
        <Button variant="ghost" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
