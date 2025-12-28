import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    const baseStyles = "flex h-10 w-full rounded-lg border border-deep-space-300 bg-white px-3 py-2 text-sm text-deep-space-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-deep-space-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-deep-space-50 transition-colors";

    return (
      <input
        type={type}
        className={`${baseStyles} ${className || ''}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
