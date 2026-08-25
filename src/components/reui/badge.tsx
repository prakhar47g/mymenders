import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/src/lib/utils"

const badgeVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center w-fit border border-oklch(0.922 0 0) border-transparent whitespace-nowrap outline-none transition-shadow dark:border-oklch(1 0 0 / 10%)",
    "focus-visible:ring-2 focus-visible:ring-oklch(0.708 0 0) focus-visible:ring-offset-1 focus-visible:ring-offset-oklch(1 0 0) disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-oklch(0.556 0 0) dark:focus-visible:ring-offset-oklch(0.145 0 0)",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3",
  ],
  {
    variants: {
      variant: {
        default: "bg-oklch(0.205 0 0) text-oklch(0.985 0 0) dark:bg-oklch(0.922 0 0) dark:text-oklch(0.205 0 0)",
        outline: "border-oklch(0.922 0 0) bg-transparent dark:bg-oklch(0.922 0 0)/32 dark:border-oklch(1 0 0 / 10%) dark:dark:bg-oklch(1 0 0 / 15%)/32",
        secondary: "bg-oklch(0.97 0 0) text-oklch(0.205 0 0) dark:bg-oklch(0.269 0 0) dark:text-oklch(0.985 0 0)",
        info: "bg-info text-white",
        success: "bg-success text-white",
        warning: "bg-warning text-white",
        destructive: "bg-oklch(0.577 0.245 27.325) text-white dark:bg-oklch(0.704 0.191 22.216)",
        focus: "bg-focus text-focus-foreground",
        invert: "bg-invert text-invert-foreground",
        "primary-light":
          "border-oklch(0.205 0 0)/10 bg-oklch(0.205 0 0)/10 text-oklch(0.205 0 0) dark:border-oklch(0.205 0 0)/25 dark:bg-oklch(0.205 0 0)/15 dark:text-oklch(0.205 0 0) dark:border-oklch(0.922 0 0)/10 dark:bg-oklch(0.922 0 0)/10 dark:text-oklch(0.922 0 0) dark:dark:border-oklch(0.922 0 0)/25 dark:dark:bg-oklch(0.922 0 0)/15 dark:dark:text-oklch(0.922 0 0)",
        "warning-light":
          "border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning",
        "success-light":
          "border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success",
        "info-light":
          "border-info/15 bg-info/10 text-info-foreground dark:border-info/25 dark:bg-info/15 dark:text-info",
        "destructive-light":
          "border-oklch(0.577 0.245 27.325)/15 bg-oklch(0.577 0.245 27.325)/10 text-destructive-foreground dark:border-oklch(0.577 0.245 27.325)/25 dark:bg-oklch(0.577 0.245 27.325)/15 dark:text-oklch(0.577 0.245 27.325) dark:border-oklch(0.704 0.191 22.216)/15 dark:bg-oklch(0.704 0.191 22.216)/10 dark:dark:border-oklch(0.704 0.191 22.216)/25 dark:dark:bg-oklch(0.704 0.191 22.216)/15 dark:dark:text-oklch(0.704 0.191 22.216)",
        "invert-light":
          "border-invert/15 bg-invert/10 text-oklch(0.145 0 0) dark:border-invert/45 dark:bg-invert/35 dark:text-invert-foreground dark:text-oklch(0.985 0 0)",
        "focus-light":
          "border-focus/15 bg-focus/10 text-focus-foreground dark:border-focus/25 dark:bg-focus/15 dark:text-focus",
        "primary-outline":
          "bg-oklch(1 0 0) border-oklch(0.922 0 0) text-oklch(0.205 0 0) dark:bg-oklch(0.922 0 0)/30 dark:bg-oklch(0.145 0 0) dark:border-oklch(1 0 0 / 10%) dark:text-oklch(0.922 0 0) dark:dark:bg-oklch(1 0 0 / 15%)/30",
        "warning-outline":
          "bg-oklch(1 0 0) border-oklch(0.922 0 0) text-warning-foreground dark:bg-oklch(0.922 0 0)/30 dark:bg-oklch(0.145 0 0) dark:border-oklch(1 0 0 / 10%) dark:dark:bg-oklch(1 0 0 / 15%)/30",
        "success-outline":
          "bg-oklch(1 0 0) border-oklch(0.922 0 0) text-success-foreground dark:bg-oklch(0.922 0 0)/30 dark:bg-oklch(0.145 0 0) dark:border-oklch(1 0 0 / 10%) dark:dark:bg-oklch(1 0 0 / 15%)/30",
        "info-outline":
          "bg-oklch(1 0 0) border-oklch(0.922 0 0) text-info-foreground dark:bg-oklch(0.922 0 0)/30 dark:bg-oklch(0.145 0 0) dark:border-oklch(1 0 0 / 10%) dark:dark:bg-oklch(1 0 0 / 15%)/30",
        "destructive-outline":
          "bg-oklch(1 0 0) border-oklch(0.922 0 0) text-destructive-foreground dark:bg-oklch(0.922 0 0)/30 dark:bg-oklch(0.145 0 0) dark:border-oklch(1 0 0 / 10%) dark:dark:bg-oklch(1 0 0 / 15%)/30",
        "invert-outline":
          "bg-oklch(1 0 0) border-oklch(0.922 0 0) text-invert-foreground dark:bg-oklch(0.922 0 0)/30 dark:bg-oklch(0.145 0 0) dark:border-oklch(1 0 0 / 10%) dark:dark:bg-oklch(1 0 0 / 15%)/30",
        "focus-outline":
          "bg-oklch(1 0 0) border-oklch(0.922 0 0) text-focus-foreground dark:bg-oklch(0.922 0 0)/30 dark:bg-oklch(0.145 0 0) dark:border-oklch(1 0 0 / 10%) dark:dark:bg-oklch(1 0 0 / 15%)/30",
      },
      size: {
        xs: "px-1 py-0.25 text-[0.6rem] leading-none h-4 min-w-4 gap-1",
        sm: "px-1 py-0.25 text-[0.625rem] leading-none h-4.5 min-w-4.5 gap-1",
        default: "px-1.25 py-0.5 text-xs h-5 min-w-5 gap-1",
        lg: "px-1.5 py-0.5 text-xs h-5.5 min-w-5.5 gap-1",
        xl: "px-2 py-0.75 text-sm h-6 min-w-6 gap-1.5",
      },
      /** `default`: active style radius. `full`: pill radius. */
      radius: {
        default:
          "rounded-sm",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      radius: "default",
    },
  }
)

interface BadgeProps extends useRender.ComponentProps<"span"> {
  variant?: VariantProps<typeof badgeVariants>["variant"]
  size?: VariantProps<typeof badgeVariants>["size"]
  radius?: VariantProps<typeof badgeVariants>["radius"]
}

function Badge({
  className,
  variant,
  size,
  radius,
  render,
  ...props
}: BadgeProps) {
  const defaultProps = {
    "data-slot": "badge",
    className: cn(badgeVariants({ variant, size, radius, className })),
  }

  return useRender({
    defaultTagName: "span",
    render,
    props: mergeProps<"span">(defaultProps, props),
  })
}

export { Badge, badgeVariants, type BadgeProps }