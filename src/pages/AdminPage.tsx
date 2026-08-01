import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, LogOut, MapPin, Pencil, ShieldCheck } from 'lucide-react';
import type { Vendor } from '../types';
import { MenderEditor } from '../components/MenderEditor';

const api = async (path: string, init?: RequestInit) => { const response = await fetch(`/api/admin/${path}`, { credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } }); if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Request failed'); return response.json(); };

export function AdminPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => { api('auth/me').then((me) => setUsername(me.username)).catch(() => setUsername(null)).finally(() => setChecking(false)); }, []);
  if (checking) return <div className="min-h-screen bg-[#f5f6f8] p-8 text-sm text-[#68665f]">Checking admin access…</div>;
  return username ? <AdminShell username={username} onLogout={async () => { await api('auth/logout', { method: 'POST' }); setUsername(null); }} /> : <Login onLogin={setUsername} />;
}

function Login({ onLogin }: { onLogin: (username: string) => void }) { const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const submit = async (e: React.FormEvent) => { e.preventDefault(); setError(''); try { const me = await api('auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); onLogin(me.username); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in'); } }; return <div className="flex min-h-screen items-center justify-center bg-[#202824] px-5"><form onSubmit={submit} className="w-full max-w-sm bg-[#fafafa] p-8 shadow-2xl"><div className="mb-8"><ShieldCheck className="mb-5 h-8 w-8 text-[#6eb7b0]" /><p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#68665f]">My Mender / private workspace</p><h1 className="text-3xl">Admin sign in</h1></div><label className="mb-4 block text-sm">Username<input className="mymenders-field mt-1 w-full border px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label><label className="mb-5 block text-sm">Password<input type="password" className="mymenders-field mt-1 w-full border px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>{error && <p className="mb-4 text-sm text-[#a04b35]">{error}</p>}<button className="w-full bg-[#1f241f] px-4 py-3 text-sm font-medium text-white">Sign in</button></form></div>; }

function AdminShell({ username, onLogout }: { username: string; onLogout: () => void }) { const location = useLocation(); const isEditor = /^\/admin\/menders\/\d+/.test(location.pathname); return <div className="min-h-screen bg-[#f5f6f8] text-[#171b17]"><header className="flex h-16 items-center justify-between border-b border-[#dfe3e4] bg-[#fafafa] px-5 md:px-10"><Link to="/admin" className="text-xl tracking-tight mymenders-logo-font">My Mender <span className="text-[#8a877d]">/ Admin</span></Link><div className="flex items-center gap-4 text-sm"><span className="hidden text-[#68665f] sm:inline">{username}</span><button onClick={onLogout} className="flex items-center gap-2 text-[#68665f] hover:text-[#171b17]"><LogOut size={16} /> Log out</button></div></header>{isEditor ? <AdminEditor /> : <AdminList />}</div>; }

function AdminList() {
  const [menders, setMenders] = useState<Vendor[]>([]);
  const [error, setError] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Array<'draft' | 'active'>>(['draft', 'active']);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
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
  const visibleMenders = menders.filter((mender) =>
    selectedStatuses.includes(mender.status === 'draft' ? 'draft' : 'active'),
  );

  return <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
    <div className="mb-8 flex items-center justify-between gap-4">
      <h1 className="text-4xl">Menders</h1>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsStatusMenuOpen((open) => !open)}
          className="flex items-center gap-2 border border-[#dfe3e4] bg-white px-3 py-2 text-sm text-[#3d403b] hover:bg-[#f7faf9]"
          aria-expanded={isStatusMenuOpen}
          aria-haspopup="true"
        >
          Status
        </button>
        {isStatusMenuOpen && <div className="absolute right-0 top-full z-20 mt-2 w-40 border border-[#dfe3e4] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.1)]">
          {(['draft', 'active'] as const).map((status) => <label key={status} className="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm hover:bg-[#f7faf9]">
            <input type="checkbox" checked={selectedStatuses.includes(status)} onChange={() => toggleStatus(status)} />
            <span className="capitalize">{status}</span>
          </label>)}
        </div>}
      </div>
    </div>
    {error && <p className="mb-4 text-sm text-[#a04b35]">{error}</p>}
    <div className="overflow-hidden border border-[#dfe3e4] bg-white">
      {visibleMenders.map((mender) => <Link key={mender.id} to={`/admin/menders/${mender.id}`} className="flex min-h-[86px] items-center justify-between gap-4 border-b border-[#e9ecec] px-4 py-3 transition-colors last:border-0 hover:bg-[#f7faf9]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="mymenders-admin-row-title truncate text-base">{mender.name}</h2>
            {mender.status === 'draft' && <span className="shrink-0 bg-[#f9e8d7] px-2 py-1 text-[10px] font-normal uppercase tracking-wider text-[#9b5f1d]">draft</span>}
          </div>
          <p className="mt-1 flex items-center gap-1 truncate text-sm text-[#68665f]"><MapPin size={14} /> {mender.address || 'Location not provided'} · {mender.category || 'Mender'}</p>
        </div>
        {mender.status === 'draft' && <button type="button" onClick={(e) => activate(e, mender.id)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#1f241f] px-3.5 py-2 text-xs text-white"><Check size={14} /> Activate</button>}
        {mender.status !== 'draft' && <Pencil size={17} className="shrink-0 text-[#8a877d]" />}
      </Link>)}
      {!visibleMenders.length && <p className="px-4 py-8 text-sm text-[#68665f]">No menders match these statuses.</p>}
    </div>
  </main>;
}

function AdminEditor() { const { id } = useParams(); const navigate = useNavigate(); const [mender, setMender] = useState<Vendor | null>(null); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const load = () => api(`menders/${id}`).then(setMender).catch((e) => setError(e.message)); useEffect(() => { void load(); }, [id]); if (error) return <main className="p-10">{error}</main>; if (!mender) return <main className="p-10 text-sm text-[#68665f]">Loading mender…</main>; const save = async (value: Vendor) => { setSaving(true); try { setMender(await api(`menders/${id}`, { method: 'PATCH', body: JSON.stringify(value) })); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save'); } finally { setSaving(false); } }; const activate = async () => { setMender(await api(`menders/${id}/activate`, { method: 'POST' })); }; return <main className="mx-auto max-w-5xl px-5 py-8 md:px-10"><Link to="/admin" className="mb-8 inline-flex items-center gap-2 text-sm text-[#68665f] hover:text-[#171b17]"><ArrowLeft size={16} /> All menders</Link><div className="mb-8 flex items-start justify-between gap-4"><div><p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#68665f]">Mender #{mender.id}</p><h1 className="text-4xl">Edit profile</h1></div>{mender.status === 'draft' && <button onClick={activate} className="rounded-full bg-[#6eb7b0] px-4 py-2 text-sm font-medium text-[#17312d]">Activate profile</button>}</div><div className="border border-[#dfe3e4] bg-white p-5 md:p-8"><MenderEditor value={mender} saving={saving} onSave={save} onCancel={() => navigate('/admin')} /></div></main>; }
