import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useEffect, useState } from "react";
import { cn } from "../cn";
import { X } from "../icons";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  /** Header band content: monogram, name, rank, score, confidence. */
  header: React.ReactNode;
  /** In-panel section anchor nav (scroll-spy). */
  sections?: { id: string; label: string }[];
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Docked at 2xl instead of overlaying (C.1). */
  docked?: boolean;
}

/**
 * Slide-over drawer (R1, D.5): right-anchored, 480/560/640 by breakpoint,
 * header band, panel anchor nav with scroll-spy, sticky footer. Focus trap,
 * Esc closes, focus returns to the trigger (Radix). Full sheet on phones.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  header,
  sections,
  footer,
  children,
  docked = false,
}: DrawerProps) {
  const [active, setActive] = useState(sections?.[0]?.id ?? "");

  useEffect(() => {
    if (!open || !sections?.length) return;
    const root = document.getElementById("drawer-scroll");
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { root, rootMargin: "-20% 0px -70% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [open, sections]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-drawer bg-scrim data-[state=open]:animate-in data-[state=closed]:animate-out",
            docked && "hidden 2xl:block",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-drawer flex flex-col border-default bg-surface1 shadow-l4 focus:outline-none",
            "inset-0 h-[100dvh] max-h-none rounded-none data-[state=open]:animate-in data-[state=closed]:animate-out",
            "md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[min(560px,86vw)] md:rounded-l-panel",
            "xl:w-[min(640px,60vw)]",
            docked && "2xl:w-[min(560px,48vw)]",
          )}
          style={{ transitionDuration: "var(--dur-slow)", transitionTimingFunction: "var(--ease-emphasized)" }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative shrink-0 border-b border-default bg-surface3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] md:px-5 md:pb-4 md:pt-3">
            <div className="mx-auto mb-2 h-1 w-10 rounded-pill bg-strong md:hidden" aria-hidden />
            <div className="flex items-start justify-between gap-3">
              {header}
              <DialogPrimitive.Close
                aria-label="Close details"
                className="rounded-control p-1.5 text-tertiary hover:bg-surface2 hover:text-primary"
              >
                <X size={18} aria-hidden />
              </DialogPrimitive.Close>
            </div>
          </div>

          {sections && sections.length > 0 && (
            <nav aria-label="Sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-subtle px-3 py-2 md:hidden">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => document.getElementById(s.id)?.scrollIntoView({ block: "start" })}
                  className={cn(
                    "min-h-9 shrink-0 rounded-control px-3 text-caption",
                    active === s.id ? "bg-surface3 text-primary" : "text-tertiary",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          )}

          <div className="flex min-h-0 flex-1">
            <div id="drawer-scroll" className="min-w-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
              {children}
            </div>
            {sections && sections.length > 0 && (
              <nav
                aria-label="Sections"
                className="hidden w-36 shrink-0 border-l border-subtle px-2 py-4 md:block"
              >
                <ul className="sticky top-0 space-y-0.5">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(s.id)?.scrollIntoView({ block: "start" });
                        }}
                        className={cn(
                          "relative block rounded-control px-3 py-1.5 text-caption",
                          active === s.id
                            ? "bg-surface3 text-primary"
                            : "text-tertiary hover:text-secondary",
                        )}
                      >
                        {active === s.id && (
                          <span className="absolute left-0 top-1.5 h-5 w-0.5 rounded-pill bg-accent" aria-hidden />
                        )}
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          {footer && (
            <footer className="shrink-0 border-t border-subtle bg-surface1 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5">{footer}</footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
