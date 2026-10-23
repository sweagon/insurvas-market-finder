import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useRef, useState } from "react";
import { cn } from "../cn";
import { X } from "../icons";

const SNAPS = ["96px", "50dvh", "92dvh"] as const;

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** 0 = collapsed handle, 1 = half, 2 = full. */
  initialSnap?: 0 | 1 | 2;
}

/**
 * Bottom sheet (D.5): 96px / 50% / 92% snap points, drag-handle only.
 * Pointer drag chooses the nearest snap on release; arrow keys move between
 * snaps for keyboard users. Radix supplies the focus trap and Esc handling.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  initialSnap = 1,
}: BottomSheetProps) {
  const [snap, setSnap] = useState<0 | 1 | 2>(initialSnap);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(0);
  const content = useRef<HTMLDivElement>(null);

  const heightPx = (index: 0 | 1 | 2) =>
    index === 0 ? 96 : window.innerHeight * (index === 1 ? 0.5 : 0.92);

  const finish = () => {
    if (!dragging || !content.current) return;
    const current = content.current.getBoundingClientRect().height - drag;
    const nearest = ([0, 1, 2] as const).reduce((best, i) =>
      Math.abs(heightPx(i) - current) < Math.abs(heightPx(best) - current) ? i : best,
    0);
    setSnap(nearest);
    setDrag(0);
    setDragging(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-drawer bg-scrim data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogPrimitive.Content
          ref={content}
          className={cn(
            "fixed inset-x-0 bottom-0 z-drawer flex flex-col overflow-hidden rounded-t-panel border border-default bg-surface1 shadow-l4 focus:outline-none",
            !dragging && "transition-[height] duration-300 ease-emphasized",
          )}
          style={{
            height: SNAPS[snap],
            transform: drag ? `translateY(${drag}px)` : undefined,
          }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description>{description ?? title}</DialogPrimitive.Description>
          </VisuallyHidden.Root>

          <div
            role="slider"
            aria-label={`Resize ${title}`}
            aria-valuemin={0}
            aria-valuemax={2}
            aria-valuenow={snap}
            aria-valuetext={["Collapsed", "Half height", "Full height"][snap]}
            tabIndex={0}
            className="mx-auto flex h-7 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              start.current = e.clientY;
              setDragging(true);
            }}
            onPointerMove={(e) => {
              if (!dragging) return;
              setDrag(Math.max(-window.innerHeight * 0.9, Math.min(window.innerHeight * 0.8, e.clientY - start.current)));
            }}
            onPointerUp={finish}
            onPointerCancel={finish}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSnap((s) => Math.min(2, s + 1) as 0 | 1 | 2);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSnap((s) => Math.max(0, s - 1) as 0 | 1 | 2);
              } else if (e.key === "Home") {
                e.preventDefault();
                setSnap(0);
              } else if (e.key === "End") {
                e.preventDefault();
                setSnap(2);
              }
            }}
          >
            <span className="h-1 w-10 rounded-pill bg-strong" aria-hidden />
          </div>

          <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2">
            <DialogPrimitive.Title className="text-h3 text-primary">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close sheet" className="rounded-control p-1.5 text-tertiary hover:bg-surface2 hover:text-primary">
              <X size={18} aria-hidden />
            </DialogPrimitive.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer && <footer className="shrink-0 border-t border-subtle px-5 py-3">{footer}</footer>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
