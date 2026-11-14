import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "../../lib/utils"

// Boutons de console : angles droits, libellé en capitales, aplats sans ombre.
// Un libellé long passe à la ligne plutôt que de déborder d'un panneau étroit.
const buttonVariants = cva(
  "label-caps inline-flex max-w-full items-center justify-center gap-2 border border-transparent text-center transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:border-foreground hover:bg-foreground hover:text-background",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:border-foreground hover:bg-foreground hover:text-background",
        outline:
          "border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
        secondary:
          "border-input bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline underline-offset-4 hover:decoration-2",
      },
      size: {
        default: "min-h-9 px-4 py-1.5 has-[>svg]:px-3",
        sm: "min-h-8 gap-1.5 px-3 py-1 has-[>svg]:px-2.5",
        lg: "min-h-10 px-6 py-2 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
