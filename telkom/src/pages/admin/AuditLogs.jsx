import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { adminApi } from '../../features/admin/api';
import { Badge, Card, DataTable, fmtDate, inputCls, Page, Pager, Query, RoleBadge } from '../../features/admin/kit';

const CATEGORIES = [
  ['', 'Semua aksi'],
  ['auth', 'Login & logout'],
  ['user', 'Pengguna'],
  ['profile', 'Profil'],
  ['role', 'Role & permission'],
  ['settings', 'Pengaturan'],
  ['session', 'Sesi'],
  ['apikey', 'API key'],
  ['backup', 'Backup & restore'],
  ['dev', 'Developer tools'],
  ['edk', 'EDK'],
];

const TONE = {
  auth: 'bg-sky-100 text-sky-700',
  user: 'bg-blue-100 text-blue-700',
  role: 'bg-violet-100 text-violet-700',
  settings: 'bg-amber-100 text-amber-700',
  backup: 'bg-rose-100 text-rose-700',
  edk: 'bg-emerald-100 text-emerald-700',
};

const metaText = (meta) => {
  if (!meta) return '—';
  const text = JSON.stringify(meta);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
};

export default function AuditLogs() {
  const [filters, setFilters] = useState({ q: '', action: '', from: '', to: '' });
  const [page, setPage] = useState(1);

  const params = { ...filters, page };
  const q = useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: () => adminApi.auditLogs(params),
    placeholderData: keepPreviousData,
  });

  const set = (key) => (e) => {
    setFilters({ ...filters, [key]: e.target.value });
    setPage(1);
  };

  return (
    <Page title="Audit Logs" sub="Riwayat perubahan penting dan aktivitas pengguna.">
      <Query q={q}>
        {(d) => (
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
              <label className="relative min-w-52 flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className={`${inputCls} pl-9`} placeholder="Cari aksi, nama, NIP, atau IP…" value={filters.q} onChange={set('q')} />
              </label>
              <select className={`${inputCls} !w-auto`} value={filters.action} onChange={set('action')} aria-label="Kategori aksi">
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input className={`${inputCls} !w-auto`} type="date" value={filters.from} onChange={set('from')} aria-label="Dari tanggal" />
              <input className={`${inputCls} !w-auto`} type="date" value={filters.to} onChange={set('to')} aria-label="Sampai tanggal" />
              {d.scope === 'limited' && (
                <Badge tone="bg-amber-100 text-amber-700">Tampilan terbatas</Badge>
              )}
            </div>

            <DataTable
              rows={d.data}
              empty="Tidak ada aktivitas yang cocok."
              columns={[
                { key: 'created_at', label: 'Waktu', render: (l) => fmtDate(l.created_at), className: 'whitespace-nowrap' },
                {
                  key: 'user',
                  label: 'Pengguna',
                  render: (l) =>
                    l.user ? (
                      <div className="flex items-center gap-2">
                        <span>
                          <b className="font-semibold text-slate-800">{l.user.name}</b>
                          <span className="block text-[11px] text-mute">NIP {l.user.nip ?? '-'}</span>
                        </span>
                        <RoleBadge role={l.user.role} />
                      </div>
                    ) : (
                      <span className="text-mute">Sistem / tidak dikenal</span>
                    ),
                },
                {
                  key: 'action',
                  label: 'Aksi',
                  render: (l) => <Badge tone={TONE[l.action.split('.')[0]]}>{l.action}</Badge>,
                },
                {
                  key: 'subject',
                  label: 'Objek',
                  render: (l) => (l.subject_type ? `${l.subject_type} #${l.subject_id}` : '—'),
                  className: 'whitespace-nowrap',
                },
                {
                  key: 'meta',
                  label: 'Detail',
                  render: (l) => <code className="break-all text-[11px] text-slate-500">{metaText(l.meta)}</code>,
                },
                { key: 'ip_address', label: 'IP', className: 'whitespace-nowrap' },
              ]}
            />
            <Pager page={d.current_page} lastPage={d.last_page} total={d.total} onPage={setPage} />
          </Card>
        )}
      </Query>
    </Page>
  );
}
