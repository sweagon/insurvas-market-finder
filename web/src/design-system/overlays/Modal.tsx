import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { cn } from "../cn";
import { X } from "../icons";

export interface ModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: React.ReactNode;
  side?: "center" | "left" | "right";
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Modal dialog (D.5): max 560px, radius 24, scrim, focus trap. Becomes a
 * bottom sheet on phones. `side` turns it into an edge sheet (mobile nav).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  children,
  side = "center",
  footer,
  className,
}: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-modal bg-scrim data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-modal bg-surface1 shadow-l4 focus:outline-none",
            side === "center" &&
              "left-1/2 top-1/2 max-h-[min(720px,92vh)] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-modal border border-default",
            side === "center" &&
              "max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-modal",
            side === "left" &&
              "inset-y-0 left-0 w-[min(320px,86vw)] overflow-y-auto border-r border-default rounded-r-panel",
            side === "right" &&
              "inset-y-0 right-0 w-[min(480px,92vw)] overflow-y-auto border-l border-default rounded-l-panel",
            className,
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-subtle px-5 py-3">
            <DialogPrimitive.Title className="text-h3 text-primary">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="rounded-control p-1.5 text-tertiary hover:bg-surface2 hover:text-primary"
            >
              <X size={18} aria-hidden />
            </DialogPrimitive.Close>
          </header>
          <div className={cn("overflow-y-auto p-5", side === "center" && "max-h-[70vh]")}>
            <VisuallyHidden.Root>
              <DialogPrimitive.Description>{title}</DialogPrimitive.Description>
            </VisuallyHidden.Root>
            {children}
          </div>
          {footer && <footer className="border-t border-subtle px-5 py-3">{footer}</footer>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
