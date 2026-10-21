import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../cn";
import { Loader2 } from "../icons";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-onaccent hover:bg-accenthover active:bg-accentpressed border border-transparent",
  secondary:
    "bg-surface2 text-primary border border-default hover:bg-surface3 active:bg-surface3",
  ghost: "bg-transparent text-secondary hover:bg-surface2 hover:text-primary",
  destructive:
    "bg-transparent text-negative border border-negativesubtle hover:bg-negativesubtle",
  link: "bg-transparent text-accenttext underline-offset-4 hover:underline p-0 h-auto",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-body-sm gap-1.5",
  md: "h-10 px-4 text-body gap-2",
  lg: "h-12 px-5 text-h3 gap-2",
  icon: "h-10 w-10 justify-center",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      loading = false,
      asChild = false,
      iconLeft,
      iconRight,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        disabled={disabled || loading}
        data-loading={loading || undefined}
        className={cn(
          "inline-flex select-none items-center rounded-control font-medium transition-colors duration-fast ease-standard",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variant !== "link" && sizes[size],
          variant === "icon" && "p-0",
          size === "icon" && "w-10 h-10",
          variants[variant],
          className,
        )}
        {...props}
      >
        {(size === "icon" ? false : loading) ? (
          <Loader2 className="animate-spin" size={size === "lg" ? 20 : 16} aria-hidden />
        ) : (
          iconLeft
        )}
        {children}
        {!loading && iconRight}
      </Comp>
    );
  },
);
Button.displayName = "Button";
