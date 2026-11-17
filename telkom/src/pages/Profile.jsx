import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, LogOut, Save } from 'lucide-react';
import { logout, refreshUser } from '../features/auth/auth';
import { adminApi } from '../features/admin/api';
import { Badge, Btn, Card, DataTable, errText, Field, fmtDate, inputCls, Notice, Page, Query, RoleBadge } from '../features/admin/kit';

function ProfileForm({ user, onSaved }) {
  const [form, setForm] = useState({ name: user.name ?? '', email: user.email ?? '' });
  const [msg, setMsg] = useState(null);

  const save = useMutation({
    mutationFn: () => adminApi.saveProfile({ name: form.name, email: form.email || null }),
    onSuccess: async () => {
      await refreshUser();
      onSaved();
      setMsg({ tone: 'ok', text: 'Profil diperbarui.' });
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
  });

  return (
    <Card title="Data diri">
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="NIP" hint="NIP adalah username login dan hanya bisa diubah administrator.">
            <input className={inputCls} value={user.nip ?? ''} disabled />
          </Field>
          <Field label="Role">
            <div className="py-2"><RoleBadge role={user.role} label={user.role_label} /></div>
          </Field>
          <Field label="Nama lengkap">
            <input className={inputCls} value={form.name} required maxLength={255} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email (opsional)">
            <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-mute">Login terakhir: {fmtDate(user.last_login_at)}</p>
          <Btn type="submit" variant="primary" icon={Save} busy={save.isPending}>Simpan</Btn>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm({ onChanged }) {
  const empty = { current_password: '', password: '', password_confirmation: '' };
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState(null);

  const save = useMutation({
    mutationFn: () => adminApi.changePassword(form),
    onSuccess: (res) => {
      setForm(empty);
      onChanged();
      setMsg({ tone: 'ok', text: res.message });
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
  });

  const field = (key, label, autoComplete) => (
    <Field label={label}>
      <input
        className={inputCls}
        type="password"
        required
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </Field>
  );

  return (
    <Card title="Ganti password">
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>
        <div className="grid gap-4 sm:grid-cols-3">
          {field('current_password', 'Password saat ini', 'current-password')}
          {field('password', 'Password baru', 'new-password')}
          {field('password_confirmation', 'Ulangi password baru', 'new-password')}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-mute">Harus berisi huruf dan angka. Sesi di perangkat lain akan diakhiri.</p>
          <Btn type="submit" variant="primary" icon={KeyRound} busy={save.isPending}>Ganti password</Btn>
        </div>
      </form>
    </Card>
  );
}

export default function Profile() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['profile'], queryFn: adminApi.profile });
  const reload = () => qc.invalidateQueries({ queryKey: ['profile'] });
  const [msg, setMsg] = useState(null);

  const revoke = useMutation({
    mutationFn: (id) => (id === 'others' ? adminApi.revokeOtherSessions() : adminApi.revokeMySession(id)),
    onSuccess: (res) => {
      reload();
      setMsg({ tone: 'ok', text: res.message });
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
  });

  useEffect(() => {
    document.title = 'Profile Settings · SOLARIS';
  }, []);

  return (
    <Page
      title="Profile Settings"
      sub="Kelola data diri dan sesi login Anda."
      actions={<Btn variant="danger" icon={LogOut} onClick={logout}>Keluar</Btn>}
    >
      <Query q={q}>
        {(d) => (
          <>
            <ProfileForm user={d.user} onSaved={reload} />
            {['super_admin', 'admin', 'support'].includes(d.user.role) ? (
              <PasswordForm onChanged={reload} />
            ) : (
              <Card title="Password">
                <p className="p-5 text-xs text-mute">
                  Password dikelola oleh Admin dan IT Support. Hubungi mereka untuk ubah password.
                </p>
              </Card>
            )}

            <Card
              title="Sesi aktif"
              actions={
                d.sessions.length > 1 && (
                  <Btn busy={revoke.isPending} onClick={() => revoke.mutate('others')}>Akhiri semua sesi lain</Btn>
                )
              }
            >
              {msg && <div className="p-4 pb-0"><Notice tone={msg.tone} onClose={() => setMsg(null)}>{msg.text}</Notice></div>}
              <DataTable
                rows={d.sessions}
                columns={[
                  { key: 'created_at', label: 'Login', render: (s) => fmtDate(s.created_at) },
                  { key: 'last_used_at', label: 'Terakhir dipakai', render: (s) => fmtDate(s.last_used_at) },
                  { key: 'expires_at', label: 'Berakhir', render: (s) => fmtDate(s.expires_at) },
                  {
                    key: 'act',
                    label: '',
                    className: 'text-right',
                    render: (s) =>
                      s.is_current ? (
                        <Badge tone="bg-emerald-100 text-emerald-700">Sesi ini</Badge>
                      ) : (
                        <Btn variant="danger" onClick={() => revoke.mutate(s.id)}>Akhiri</Btn>
                      ),
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Query>
    </Page>
  );
}
