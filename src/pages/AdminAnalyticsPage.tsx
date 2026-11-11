import { useEffect, useMemo, useState } from 'react';
import { flexRender, type SortingState } from '@tanstack/react-table';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

type MenderClickTotals = {
  id: number;
  name: string;
  profileOpens: number;
  phoneClicks: number;
  emailClicks: number;
  socialClicks: number;
  websiteClicks: number;
};

type AnalyticsResponse = { items: MenderClickTotals[]; from: string | null; to: string | null };

const formatMonth = (month: string) => {
  const [year, value] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, value - 1, 1)));
};

const count = new Intl.NumberFormat();

export function AdminAnalyticsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [rangeMode, setRangeMode] = useState<'all' | 'months'>('all');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'totalClicks', desc: true },
    { id: 'name', desc: false },
  ]);
  const query = useMemo(() => {
    if (!from || !to) return '';
    return `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  }, [from, to]);

  const handleRangeOpenChange = (open: boolean) => {
    if (open) {
      setRangeMode(from && to ? 'months' : 'all');
      setDraftFrom(from);
      setDraftTo(to);
    }
    setRangeOpen(open);
  };

  const applyRange = () => {
    if (rangeMode === 'all') {
      setFrom('');
      setTo('');
    } else if (draftFrom && draftTo && draftFrom <= draftTo) {
      setFrom(draftFrom);
      setTo(draftTo);
    } else {
      return;
    }
    setRangeOpen(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    fetch(`/api/admin/analytics${query}`, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Unable to load analytics');
        return result as AnalyticsResponse;
      })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load analytics');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, reloadKey]);

  const columns = useMemo<LegacyColumnDef<MenderClickTotals>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Mender',
      cell: ({ row }) => <Link to={`/admin/menders/${row.original.id}`} className="font-medium text-[#111] underline decoration-[#bbb] underline-offset-4 hover:decoration-[#111]">{row.original.name}</Link>,
    },
    { accessorKey: 'profileOpens', header: 'Profile opens' },
    { accessorKey: 'phoneClicks', header: 'Phone clicks' },
    { accessorKey: 'emailClicks', header: 'Email clicks' },
    { accessorKey: 'socialClicks', header: 'Social clicks' },
    { accessorKey: 'websiteClicks', header: 'Website clicks' },
    {
      id: 'totalClicks',
      accessorFn: (row) => row.profileOpens + row.phoneClicks + row.emailClicks + row.socialClicks + row.websiteClicks,
      header: 'Total clicks',
      enableHiding: false,
    },
  ], []);

  const table = useLegacyTable({
    data: data?.items || [],
    columns,
    state: { sorting, columnVisibility: { totalClicks: false } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  const rangeLabel = from && to
    ? `${formatMonth(from)} – ${formatMonth(to)}`
    : 'All time';

  return <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-[#777]">Engagement</p>
        <h1 className="text-4xl">Analytics</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={rangeOpen} onOpenChange={handleRangeOpenChange}>
          <PopoverTrigger asChild>
            <button type="button" className="admin-action inline-flex items-center gap-2 border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#333] hover:bg-[#f5f5f5]" aria-label={`Analytics time range: ${rangeLabel}`}>
              <CalendarDays size={16} aria-hidden="true" />
              <span>{rangeLabel}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent aria-label="Choose analytics month range">
            <div className="mb-3">
              <h2 className="text-sm font-medium">Time range</h2>
              <p className="mt-1 text-xs leading-5 text-[#777]">Choose a period for these click totals.</p>
            </div>
            <div role="radiogroup" aria-label="Analytics time range" className="mb-4 grid grid-cols-2 gap-2">
              {([
                ['all', 'All time'],
                ['months', 'Month range'],
              ] as const).map(([value, label]) => <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-sm ${rangeMode === value ? 'border-[#0a0a0a] bg-[#f5f5f5] text-[#111]' : 'border-[#e5e5e5] text-[#555] hover:bg-[#fafafa]'}`}>
                <input type="radio" name="analytics-time-range" value={value} checked={rangeMode === value} onChange={() => setRangeMode(value)} className="accent-[#0a0a0a]" />
                <span>{label}</span>
              </label>)}
            </div>
            {rangeMode === 'months' && <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-[#555]">From month
                  <input type="month" value={draftFrom} onChange={(event) => setDraftFrom(event.target.value)} className="mymenders-field mymenders-field--mono mt-1 w-full border border-[#e5e5e5] bg-white px-2 py-2 text-sm text-[#111]" />
                </label>
                <label className="block text-xs text-[#555]">To month
                  <input type="month" value={draftTo} onChange={(event) => setDraftTo(event.target.value)} className="mymenders-field mymenders-field--mono mt-1 w-full border border-[#e5e5e5] bg-white px-2 py-2 text-sm text-[#111]" />
                </label>
              </div>
              {draftFrom && draftTo && draftFrom > draftTo && <p role="alert" className="mt-3 text-xs text-[#555]">From month must be on or before to month.</p>}
              {Boolean(draftFrom) !== Boolean(draftTo) && <p role="status" className="mt-3 text-xs text-[#555]">Choose both boundary months.</p>}
            </>}
            <div className="mt-4 flex justify-end gap-2 border-t border-[#e5e5e5] pt-3">
              <button type="button" onClick={() => setRangeOpen(false)} className="admin-action border border-[#e5e5e5] px-3 py-2 text-sm text-[#555] hover:bg-[#f5f5f5]">Cancel</button>
              <button type="button" onClick={applyRange} disabled={rangeMode === 'months' && (!draftFrom || !draftTo || draftFrom > draftTo)} className="admin-action bg-[#0a0a0a] px-3 py-2 text-sm text-white hover:bg-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40">Apply</button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>

    <section aria-label="Mender click totals" className="overflow-hidden border border-[#e5e5e5] bg-white">
      {loading ? <div role="status" className="space-y-3 px-4 py-6">
        <span className="sr-only">Loading analytics…</span>
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-8 animate-pulse bg-[#f5f5f5]" />)}
      </div> : loadError ? <div className="flex flex-wrap items-center gap-4 px-4 py-8">
        <p role="alert" className="text-sm text-[#555]">Unable to load analytics: {loadError}</p>
        <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="admin-action border border-[#e5e5e5] px-3 py-2 text-sm hover:bg-[#f5f5f5]">Retry</button>
      </div> : data?.items.length ? <div className="overflow-x-auto">
        <Table className="min-w-[58rem] text-left">
          <TableHeader className="bg-[#f5f5f5]">
            {table.getHeaderGroups().map((headerGroup) => <TableRow key={headerGroup.id} className="hover:bg-[#f5f5f5]">
              {headerGroup.headers.map((header) => <TableHead key={header.id} className={header.column.id === 'name' ? 'min-w-52' : 'whitespace-nowrap text-right'}>
                {header.isPlaceholder ? null : header.column.getCanSort()
                  ? <button type="button" onClick={header.column.getToggleSortingHandler()} className="inline-flex min-h-10 items-center gap-1.5 hover:text-[#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() ? <span aria-hidden="true">{header.column.getIsSorted() === 'asc' ? '↑' : '↓'}</span> : <ChevronsUpDown size={13} aria-hidden="true" />}
                  </button>
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>)}
            </TableRow>)}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => <TableCell key={cell.id} className={cell.column.id === 'name' ? 'text-[#111]' : 'text-right tabular-nums text-[#333]'}>
                {typeof cell.getValue() === 'number' ? count.format(cell.getValue<number>()) : flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>)}
            </TableRow>)}
          </TableBody>
        </Table>
      </div> : <p className="px-4 py-10 text-center text-sm text-[#555]">No active menders to show.</p>}
    </section>

    {!loading && !loadError && data?.items.length ? <nav aria-label="Analytics table pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#555]">
      <p>Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.items.length)} of {data.items.length}</p>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="admin-action inline-flex min-w-11 items-center justify-center border border-[#e5e5e5] hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span className="min-w-20 text-center">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
        <button type="button" aria-label="Next page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="admin-action inline-flex min-w-11 items-center justify-center border border-[#e5e5e5] hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </nav> : null}
  </main>;
}
