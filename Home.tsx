import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-brand-light text-white hover:bg-brand-dark shadow-sm": variant === "primary",
            "bg-brand-dark text-white hover:bg-brand-dark/90": variant === "secondary",
            "border-2 border-brand-light bg-transparent text-brand-dark hover:bg-brand-light/10": variant === "outline",
            "hover:bg-brand-light/10 text-brand-dark": variant === "ghost",
            "text-brand-light underline-offset-4 hover:underline": variant === "link",
            "h-9 px-4 py-2 text-sm": size === "sm",
            "h-11 px-6 py-2": size === "md",
            "h-14 px-8 text-lg": size === "lg",
            "h-11 w-11": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
