import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, LogIn, MonitorSmartphone, ShieldAlert, ShieldCheck, UserX } from 'lucide-react';
import { adminApi } from '../../features/admin/api';
import { Badge, Btn, Card, DataTable, errText, fmtDate, Notice, Page, Query, RoleBadge, Stat } from '../../features/admin/kit';

export default function Security() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ['admin', 'security'], queryFn: adminApi.security });
  const sessions = useQuery({ queryKey: ['admin', 'sessions'], queryFn: adminApi.sessions });
  const [msg, setMsg] = useState(null);

  const revoke = useMutation({
    mutationFn: (id) => adminApi.revokeSession(id),
    onSuccess: (res) => {
      setMsg({ tone: 'ok', text: res.message });
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
  });

  return (
    <Page title="Security Center" sub="Pantau percobaan login, sesi aktif, dan peristiwa keamanan.">
      <Query q={overview}>
        {(d) => (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <Stat icon={ShieldAlert} label="Login gagal 24 jam" value={d.failed_logins_24h} tone="text-rose-600 bg-rose-50" />
              <Stat icon={ShieldAlert} label="Login gagal 7 hari" value={d.failed_logins_7d} tone="text-amber-600 bg-amber-50" />
              <Stat icon={LogIn} label="Login berhasil 24 jam" value={d.logins_24h} tone="text-emerald-600 bg-emerald-50" />
              <Stat icon={MonitorSmartphone} label="Sesi aktif" value={d.active_sessions} />
              <Stat icon={ShieldCheck} label="Super Admin aktif" value={d.active_super_admins} tone="text-violet-600 bg-violet-50" />
              <Stat icon={UserX} label="Akun nonaktif" value={d.inactive_users} note={`${d.users_without_nip} akun tanpa NIP`} tone="text-slate-500 bg-slate-100" />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <Card title="IP dengan login gagal terbanyak (7 hari)">
                <DataTable
                  rows={d.top_failed_ips}
                  rowKey={(r, i) => r.ip_address ?? i}
                  empty="Tidak ada login gagal."
                  columns={[
                    { key: 'ip_address', label: 'IP' },
                    { key: 'total', label: 'Percobaan', className: 'text-right' },
                  ]}
                />
              </Card>

              <Card title="Peristiwa keamanan terbaru" className="lg:col-span-2">
                <DataTable
                  rows={d.recent_events}
                  empty="Belum ada peristiwa."
                  columns={[
                    { key: 'created_at', label: 'Waktu', render: (l) => fmtDate(l.created_at), className: 'whitespace-nowrap' },
                    { key: 'action', label: 'Aksi', render: (l) => <code className="text-[11px]">{l.action}</code> },
                    { key: 'user', label: 'Pelaku', render: (l) => l.user?.name ?? l.meta?.nip ?? '—' },
                    { key: 'ip_address', label: 'IP' },
                  ]}
                />
              </Card>
            </div>
          </>
        )}
      </Query>

      <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>

      <Query q={sessions}>
        {(d) => (
          <Card title={`Sesi login aktif (${d.sessions.length})`}>
            <DataTable
              rows={d.sessions}
              empty="Tidak ada sesi aktif."
              columns={[
                {
                  key: 'user',
                  label: 'Pengguna',
                  render: (s) => (
                    <div className="flex items-center gap-2">
                      <span>
                        <b className="font-semibold text-slate-800">{s.user?.name ?? '—'}</b>
                        <span className="block text-[11px] text-mute">NIP {s.user?.nip ?? '-'}</span>
                      </span>
                      {s.user && <RoleBadge role={s.user.role} />}
                    </div>
                  ),
                },
                { key: 'created_at', label: 'Login', render: (s) => fmtDate(s.created_at) },
                { key: 'last_used_at', label: 'Terakhir dipakai', render: (s) => fmtDate(s.last_used_at) },
                { key: 'expires_at', label: 'Berakhir', render: (s) => fmtDate(s.expires_at) },
                {
                  key: 'act',
                  label: '',
                  className: 'text-right',
                  render: (s) =>
                    s.is_current ? (
                      <Badge tone="bg-emerald-100 text-emerald-700">Sesi Anda</Badge>
                    ) : (
                      <Btn
                        variant="danger"
                        icon={KeyRound}
                        busy={revoke.isPending && revoke.variables === s.id}
                        onClick={() => revoke.mutate(s.id)}
                      >
                        Akhiri sesi
                      </Btn>
                    ),
                },
              ]}
            />
          </Card>
        )}
      </Query>
    </Page>
  );
}
