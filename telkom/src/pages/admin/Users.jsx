import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { can, getUser } from '../../features/auth/auth';
import { adminApi } from '../../features/admin/api';
import { Badge, Btn, Card, DataTable, errText, Field, fmtDate, inputCls, Modal, Notice, Page, Pager, Query, RoleBadge } from '../../features/admin/kit';

const SCOPES = {
  users: { title: 'User Management', sub: 'Kelola akun pengguna: tambah, edit, reset password, aktif/nonaktif.' },
  admins: { title: 'Admin Management', sub: 'Kelola akun Admin dan Super Admin. Minimal satu Super Admin harus tetap aktif.' },
};

function UserForm({ user, roles, minLength, onClose, onDone }) {
  const editing = !!user;
  const [form, setForm] = useState({
    name: user?.name ?? '',
    nip: user?.nip ?? '',
    email: user?.email ?? '',
    role: user?.role ?? roles[0]?.key ?? 'user',
    password: '',
  });
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Role akun sendiri, atau role yang tidak boleh diberikan pelaku, tidak bisa diubah dari sini.
  const roleLocked = editing && (user.is_self || !roles.some((r) => r.key === user.role));

  const save = useMutation({
    mutationFn: () => {
      const body = { name: form.name, nip: form.nip, email: form.email || null };
      if (!roleLocked) body.role = form.role;
      return editing ? adminApi.updateUser(user.id, body) : adminApi.createUser({ ...body, password: form.password });
    },
    onSuccess: () => onDone(editing ? 'Data pengguna diperbarui.' : 'Pengguna baru dibuat.'),
    onError: (e) => setError(errText(e)),
  });

  return (
    <Modal
      title={editing ? 'Edit pengguna' : 'Tambah pengguna'}
      sub={editing ? user.name : 'Pengguna login memakai NIP dan password ini.'}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" busy={save.isPending} onClick={() => save.mutate()}>Simpan</Btn>
        </>
      }
    >
      <Notice tone="bad">{error}</Notice>
      <Field label="Nama lengkap">
        <input className={inputCls} value={form.name} onChange={set('name')} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="NIP (username)">
          <input className={inputCls} value={form.nip} onChange={set('nip')} inputMode="numeric" autoComplete="off" />
        </Field>
        <Field label="Role">
          <select className={inputCls} value={form.role} onChange={set('role')} disabled={roleLocked}>
            {roleLocked && <option value={user.role}>{user.role_label}</option>}
            {!roleLocked && roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Email (opsional)">
        <input className={inputCls} type="email" value={form.email} onChange={set('email')} />
      </Field>
      {!editing && (
        <Field label="Password awal" hint={`Minimal ${minLength} karakter, berisi huruf dan angka.`}>
          <input className={inputCls} type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
      )}
    </Modal>
  );
}

function ResetPasswordModal({ user, minLength, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () => adminApi.resetPassword(user.id, password),
    onSuccess: (res) => onDone(res.message),
    onError: (e) => setError(errText(e)),
  });

  return (
    <Modal
      title="Reset password"
      sub={`${user.name} · NIP ${user.nip ?? '-'}`}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" busy={save.isPending} onClick={() => save.mutate()}>Reset password</Btn>
        </>
      }
    >
      <Notice tone="bad">{error}</Notice>
      <Field label="Password baru" hint={`Minimal ${minLength} karakter, berisi huruf dan angka. Semua sesi pengguna ini akan diakhiri.`}>
        <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="new-password" />
      </Field>
    </Modal>
  );
}

export default function Users({ scope = 'users' }) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ q: '', role: '', status: '' });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null); // { type: 'form' | 'password', user? }
  const [msg, setMsg] = useState(null);

  const params = { ...filters, page, scope: scope === 'admins' ? 'admins' : undefined };
  const q = useQuery({
    queryKey: ['admin', 'users', scope, params],
    queryFn: () => adminApi.users(params),
    placeholderData: keepPreviousData,
  });

  const done = (text) => {
    setDialog(null);
    setMsg({ tone: 'ok', text });
    qc.invalidateQueries({ queryKey: ['admin'] });
  };
  const fail = (e) => setMsg({ tone: 'bad', text: errText(e) });

  const toggle = useMutation({
    mutationFn: (u) => adminApi.setUserStatus(u.id, !u.is_active),
    onSuccess: (u) => done(u.is_active ? `${u.name} diaktifkan.` : `${u.name} dinonaktifkan.`),
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (u) => adminApi.deleteUser(u.id),
    onSuccess: () => done('Pengguna dihapus.'),
    onError: fail,
  });

  const setFilter = (key) => (e) => {
    setFilters({ ...filters, [key]: e.target.value });
    setPage(1);
  };

  return (
    <Page
      title={SCOPES[scope].title}
      sub={SCOPES[scope].sub}
      actions={can('users.create') && <Btn variant="primary" icon={Plus} onClick={() => setDialog({ type: 'form' })}>Tambah pengguna</Btn>}
    >
      <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>

      <Query q={q}>
        {(d) => {
          const roles = scope === 'admins' ? d.assignable_roles.filter((r) => ['super_admin', 'admin'].includes(r.key)) : d.assignable_roles;
          return (
            <>
              <Card>
                <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
                  <label className="relative min-w-52 flex-1">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className={`${inputCls} pl-9`} placeholder="Cari nama, NIP, atau email…" value={filters.q} onChange={setFilter('q')} />
                  </label>
                  {scope !== 'admins' && (
                    <select className={`${inputCls} !w-auto`} value={filters.role} onChange={setFilter('role')} aria-label="Filter role">
                      <option value="">Semua role</option>
                      {['super_admin', 'admin', 'staff', 'support', 'user']
                        .filter((r) => r !== 'super_admin' || getUser()?.role === 'super_admin')
                        .map((r) => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
                    </select>
                  )}
                  <select className={`${inputCls} !w-auto`} value={filters.status} onChange={setFilter('status')} aria-label="Filter status">
                    <option value="">Semua status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>

                <DataTable
                  rows={d.data}
                  empty="Tidak ada pengguna yang cocok."
                  columns={[
                    {
                      key: 'name',
                      label: 'Nama',
                      render: (u) => (
                        <div>
                          <b className="font-semibold text-slate-800">{u.name}</b>
                          {u.is_self && <span className="ml-1.5 text-[10px] text-mute">(Anda)</span>}
                          <p className="text-[11px] text-mute">{u.email ?? '—'}</p>
                        </div>
                      ),
                    },
                    { key: 'nip', label: 'NIP', render: (u) => u.nip ?? <span className="text-rose-500">belum ada</span> },
                    { key: 'role', label: 'Role', render: (u) => <RoleBadge role={u.role} /> },
                    {
                      key: 'is_active',
                      label: 'Status',
                      render: (u) =>
                        u.is_active ? <Badge tone="bg-emerald-100 text-emerald-700">Aktif</Badge> : <Badge tone="bg-slate-200 text-slate-600">Nonaktif</Badge>,
                    },
                    { key: 'last_login_at', label: 'Login terakhir', render: (u) => fmtDate(u.last_login_at), className: 'whitespace-nowrap' },
                    {
                      key: 'act',
                      label: 'Aksi',
                      className: 'text-right whitespace-nowrap',
                      render: (u) =>
                        !u.can_manage ? (
                          <span className="text-[11px] text-mute">Di luar wewenang Anda</span>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            {can('users.update') && <Btn icon={Pencil} onClick={() => setDialog({ type: 'form', user: u })}>Edit</Btn>}
                            {can('users.reset_password') && !u.is_self && (
                              <Btn icon={KeyRound} onClick={() => setDialog({ type: 'password', user: u })}>Reset</Btn>
                            )}
                            {can('users.toggle_active') && !u.is_self && (
                              <Btn
                                icon={Power}
                                busy={toggle.isPending && toggle.variables?.id === u.id}
                                onClick={() => {
                                  if (u.is_active && !window.confirm(`Nonaktifkan ${u.name}? Semua sesinya akan diakhiri.`)) return;
                                  toggle.mutate(u);
                                }}
                              >
                                {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                              </Btn>
                            )}
                            {can('users.delete') && !u.is_self && (
                              <Btn
                                variant="danger"
                                icon={Trash2}
                                busy={remove.isPending && remove.variables?.id === u.id}
                                onClick={() => window.confirm(`Hapus permanen akun ${u.name} (NIP ${u.nip ?? '-'})?`) && remove.mutate(u)}
                              >
                                Hapus
                              </Btn>
                            )}
                          </div>
                        ),
                    },
                  ]}
                />
                <Pager page={d.current_page} lastPage={d.last_page} total={d.total} onPage={setPage} />
              </Card>

              {dialog?.type === 'form' && (
                <UserForm user={dialog.user} roles={roles} minLength={d.password_min_length} onClose={() => setDialog(null)} onDone={done} />
              )}
              {dialog?.type === 'password' && (
                <ResetPasswordModal user={dialog.user} minLength={d.password_min_length} onClose={() => setDialog(null)} onDone={done} />
              )}
            </>
          );
        }}
      </Query>
    </Page>
  );
}
