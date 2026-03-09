import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.22em]',
  {
    variants: {
      variant: {
        default: 'border-white/15 bg-white/10 text-stone-100',
        success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
        warning: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
        destructive: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge, badgeVariants }
