import { useId } from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground shadow-none transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  {
    variants: {
      size: {
        default: "h-8 px-2.5 py-1.5 text-sm",
        sm: "h-7 rounded-md px-2 text-xs",
        lg: "h-9 px-3 py-2 text-sm",
      },
      state: {
        default: "",
        error: "border-red-600 ring-2 ring-red-500/40 focus-visible:border-red-600 focus-visible:ring-red-500/60",
      },
    },
    defaultVariants: {
      size: "default",
      state: "default",
    },
  },
);

function Input({ className, size, error, ...props }) {
  const errorId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <InputPrimitive
        data-slot="input"
        className={cn(
          inputVariants({ size, state: error ? "error" : "default", className }),
        )}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { Input, inputVariants };
