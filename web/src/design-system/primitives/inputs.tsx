import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../cn";
import { Check, Minus, Search, X } from "../icons";

/* -------------------------------------------------------------------- input */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: ReactNode;
  error?: string;
  hint?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ iconLeft, error, hint, className, id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      <div className="relative flex items-center">
        {iconLeft && (
          <span className="pointer-events-none absolute left-3 text-tertiary">{iconLeft}</span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-control w-full rounded-control border border-default bg-surface1 px-3 text-body text-primary placeholder:text-tertiary",
            "focus-visible:border-accentborder focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focusring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            iconLeft && "pl-9",
            error && "border-negative",
            className,
          )}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-caption text-negative">{error}</p>
      ) : (
        hint && <p className="text-caption text-tertiary">{hint}</p>
      )}
    </div>
  ),
);
Input.displayName = "Input";

/** Search input with a keyboard-hint badge (R2). */
export const SearchInput = forwardRef<
  HTMLInputElement,
  InputProps & { keyHint?: string; onClear?: () => void }
>(({ keyHint, onClear, value, className, ...props }, ref) => (
  <div className="relative flex items-center">
    <Search size={16} className="pointer-events-none absolute left-3 text-tertiary" aria-hidden />
    <input
      ref={ref}
      type="search"
      value={value}
      className={cn(
        "h-control w-full rounded-control border border-default bg-surface1 pl-9 pr-9 text-body text-primary placeholder:text-tertiary",
        "focus-visible:border-accentborder focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focusring",
        className,
      )}
      {...props}
    />
    {value ? (
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear search"
        className="absolute right-2 rounded p-1 text-tertiary hover:text-primary"
      >
        <X size={14} aria-hidden />
      </button>
    ) : (
      keyHint && (
        <kbd className="pointer-events-none absolute right-2 rounded border border-default px-1.5 py-0.5 font-mono text-[10px] text-tertiary">
          {keyHint}
        </kbd>
      )
    )}
  </div>
));
SearchInput.displayName = "SearchInput";

/* ------------------------------------------------------------------- toggles */

export function Switch({
  checked,
  onCheckedChange,
  id,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      id={id}
      aria-label={ariaLabel}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-pill border border-default bg-surface3 transition-colors duration-fast after:absolute after:-inset-2.5 after:content-['']",
        "data-[state=checked]:border-transparent data-[state=checked]:bg-accent",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
      )}
    >
      <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-0.5 rounded-pill bg-white shadow transition-transform duration-fast data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );
}

export function Checkbox({
  checked,
  indeterminate,
  onCheckedChange,
  "aria-label": ariaLabel,
  className,
}: {
  checked: boolean | "indeterminate";
  indeterminate?: boolean;
  onCheckedChange: (v: boolean) => void;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <CheckboxPrimitive.Root
      checked={indeterminate ? "indeterminate" : checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      aria-label={ariaLabel}
      className={cn(
        "relative flex h-5 w-5 items-center justify-center rounded-[5px] border border-strong bg-surface1",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-onaccent",
        "data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-onaccent",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
        className,
      )}
    >
      <CheckboxPrimitive.Indicator>
        {indeterminate ? <Minus size={14} aria-hidden /> : <Check size={14} aria-hidden />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export const RadioGroup = RadioGroupPrimitive.Root;
export const RadioItem = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof RadioGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "flex h-5 w-5 items-center justify-center rounded-pill border border-strong bg-surface1",
      "data-[state=checked]:border-accent data-[state=checked]:bg-accent",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focusring",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="h-2 w-2 rounded-pill bg-onaccent" />
    {children}
  </RadioGroupPrimitive.Item>
));
RadioItem.displayName = "RadioItem";
