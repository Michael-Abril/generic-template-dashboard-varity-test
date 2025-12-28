import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const variantStyles = {
  default: "bg-brand-500 text-white hover:bg-brand-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
  outline: "border border-deep-space-300 bg-white text-deep-space-700 hover:bg-deep-space-50 hover:border-deep-space-400 hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]",
  ghost: "text-deep-space-700 hover:bg-deep-space-100 hover:scale-[1.01] active:scale-[0.99]",
  destructive: "bg-error text-white hover:bg-red-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
  secondary: "bg-electric-500 text-white hover:bg-electric-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
};

const sizeStyles = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 text-sm",
  lg: "h-11 px-8 text-lg",
  icon: "h-10 w-10 p-0"
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    return (
      <button
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ''}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
