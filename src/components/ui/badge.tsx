import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

const variantStyles = {
  default: "bg-blue-600 text-white",
  secondary: "bg-gray-100 text-gray-800",
  destructive: "bg-red-100 text-red-800",
  outline: "border border-gray-300 text-gray-700 bg-transparent",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800"
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";

    return (
      <div
        className={`${baseStyles} ${variantStyles[variant]} ${className || ""}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
