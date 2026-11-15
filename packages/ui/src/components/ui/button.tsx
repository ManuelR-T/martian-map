import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "../../lib/utils"

// Boutons de console : angles droits, libellé en capitales. L'action principale
// rayonne, les autres restent en retrait. Hauteur de 44 px par défaut, pour une
// main gantée ; un libellé long passe à la ligne plutôt que de déborder.
const buttonVariants = cva(
  "label-caps inline-flex max-w-full items-center justify-center gap-2 border border-transparent text-center transition-[color,background-color,border-color,box-shadow,translate] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground shadow-glow hover:border-[color-mix(in_oklab,var(--primary),var(--foreground)_22%)] hover:bg-[color-mix(in_oklab,var(--primary),var(--foreground)_22%)]",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:border-[color-mix(in_oklab,var(--destructive),var(--foreground)_22%)] hover:bg-[color-mix(in_oklab,var(--destructive),var(--foreground)_22%)]",
        outline:
          "border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-glow",
        secondary:
          "border-input bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline underline-offset-4 hover:decoration-2",
      },
      size: {
        default: "min-h-11 px-5 py-2 has-[>svg]:px-4",
        sm: "min-h-10 gap-1.5 px-3.5 py-1.5 has-[>svg]:px-3",
        lg: "min-h-12 px-7 py-2.5 has-[>svg]:px-5",
        icon: "size-11",
        "icon-sm": "size-10",
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
