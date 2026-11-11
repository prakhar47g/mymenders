import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, StatsReport as BarChart3, Check, Download, LogOut, Mail, EditPencil as Pencil, Search, ShieldCheck, Shop as Store, Trash as Trash2 } from 'iconoir-react';
import type { Vendor } from '../types';
import { BrandLogo } from '../components/BrandLogo';
import { MenderEditor } from '../components/MenderEditor';
import { AdminAnalyticsPage } from './AdminAnalyticsPage';
import { useToast } from '../components/ui/toaster';

const api = async (path: string, init?: RequestInit) => { const response = await fetch(`/api/admin/${path}`, { credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } }); if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Request failed'); return response.json(); };

export function AdminPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => { api('auth/me').then((me) => setUsername(me.username)).catch(() => setUsername(null)).finally(() => setChecking(false)); }, []);
  if (checking) return <div className="min-h-screen bg-white p-8 text-sm text-[#777]">Checking admin access…</div>;
  return username ? <AdminShell onLogout={async () => { await api('auth/logout', { method: 'POST' }); setUsername(null); }} /> : <Login onLogin={setUsername} />;
}

function Login({ onLogin }: { onLogin: (username: string) => void }) { const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const submit = async (e: React.FormEvent) => { e.preventDefault(); setError(''); try { const me = await api('auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); onLogin(me.username); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in'); } }; return <div className="flex min-h-screen items-center justify-center bg-[var(--mm-black)] px-5"><form onSubmit={submit} className="w-full max-w-sm bg-[#fafafa] p-8 shadow-2xl"><div className="mb-8 flex items-center gap-3"><ShieldCheck className="h-8 w-8 shrink-0 text-[#777]" aria-hidden="true" /><h1 className="text-3xl">Admin sign in</h1></div><label className="mb-4 block text-sm">Username<input className="mymenders-field mymenders-field--mono mt-1 w-full border px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label><label className="mb-5 block text-sm">Password<input type="password" className="mymenders-field mymenders-field--mono mt-1 w-full border px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>{error && <p role="alert" className="mb-4 text-sm text-[#111]">{error}</p>}<button className="admin-action w-full bg-[var(--mm-black)] px-4 py-3 text-sm text-white hover:bg-[var(--mm-black)]">Sign in</button></form></div>; }

function AdminShell({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const isEditor = /^\/admin\/menders\/\d+/.test(location.pathname);
  const isEmailSubscribers = location.pathname === '/admin/email-subscribers';
  const isAnalytics = location.pathname === '/admin/analytics';
  const mendersActive = !isEmailSubscribers && !isAnalytics;

  return <div className="admin-shell min-h-screen bg-white text-[#111]">
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[var(--mm-black)] px-5 md:px-10">
      <Link to={`/admin${location.search}`} className="admin-action flex items-center gap-3 text-xl mymenders-logo-font text-white">
        <BrandLogo className="h-6 w-6" color="#fff" /><span className="mymenders-logo-wordmark">My Mender</span>
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <button onClick={onLogout} className="admin-action flex items-center gap-2 text-white/50 hover:text-white"><LogOut width={16} height={16} /> Log out</button>
      </div>
    </header>
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="Admin sections">
        <nav className="admin-sidebar__menu" aria-label="Admin">
          <Link to={`/admin${location.search}`} aria-current={mendersActive ? 'page' : undefined}
            className="admin-sidebar__item" data-active={mendersActive}>
            <Store width={16} height={16} aria-hidden="true" /><span>Menders</span>
          </Link>
          <Link to="/admin/email-subscribers" aria-current={isEmailSubscribers ? 'page' : undefined}
            className="admin-sidebar__item" data-active={isEmailSubscribers}>
            <Mail width={16} height={16} aria-hidden="true" /><span>Email Subscribers</span>
          </Link>
          <Link to="/admin/analytics" aria-current={isAnalytics ? 'page' : undefined}
            className="admin-sidebar__item" data-active={isAnalytics}>
            <BarChart3 width={16} height={16} aria-hidden="true" /><span>Analytics</span>
          </Link>
        </nav>
      </aside>
      <div className="admin-content">
        {isEditor ? <AdminEditor /> : isEmailSubscribers
          ? <AdminEmailSubscribers />
          : isAnalytics ? <AdminAnalyticsPage />
          : <AdminList />}
      </div>
    </div>
  </div>;
}

type EmailSubscribersPage = {
  items: { email: string; createdAt: string }[];
  total: number;
};

const formatSubscriberDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

function AdminEmailSubscribers() {
  const [data, setData] = useState<EmailSubscribersPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    api('email-subscribers', { signal: controller.signal })
      .then((result: EmailSubscribersPage) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load email subscribers');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  const downloadCsv = () => {
    if (!data?.items.length) return;
    const csv = data.items
      .map(({ email }) => `"${email.replace(/"/g, '""')}"`)
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'email-subscribers.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-4xl">Email Subscribers</h1>
      <button type="button" onClick={downloadCsv} disabled={loading || !data?.items.length}
        className="admin-action inline-flex items-center gap-2 bg-[var(--mm-black)] px-3 py-2 text-sm text-white hover:bg-[var(--mm-black)] disabled:cursor-not-allowed disabled:opacity-40">
        <Download width={16} height={16} aria-hidden="true" /> Download CSV
      </button>
    </div>
    <section aria-label="Subscriber count" className="mb-6 w-full max-w-xs border border-[#e5e5e5] bg-white px-5 py-4">
      <p className="text-sm text-[#555]">Total subscribers</p>
      <p className="mt-1 text-3xl tabular-nums text-[#111]">{data ? data.total : '—'}</p>
    </section>
    <section aria-label="Subscriber emails" className="border border-[#e5e5e5] bg-white">
      <h2 className="border-b border-[#e5e5e5] px-4 py-3 text-sm text-[#555]">Email addresses</h2>
      {loading ? <p role="status" className="px-4 py-8 text-sm text-[#555]">Loading subscribers…</p>
        : loadError ? <div className="flex flex-wrap items-center gap-4 px-4 py-8">
          <p role="alert" className="text-sm text-[#555]">Unable to load subscribers: {loadError}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="admin-action border border-[#e5e5e5] px-3 py-2 text-sm hover:bg-[#f5f5f5]">Retry</button>
        </div>
        : data?.items.length ? <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-[#e5e5e5] bg-[#f5f5f5] text-[#555]">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Email</th>
                <th scope="col" className="px-4 py-3 font-medium">Date Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5]">
              {data.items.map(({ email, createdAt }) => <tr key={email}>
                <td className="break-all px-4 py-3 text-[#111]">{email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[#555]">
                  <time dateTime={createdAt}>{formatSubscriberDate(createdAt)}</time>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div> : <p className="px-4 py-8 text-sm text-[#555]">No email subscribers yet.</p>}
    </section>
  </main>;
}

type MenderPage = {
  items: Vendor[];
  total: number;
  page: number;
  pageSize: number;
  summary: { total: number; active: number; draft: number };
};
function AdminList() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [data, setData] = useState<MenderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<{ id: number; action: 'activate' | 'delete' } | null>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [reloadKey, setReloadKey] = useState(0);
  const query = searchParams.get('q') || '';
  const status = searchParams.get('status') || 'all';
  const requestedPage = Math.max(1, Number(searchParams.get('page')) || 1);
  const selectedStatuses = status === 'all' ? ['draft', 'active'] : status === 'none' ? [] : [status];

  useEffect(() => { setSearchInput(query); }, [query]);
  useEffect(() => {
    if (searchInput.trim() === query) return;
    const timer = window.setTimeout(() => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (searchInput.trim()) next.set('q', searchInput.trim()); else next.delete('q');
        next.delete('page');
        return next;
      }, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, query, setSearchParams]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    api(`menders?${searchParams.toString()}`, { signal: controller.signal })
      .then((result: MenderPage) => {
        if (controller.signal.aborted) return;
        setData(result);
        if (result.page !== requestedPage) {
          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (result.page === 1) next.delete('page'); else next.set('page', String(result.page));
            return next;
          }, { replace: true });
        }
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load menders'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [location.search, reloadKey]);

  const toggleStatus = (value: 'draft' | 'active') => {
    const nextStatuses = selectedStatuses.includes(value)
      ? selectedStatuses.filter((item) => item !== value)
      : [...selectedStatuses, value];
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextStatuses.length === 2) next.delete('status');
      else next.set('status', nextStatuses[0] || 'none');
      next.delete('page');
      return next;
    });
  };
  const changePage = (page: number) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (page === 1) next.delete('page'); else next.set('page', String(page));
    return next;
  });
  const runAction = async (mender: Vendor, action: 'activate' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Delete ${mender.name}?`)) return;
    setBusy({ id: mender.id, action });
    try {
      await api(`menders/${mender.id}${action === 'activate' ? '/activate' : ''}`, {
        method: action === 'activate' ? 'POST' : 'DELETE',
      });
      toast(action === 'activate' ? `${mender.name} activated` : `${mender.name} deleted`);
      setReloadKey((key) => key + 1);
    } catch (error) {
      toast(error instanceof Error ? error.message : `Unable to ${action} mender`, 'error');
    } finally { setBusy(null); }
  };
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const statusLabel = status === 'all' ? 'All' : status === 'none' ? 'None' : status === 'draft' ? 'Draft' : 'Active';

  return <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-4xl">Menders</h1>
      <div className="relative">
        <button type="button" onClick={() => setIsStatusMenuOpen((open) => !open)}
          className="admin-action flex items-center gap-2 border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#555] hover:bg-[#f5f5f5]"
          aria-expanded={isStatusMenuOpen} aria-controls="admin-status-options">
          Status: {statusLabel}
        </button>
        {isStatusMenuOpen && <div id="admin-status-options" className="absolute right-0 top-full z-20 mt-2 w-40 border border-[#e5e5e5] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.1)]">
          {(['draft', 'active'] as const).map((item) => <label key={item} className="flex min-h-11 cursor-pointer items-center gap-2 px-2 py-2 text-sm hover:bg-[#f5f5f5]">
            <input type="checkbox" className="accent-[var(--mm-black)]" checked={selectedStatuses.includes(item)} onChange={() => toggleStatus(item)} />
            <span className="capitalize">{item}</span>
          </label>)}
        </div>}
      </div>
    </div>
    {data && <section aria-label="Mender summary" className="mb-6 grid grid-cols-3 border border-[#e5e5e5] bg-white">
      {([['Total', data.summary.total], ['Active', data.summary.active], ['Draft', data.summary.draft]] as const).map(([label, count]) =>
        <div key={label} className="border-r border-[#e5e5e5] px-4 py-4 last:border-r-0 md:px-6">
          <p className="text-sm text-[#555]">{label}</p><p className="mt-1 text-2xl tabular-nums text-[#111]">{count}</p>
        </div>)}
    </section>}
    <div className="relative mb-4">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]" aria-hidden="true" />
      <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search menders by name, location or category…" aria-label="Search menders"
        className="mymenders-field mymenders-field--mono w-full rounded-full border bg-white py-2.5 pl-9 pr-4 text-sm text-[#333] placeholder:text-[#777]" />
    </div>
    <div className="overflow-x-auto rounded-lg border border-[#e5e5e5] bg-white">
      {loading ? <p role="status" className="px-4 py-8 text-sm text-[#555]">Loading menders…</p>
        : loadError ? <div className="flex flex-wrap items-center gap-4 px-4 py-8"><p role="alert" className="text-sm text-[#555]">Unable to load menders: {loadError}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)} className="admin-action border border-[#e5e5e5] px-3 py-2 text-sm hover:bg-[#f5f5f5]">Retry</button></div>
        : data?.items.length ? <table className="w-full min-w-[58rem] text-left text-sm">
          <thead className="border-b border-[#e5e5e5] bg-[#f5f5f5] text-[#555]">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Mender</th>
              <th scope="col" className="px-4 py-3 font-medium">Location</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e5e5]">
            {data.items.map((mender) => <tr key={mender.id} className="hover:bg-[#fafafa]">
              <td className="min-w-48 px-4 py-3">
                <p className="font-medium text-[#111]">{mender.name}</p>
                <p className="mt-1 text-xs text-[#777]">{mender.category || 'Mender'}</p>
              </td>
              <td className="max-w-72 px-4 py-3 text-[#555]">{mender.address || 'Location not provided'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${mender.status === 'draft' ? 'border-[#fde68a] bg-[#fef3c7] text-[#92400e]' : 'border-[#bbf7d0] bg-[#dcfce7] text-[#166534]'}`}>
                  {mender.status === 'draft' ? 'Draft' : 'Active'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  {mender.status === 'draft' && <button type="button" disabled={busy?.id === mender.id} onClick={() => void runAction(mender, 'activate')}
                    className="admin-action admin-table-action inline-flex items-center gap-1.5 rounded-md bg-[#15803d] px-3 py-2 text-xs text-white hover:bg-[#166534] disabled:opacity-50"><Check width={14} height={14} /> {busy?.id === mender.id && busy.action === 'activate' ? 'Activating…' : 'Activate'}</button>}
                  <Link to={`/admin/menders/${mender.id}${location.search}`} className="admin-action admin-table-action inline-flex items-center gap-1.5 rounded-md border border-[#e5e5e5] px-3 py-2 text-xs hover:bg-[#f5f5f5]"><Pencil width={14} height={14} /> Edit</Link>
                  <button type="button" disabled={busy?.id === mender.id} onClick={() => void runAction(mender, 'delete')}
                    aria-label={`Delete ${mender.name}`} title={`Delete ${mender.name}`}
                    className="admin-action admin-table-action inline-flex min-w-11 items-center justify-center rounded-md border border-[#e5e5e5] p-2 text-[#555] hover:bg-[#f5f5f5] disabled:opacity-50"><Trash2 width={15} height={15} /></button>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table> : <p className="px-4 py-8 text-sm text-[#555]">{data?.summary.total === 0 ? 'No menders yet.' : 'No menders match your search or statuses.'}</p>}
    </div>
    {!loading && !loadError && data && data.total > 0 && <nav aria-label="Mender pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#555]">
      <p>Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}</p>
      <div className="flex items-center gap-3"><button type="button" disabled={data.page <= 1} onClick={() => changePage(data.page - 1)} className="admin-action border border-[#e5e5e5] px-3 py-2 hover:bg-[#f5f5f5] disabled:opacity-40">Previous</button>
        <span>Page {data.page} of {pageCount}</span>
        <button type="button" disabled={data.page >= pageCount} onClick={() => changePage(data.page + 1)} className="admin-action border border-[#e5e5e5] px-3 py-2 hover:bg-[#f5f5f5] disabled:opacity-40">Next</button></div>
    </nav>}
  </main>;
}

function AdminEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const listUrl = `/admin${location.search}`;
  const [mender, setMender] = useState<Vendor | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setMender(null);
    setLoadError('');
    api(`menders/${id}`, { signal: controller.signal }).then(setMender)
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load mender'); });
    return () => controller.abort();
  }, [id, reloadKey]);
  const save = async (value: Vendor) => {
    setSaving(true);
    try {
      await api(`menders/${id}`, { method: 'PATCH', body: JSON.stringify(value) });
      toast('Changes saved');
      navigate(listUrl);
    } catch (error) { toast(error instanceof Error ? error.message : 'Unable to save changes', 'error'); }
    finally { setSaving(false); }
  };
  const saveVisibility = async (visibility: 'exact' | 'approx') => {
    if (!mender) return;
    setSaving(true);
    try {
      await api(`menders/${id}`, { method: 'PATCH', body: JSON.stringify({ ...mender, location_visibility: visibility }) });
      toast('Location visibility updated');
    } catch (error) { toast(error instanceof Error ? error.message : 'Unable to update location visibility', 'error'); }
    finally { setSaving(false); }
  };
  const activate = async () => {
    setActivating(true);
    try {
      const updated = await api(`menders/${id}/activate`, { method: 'POST' });
      setMender(updated);
      toast('Mender activated');
    } catch (error) { toast(error instanceof Error ? error.message : 'Unable to activate mender', 'error'); }
    finally { setActivating(false); }
  };
  return <main className="mx-auto max-w-5xl px-5 py-8 md:px-10">
    <Link to={listUrl} className="admin-action mb-8 inline-flex items-center gap-2 text-sm text-[#555] hover:text-[#111]"><ArrowLeft width={16} height={16} /> All menders</Link>
    {loadError ? <div className="flex items-center gap-4"><p role="alert" className="text-sm text-[#555]">{loadError}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)} className="admin-action border border-[#e5e5e5] px-3 py-2 text-sm hover:bg-[#f5f5f5]">Retry</button></div>
      : !mender ? <p role="status" className="text-sm text-[#555]">Loading mender…</p>
      : <><div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs uppercase text-[#777]">Mender #{mender.id}</p><h1 className="text-4xl">Edit profile</h1></div>
        {mender.status === 'draft' && <button type="button" disabled={activating || saving} onClick={() => void activate()} className="admin-action rounded-full bg-[var(--mm-black)] px-4 py-2 text-sm text-white hover:bg-[var(--mm-black)] disabled:opacity-50">{activating ? 'Activating…' : 'Activate profile'}</button>}
      </div>
        <div className="border border-[#e5e5e5] bg-white p-5 md:p-8"><MenderEditor value={mender} saving={saving || activating} onSave={save} onVisibilityChange={saveVisibility} onCancel={() => navigate(listUrl)} /></div></>}
  </main>;
}
