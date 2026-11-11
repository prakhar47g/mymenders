import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { ComponentProps } from 'react';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({ className = '', sideOffset = 8, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      sideOffset={sideOffset}
      align="end"
      className={`z-50 w-[min(22rem,calc(100vw-2rem))] border border-[#e5e5e5] bg-white p-4 text-[#111] shadow-[0_10px_24px_rgba(15,23,42,0.1)] outline-none ${className}`}
      {...props}
    />
  </PopoverPrimitive.Portal>;
}
