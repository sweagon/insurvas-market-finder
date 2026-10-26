import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../cn";

export const TooltipProvider = TooltipPrimitive.Provider;

/** Glass tooltip, 80ms open delay, never holds interactive content (D.2). */
export function Tooltip({
  children,
  content,
  side = "top",
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipPrimitive.Root delayDuration={80}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            "glass l3 anim-pop z-tooltip max-w-xs rounded-control px-2.5 py-1.5 text-caption text-primary",
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
