import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, LogIn, ShieldAlert, UserCheck, UserPlus, Users, UserX } from 'lucide-react';
import { can, getUser, ROLE_LABEL } from '../features/auth/auth';
import { adminApi } from '../features/admin/api';
import { Card, DataTable, fmtDate, Page, Query, RoleBadge, Stat } from '../features/admin/kit';
import { visibleNav } from '../nav';

const ROLE_INTRO = {
  super_admin: 'Akses penuh ke seluruh fitur sistem, administrasi, dan developer.',
  admin: 'Kelola pengguna dan operasional sistem sesuai permission Anda.',
  staff: 'Akses fitur operasional sesuai permission yang diberikan.',
  support: 'Akses fitur pelayanan dan dukungan.',
  user: 'Akses halaman pengguna sesuai permission yang diberikan.',
};

/** Ringkasan administrasi: hanya dirender (dan hanya bisa diambil dari API) oleh pemegang admin.dashboard. */
function AdminOverview() {
  const q = useQuery({ queryKey: ['admin', 'overview'], queryFn: adminApi.overview });

  return (
    <Query q={q}>
      {(d) => (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon={Users} label="Total pengguna" value={d.users.total} note={`${d.users.new_30d} baru dalam 30 hari`} />
            <Stat icon={UserCheck} label="Akun aktif" value={d.users.active} tone="text-emerald-600 bg-emerald-50" />
            <Stat icon={UserX} label="Akun nonaktif" value={d.users.inactive} tone="text-slate-500 bg-slate-100" />
            <Stat
              icon={ShieldAlert}
              label="Login gagal (24 jam)"
              value={d.activity.failed_logins_24h}
              note={`${d.activity.logins_24h} login berhasil`}
              tone="text-rose-600 bg-rose-50"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Pengguna per role">
              <ul className="divide-y divide-slate-100">
                {d.roles.map((r) => (
                  <li key={r.key} className="flex items-center justify-between px-5 py-2.5">
                    <RoleBadge role={r.key} />
                    <b className="text-sm text-slate-800">{r.users}</b>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Login terakhir" className="lg:col-span-2">
              <DataTable
                rows={d.recent_logins}
                empty="Belum ada yang login."
                columns={[
                  { key: 'name', label: 'Nama', render: (u) => <b className="font-semibold text-slate-800">{u.name}</b> },
                  { key: 'nip', label: 'NIP' },
                  { key: 'role', label: 'Role', render: (u) => <RoleBadge role={u.role} /> },
                  { key: 'last_login_at', label: 'Waktu', render: (u) => fmtDate(u.last_login_at) },
                ]}
              />
            </Card>
          </div>

          {d.recent_activity.length > 0 && (
            <Card
              title="Aktivitas terbaru"
              actions={
                <Link to="/admin/audit-logs" className="text-[11px] font-semibold text-[#2563EB] hover:underline">
                  Lihat semua
                </Link>
              }
            >
              <DataTable
                rows={d.recent_activity}
                columns={[
                  { key: 'created_at', label: 'Waktu', render: (l) => fmtDate(l.created_at), className: 'whitespace-nowrap' },
                  { key: 'user', label: 'Pengguna', render: (l) => l.user?.name ?? '—' },
                  { key: 'action', label: 'Aksi', render: (l) => <code className="text-[11px] text-slate-600">{l.action}</code> },
                  { key: 'ip_address', label: 'IP' },
                ]}
              />
            </Card>
          )}
        </>
      )}
    </Query>
  );
}

/** Beranda = dashboard sesuai role: isi dan menu mengikuti permission pengguna. */
export default function Home() {
  const user = getUser();
  const groups = visibleNav()
    .map((g) => ({ ...g, items: g.items.filter((i) => i.to !== '/home') }))
    .filter((g) => g.items.length > 0);

  return (
    <Page
      title={`Selamat datang, ${user?.name ?? 'Pengguna'}`}
      sub={`${ROLE_LABEL[user?.role] ?? '-'} · ${ROLE_INTRO[user?.role] ?? ''}`}
      actions={
        <Link to="/profile" className="btn hover:bg-slate-50">
          <LogIn size={13} /> Profile Settings
        </Link>
      }
    >
      {can('admin.dashboard') && <AdminOverview />}

      {groups.map((group) => (
        <section key={group.section}>
          <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-mute">{group.section}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map(({ to, icon: Icon, label, desc }) => (
              <Link
                key={to}
                to={to}
                className="card group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <span className="size-10 shrink-0 rounded-xl bg-blue-50 text-[#2563EB] grid place-items-center">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{label}</p>
                  <p className="truncate text-[11px] text-mute">{desc}</p>
                </div>
                <ArrowUpRight size={15} className="shrink-0 text-slate-300 group-hover:text-[#2563EB]" />
              </Link>
            ))}
          </div>
        </section>
      ))}

      {groups.length === 0 && (
        <div className="card p-8 text-center text-sm text-mute">
          <UserPlus size={20} className="mx-auto mb-2 text-slate-300" />
          Role Anda belum memiliki akses ke modul apa pun. Hubungi administrator.
        </div>
      )}
    </Page>
  );
}
