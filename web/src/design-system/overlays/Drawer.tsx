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
            "inset-x-0 bottom-0 top-auto max-h-[92vh] rounded-t-panel data-[state=open]:animate-in data-[state=closed]:animate-out",
            "md:inset-y-0 md:right-0 md:left-auto md:w-[min(560px,86vw)] md:max-h-none md:rounded-l-panel md:rounded-tr-none",
            "xl:w-[min(640px,60vw)]",
            docked &&
              "2xl:static 2xl:z-auto 2xl:h-auto 2xl:w-[480px] 2xl:rounded-none 2xl:border-l 2xl:shadow-none 2xl:!translate-x-0",
          )}
          style={{ transitionDuration: "var(--dur-slow)", transitionTimingFunction: "var(--ease-emphasized)" }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative shrink-0 border-b border-default bg-surface3 px-5 pb-4 pt-3">
            <div className="mb-2 h-1 w-10 rounded-pill bg-strong md:hidden" aria-hidden />
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

          <div className="flex min-h-0 flex-1">
            <div id="drawer-scroll" className="min-w-0 flex-1 overflow-y-auto px-5 py-4">
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
            <footer className="shrink-0 border-t border-subtle bg-surface1 px-5 py-3">{footer}</footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
