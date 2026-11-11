import type { ComponentProps } from 'react';

export function Table(props: ComponentProps<'table'>) {
  return <table {...props} className={`w-full caption-bottom text-sm ${props.className || ''}`} />;
}

export function TableHeader(props: ComponentProps<'thead'>) {
  return <thead {...props} className={`[&_tr]:border-b [&_tr]:border-[#e5e5e5] ${props.className || ''}`} />;
}

export function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody {...props} className={`[&_tr:last-child]:border-0 ${props.className || ''}`} />;
}

export function TableRow(props: ComponentProps<'tr'>) {
  return <tr {...props} className={`border-b border-[#e5e5e5] transition-colors hover:bg-[#fafafa] ${props.className || ''}`} />;
}

export function TableHead(props: ComponentProps<'th'>) {
  return <th {...props} className={`h-11 px-4 text-left align-middle font-medium text-[#555] ${props.className || ''}`} />;
}

export function TableCell(props: ComponentProps<'td'>) {
  return <td {...props} className={`px-4 py-3 align-middle ${props.className || ''}`} />;
}
