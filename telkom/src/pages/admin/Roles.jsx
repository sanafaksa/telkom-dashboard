import { Fragment, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Plus, Save, Trash2 } from 'lucide-react';
import { adminApi } from '../../features/admin/api';
import { can, getUser } from '../../features/auth/auth';
import { Btn, Card, errText, Field, inputCls, Modal, Notice, Page, Query, RoleBadge } from '../../features/admin/kit';

const IDLE_LOCK_MS = 5 * 60 * 1000;
const SUPPORT_EXTRA = ['audit.view', 'maintenance.manage', 'inbox.manage', 'backup.manage'];

const draftFrom = (data) => Object.fromEntries(data.roles.map((r) => [r.key, new Set(r.permissions)]));

const isDirty = (role, draft) => {
  const now = draft[role.key];
  return !!now && (now.size !== role.permissions.length || role.permissions.some((p) => !now.has(p)));
};

// Aturan per role (sama dengan Rbac::grantableFor di backend):
// - Super Admin: tidak diatur di sini.
// - Admin & role buatan: semua permission non-super.
// - Support: Operasional + SUPPORT_EXTRA. Staff & User: hanya Operasional.
const restricted = (roleKey, p) => {
  if (roleKey === 'admin' || roleKey === 'super_admin') return false;
  if (p.group === 'Operasional') return false;
  if (roleKey === 'support' && SUPPORT_EXTRA.includes(p.key)) return false;
  return ['staff', 'support', 'user'].includes(roleKey);
};

// Permission grup Sistem hanya untuk Super Admin, kecuali yang boleh diberikan ke Support (backup.manage).
const superLocked = (roleKey, p) => p.super_only && !(roleKey === 'support' && SUPPORT_EXTRA.includes(p.key));

function UnlockModal({ onClose, onVerified }) {
  const [password, setPassword] = useState('');

  const verify = useMutation({
    mutationFn: () => adminApi.verifyRolePassword(password),
    onSuccess: onVerified,
  });

  const submit = (e) => {
    e.preventDefault();
    if (password) verify.mutate();
  };

  return (
    <Modal
      title="Buka Kunci Akses"
      sub="Masukkan kata sandi akun Anda untuk mengubah role bawaan."
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" icon={Lock} busy={verify.isPending} disabled={!password} onClick={submit}>
            Buka Kunci
          </Btn>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Kata sandi Anda">
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            className={`${inputCls} mt-1`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {verify.isError && <Notice tone="bad">{errText(verify.error)}</Notice>}
      </form>
    </Modal>
  );
}

function CreateRoleModal({ onClose, onCreated }) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const create = useMutation({
    mutationFn: () => adminApi.createRole({ label: label.trim(), description: description.trim() || null, permissions: [] }),
    onSuccess: onCreated,
  });

  const submit = (e) => {
    e.preventDefault();
    if (label.trim()) create.mutate();
  };

  return (
    <Modal
      title="Tambah role"
      sub="Role baru dibuat tanpa permission. Atur permission-nya di tabel setelah role dibuat."
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" busy={create.isPending} disabled={!label.trim()} onClick={submit}>
            Buat role
          </Btn>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nama role" hint="Contoh: AM, Account Manager, Pengawas Witel">
          <input className={`${inputCls} mt-1`} maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
        </Field>
        <Field label="Deskripsi (opsional)">
          <input className={`${inputCls} mt-1`} maxLength={255} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {create.isError && <Notice tone="bad">{errText(create.error)}</Notice>}
      </form>
    </Modal>
  );
}

function Matrix({ data }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(() => draftFrom(data));
  const [isLocked, setIsLocked] = useState(true);
  const [showUnlock, setShowUnlock] = useState(false);
  const [msg, setMsg] = useState(null);
  const [activity, setActivity] = useState(0);

  const role = getUser()?.role;
  const isSuper = role === 'super_admin';
  const isAdmin = role === 'admin';
  const canUnlock = isSuper || isAdmin;
  const canCustom = can('roles.custom');

  // Role bawaan (selain Super Admin dan Admin) dikunci: Super Admin & Admin harus membuka kunci dengan kata sandi sendiri.
  // Role Admin hanya bisa diubah Super Admin. Role buatan bisa diubah langsung oleh yang punya roles.custom.
  const canEdit = (r) => {
    if (r.key === 'super_admin') return false;
    if (r.key === 'admin') return isSuper && !isLocked;
    if (r.is_system) return canUnlock && !isLocked;
    return canCustom;
  };

  useEffect(() => {
    setDraft(draftFrom(data));
  }, [data]);

  const changed = data.roles.filter((r) => canEdit(r) && !r.locked && isDirty(r, draft));

  const save = useMutation({
    mutationFn: () => Promise.all(changed.map((r) => adminApi.updateRole(r.key, [...draft[r.key]]))),
    onSuccess: (results) => {
      setMsg({ tone: 'ok', text: `Konfigurasi ${results.length} role disimpan dan langsung berlaku.` });
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
  });

  const remove = useMutation({
    mutationFn: (key) => adminApi.deleteRole(key),
    onSuccess: (res) => setMsg({ tone: 'ok', text: res.message }),
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'roles'] });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const toggle = (role, perm) =>
    setDraft((d) => {
      const next = new Set(d[role]);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return { ...d, [role]: next };
    });

  const lock = () => {
    setDraft(draftFrom(data));
    setIsLocked(true);
  };

  // Kunci otomatis setelah IDLE_LOCK_MS tanpa aktivitas saat role bawaan terbuka.
  useEffect(() => {
    if (isLocked) return undefined;
    const bump = () => setActivity((n) => n + 1);
    const events = ['pointerdown', 'keydown'];
    events.forEach((e) => window.addEventListener(e, bump));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, [isLocked]);

  useEffect(() => {
    if (isLocked) return undefined;
    const id = setTimeout(() => {
      lock();
      setMsg({ tone: 'bad', text: 'Akses dikunci otomatis karena tidak ada aktivitas. Perubahan yang belum disimpan dibatalkan.' });
    }, IDLE_LOCK_MS);
    return () => clearTimeout(id);
  }, [isLocked, activity]);

  const grantableKeysFor = (roleKey) =>
    data.permissions.filter((p) => !superLocked(roleKey, p) && !restricted(roleKey, p)).map((p) => p.key);
  const allChecked = (roleKey) => grantableKeysFor(roleKey).every((k) => draft[roleKey]?.has(k));
  const toggleAllFor = (roleKey) =>
    setDraft((d) => ({ ...d, [roleKey]: allChecked(roleKey) ? new Set() : new Set(grantableKeysFor(roleKey)) }));

  const groups = [...new Set(data.permissions.map((p) => p.group))];

  return (
    <>
      <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-mute">Permission</th>
                {data.roles.map((r) => {
                  const editable = canEdit(r) && !r.locked;
                  return (
                    <th key={r.key} className="px-3 py-3 text-center align-top">
                      <RoleBadge role={r.key} label={r.label} />
                      {editable && (
                        <div className="mt-1.5 flex justify-center">
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer accent-[#2563EB]"
                            checked={allChecked(r.key)}
                            onChange={() => toggleAllFor(r.key)}
                            aria-label={`Pilih semua permission untuk ${r.label}`}
                            title="Pilih semua / hapus semua"
                          />
                        </div>
                      )}
                      <p className="mt-1 text-[10px] font-normal text-mute">{r.users} pengguna</p>
                      {canCustom && !r.is_system && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Hapus role ${r.label}? Akun yang memakai role ini akan dipindahkan ke role User.`)) {
                              remove.mutate(r.key);
                            }
                          }}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] text-rose-600 hover:underline cursor-pointer"
                        >
                          <Trash2 size={11} /> Hapus role
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group}>
                  <tr className="bg-slate-50">
                    <td colSpan={data.roles.length + 1} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-mute">
                      {group}
                    </td>
                  </tr>
                  {data.permissions
                    .filter((p) => p.group === group)
                    .map((p) => (
                      <tr key={p.key} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-2">
                          <span className="font-medium text-slate-800">{p.label}</span>
                          <code className="ml-2 text-[10px] text-slate-400">{p.key}</code>
                        </td>
                        {data.roles.map((r) => {
                          const locked = r.locked || superLocked(r.key, p) || restricted(r.key, p);
                          const checked = r.locked ? true : !locked && !!draft[r.key]?.has(p.key);
                          return (
                            <td key={r.key} className="px-3 py-2 text-center">
                              {locked && !checked ? (
                                <Lock size={12} className="inline text-slate-300" aria-label="Khusus Super Admin" />
                              ) : (
                                <input
                                  type="checkbox"
                                  className="size-4 cursor-pointer accent-[#2563EB] disabled:cursor-not-allowed"
                                  checked={checked}
                                  disabled={!canEdit(r) || locked}
                                  onChange={() => toggle(r.key, p.key)}
                                  aria-label={`${p.label} untuk ${r.label}`}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {isSuper && (
          <p className="border-t border-line px-4 py-3 text-[11px] text-mute">
            Super Admin selalu memiliki semua permission. Baris bertanda gembok hanya untuk Super Admin.
          </p>
        )}
      </Card>

      <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-6 py-3.5 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 text-xs text-mute">
          {canUnlock &&
            (isLocked ? (
              <Btn icon={Lock} onClick={() => setShowUnlock(true)}>
                Buka Kunci Akses
              </Btn>
            ) : (
              <Btn icon={Lock} onClick={lock}>
                Kunci Kembali
              </Btn>
            ))}
          <span>
            {changed.length
              ? `${changed.length} role berubah belum disimpan.`
              : canUnlock && isLocked
              ? 'Role bawaan terkunci. Buka kunci dengan kata sandi Anda untuk mengubahnya.'
              : canUnlock
              ? `Tidak ada perubahan. Terkunci otomatis setelah ${IDLE_LOCK_MS / 60000} menit tanpa aktivitas.`
              : 'Atur permission semua role selain Super Admin dan Admin. Perubahan berlaku pada request berikutnya.'}
          </span>
        </div>
        <Btn
          variant="primary"
          icon={Save}
          disabled={changed.length === 0}
          busy={save.isPending}
          onClick={() => save.mutate()}
        >
          Simpan Konfigurasi
        </Btn>
      </div>

      {showUnlock && (
        <UnlockModal
          onClose={() => setShowUnlock(false)}
          onVerified={() => {
            setIsLocked(false);
            setShowUnlock(false);
            setMsg({ tone: 'ok', text: 'Akses dibuka. Anda dapat mengubah role bawaan selain Super Admin.' });
          }}
        />
      )}
    </>
  );
}

export default function Roles() {
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState(null);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'roles'], queryFn: adminApi.roles });

  return (
    <Page
      title="Role & Permission"
      sub="Atur permission tiap role. Perubahan berlaku pada request berikutnya dari setiap pengguna."
      actions={
        can('roles.custom') && (
          <Btn variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>
            Tambah role
          </Btn>
        )
      }
    >
      <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>
      <Query q={q}>{(d) => <Matrix data={d} />}</Query>

      {showCreate && (
        <CreateRoleModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            setMsg({ tone: 'ok', text: 'Role baru dibuat. Centang permission-nya di tabel di bawah.' });
            qc.invalidateQueries({ queryKey: ['admin', 'roles'] });
          }}
        />
      )}
    </Page>
  );
}
