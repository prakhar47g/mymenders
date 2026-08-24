import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, LogOut, MapPin, Pencil, Search, ShieldCheck } from 'lucide-react';
import type { Vendor } from '../types';
import { BrandLogo } from '../components/BrandLogo';
import { MenderEditor } from '../components/MenderEditor';

const api = async (path: string, init?: RequestInit) => { const response = await fetch(`/api/admin/${path}`, { credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } }); if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Request failed'); return response.json(); };

export function AdminPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => { api('auth/me').then((me) => setUsername(me.username)).catch(() => setUsername(null)).finally(() => setChecking(false)); }, []);
  if (checking) return <div className="min-h-screen bg-white p-8 text-sm text-[#777]">Checking admin access…</div>;
  return username ? <AdminShell onLogout={async () => { await api('auth/logout', { method: 'POST' }); setUsername(null); }} /> : <Login onLogin={setUsername} />;
}

function Login({ onLogin }: { onLogin: (username: string) => void }) { const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const submit = async (e: React.FormEvent) => { e.preventDefault(); setError(''); try { const me = await api('auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); onLogin(me.username); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in'); } }; return <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-5"><form onSubmit={submit} className="w-full max-w-sm bg-[#fafafa] p-8 shadow-2xl"><div className="mb-8 flex items-center gap-3"><ShieldCheck className="h-8 w-8 shrink-0 text-white/40" aria-hidden="true" /><h1 className="text-3xl">Admin sign in</h1></div><label className="mb-4 block text-sm">Username<input className="mymenders-field mymenders-field--mono mt-1 w-full border px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label><label className="mb-5 block text-sm">Password<input type="password" className="mymenders-field mymenders-field--mono mt-1 w-full border px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>{error && <p className="mb-4 text-sm text-[#a04b35]">{error}</p>}<button className="w-full bg-[#0a0a0a] px-4 py-3 text-sm text-white hover:bg-black">Sign in</button></form></div>; }

function AdminShell({ onLogout }: { onLogout: () => void }) { const location = useLocation(); const isEditor = /^\/admin\/menders\/\d+/.test(location.pathname); return <div className="min-h-screen bg-white text-[#111]"><header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-5 md:px-10"><Link to="/admin" className="flex items-center gap-3 text-xl mymenders-logo-font text-white"><BrandLogo className="h-6 w-6" color="#fff" />My Mender <span className="normal-case text-white/40">admin</span></Link><div className="flex items-center gap-4 text-sm"><button onClick={onLogout} className="flex items-center gap-2 text-white/50 hover:text-white"><LogOut size={16} /> Log out</button></div></header>{isEditor ? <AdminEditor /> : <AdminList />}</div>; }

function AdminList() {
  const [menders, setMenders] = useState<Vendor[]>([]);
  const [error, setError] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Array<'draft' | 'active'>>(['draft', 'active']);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const load = () => api('menders').then(setMenders).catch((e) => setError(e.message));

  useEffect(() => { void load(); }, []);

  const activate = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation();
    await api(`menders/${id}/activate`, { method: 'POST' });
    void load();
  };

  const toggleStatus = (status: 'draft' | 'active') => {
    setSelectedStatuses((current) =>
      current.includes(status) ? current.filter((item) => item !== status) : [...current, status],
    );
  };
  const visibleMenders = menders.filter((mender) => {
    const matchesStatus = selectedStatuses.includes(mender.status === 'draft' ? 'draft' : 'active');
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || [mender.name, mender.address, mender.category].some((field) => field?.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  return <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
    <div className="mb-8 flex items-center justify-between gap-4">
      <h1 className="text-4xl">Menders</h1>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsStatusMenuOpen((open) => !open)}
          className="flex items-center gap-2 border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#555] hover:bg-[#f5f5f5]"
          aria-expanded={isStatusMenuOpen}
          aria-haspopup="true"
        >
          Status
        </button>
        {isStatusMenuOpen && <div className="absolute right-0 top-full z-20 mt-2 w-40 border border-[#e5e5e5] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.1)]">
          {(['draft', 'active'] as const).map((status) => <label key={status} className="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm hover:bg-[#f5f5f5]">
            <input type="checkbox" checked={selectedStatuses.includes(status)} onChange={() => toggleStatus(status)} />
            <span className="capitalize">{status}</span>
          </label>)}
        </div>}
      </div>
    </div>
    {error && <p className="mb-4 text-sm text-[#a04b35]">{error}</p>}
    <div className="relative mb-4">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a877d]" aria-hidden="true" />
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search menders by name, location or category…"
        aria-label="Search menders"
        className="w-full rounded-full border border-[#e5e5e5] bg-white py-2.5 pl-9 pr-4 text-sm text-[#333] placeholder:text-[#999] focus:border-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-black/15"
      />
    </div>
    <div className="overflow-hidden border border-[#e5e5e5] bg-white">
      {visibleMenders.map((mender) => <Link key={mender.id} to={`/admin/menders/${mender.id}`} className="flex min-h-[86px] items-center justify-between gap-4 border-b border-[#f0f0f0] px-4 py-3 transition-colors last:border-0 hover:bg-[#f9f9f9]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="truncate text-base">{mender.name}</h2>
            {mender.status === 'draft' && <span className="shrink-0 border border-[#333] px-2 py-1 text-[10px] uppercase text-[#555]">draft</span>}
          </div>
          <p className="mt-1 flex items-center gap-1 truncate text-sm text-[#777]"><MapPin size={14} /> {mender.address || 'Location not provided'} · {mender.category || 'Mender'}</p>
        </div>
        {mender.status === 'draft' && <button type="button" onClick={(e) => activate(e, mender.id)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-3.5 py-2 text-xs text-white hover:bg-black"><Check size={14} /> Activate</button>}
        {mender.status !== 'draft' && <Pencil size={17} className="shrink-0 text-[#bbb]" />}
      </Link>)}
      {!visibleMenders.length && <p className="px-4 py-8 text-sm text-[#999]">No menders match your search or statuses.</p>}
    </div>
  </main>;
}

function AdminEditor() { const { id } = useParams(); const navigate = useNavigate(); const [mender, setMender] = useState<Vendor | null>(null); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const load = () => api(`menders/${id}`).then(setMender).catch((e) => setError(e.message)); useEffect(() => { void load(); }, [id]); if (error) return <main className="p-10">{error}</main>; if (!mender) return <main className="p-10 text-sm text-[#999]">Loading mender…</main>; const save = async (value: Vendor) => { setSaving(true); try { setMender(await api(`menders/${id}`, { method: 'PATCH', body: JSON.stringify(value) })); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save'); } finally { setSaving(false); } }; const activate = async () => { setMender(await api(`menders/${id}/activate`, { method: 'POST' })); }; return <main className="mx-auto max-w-5xl px-5 py-8 md:px-10"><Link to="/admin" className="mb-8 inline-flex items-center gap-2 text-sm text-[#777] hover:text-[#111]"><ArrowLeft size={16} /> All menders</Link><div className="mb-8 flex items-start justify-between gap-4"><div><p className="mb-2 text-xs uppercase text-[#777]">Mender #{mender.id}</p><h1 className="text-4xl">Edit profile</h1></div>{mender.status === 'draft' && <button onClick={activate} className="rounded-full bg-[#0a0a0a] px-4 py-2 text-sm text-white hover:bg-black">Activate profile</button>}</div><div className="border border-[#e5e5e5] bg-white p-5 md:p-8"><MenderEditor value={mender} saving={saving} onSave={save} onCancel={() => navigate('/admin')} /></div></main>; }
