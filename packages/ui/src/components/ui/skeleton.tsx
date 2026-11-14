import * as React from "react"

import { cn } from "../../lib/utils"

/** Décoratif : l'état de chargement est annoncé par le composant DataState. Un reflet le traverse. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("shimmer bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
