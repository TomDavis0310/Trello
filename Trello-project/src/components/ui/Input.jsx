import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground shadow-none transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        default: "h-8 px-2.5 py-1.5 text-sm",
        sm: "h-7 rounded-md px-2 text-xs",
        lg: "h-9 px-3 py-2 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function Input({
  className,
  size,
  ...props
}) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(inputVariants({ size, className }))}
      {...props} />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { Input, inputVariants }
