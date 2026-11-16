import { Fragment, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Save } from 'lucide-react';
import { adminApi } from '../../features/admin/api';
import { getUser } from '../../features/auth/auth';
import { Btn, Card, errText, Field, inputCls, Modal, Notice, Page, Query, RoleBadge } from '../../features/admin/kit';

const IDLE_LOCK_MS = 5 * 60 * 1000;

const draftFrom = (data) => Object.fromEntries(data.roles.map((r) => [r.key, new Set(r.permissions)]));

const isDirty = (role, draft) => {
  const now = draft[role.key];
  return !!now && (now.size !== role.permissions.length || role.permissions.some((p) => !now.has(p)));
};

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
      sub="Masukkan kata sandi Super Admin Anda untuk mengubah permission."
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
        <Field label="Kata sandi Super Admin">
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

function Matrix({ data }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(() => draftFrom(data));
  const [isLocked, setIsLocked] = useState(true);
  const [showUnlock, setShowUnlock] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setDraft(draftFrom(data));
  }, [data]);

  const isSuper = getUser()?.role === 'super_admin';
  const changed = data.roles.filter((r) => !r.locked && isDirty(r, draft));

  const save = useMutation({
    mutationFn: () => Promise.all(changed.map((r) => adminApi.updateRole(r.key, [...draft[r.key]]))),
    onSuccess: (results) => {
      setMsg({ tone: 'ok', text: `Konfigurasi ${results.length} role disimpan dan langsung berlaku.` });
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'roles'] }),
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

  // Kunci otomatis setelah IDLE_LOCK_MS tanpa aktivitas (klik atau tombol) saat terbuka.
  const [activity, setActivity] = useState(0);

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
                {data.roles.map((r) => (
                  <th key={r.key} className="px-3 py-3 text-center align-top">
                    <RoleBadge role={r.key} />
                    <p className="mt-1 text-[10px] font-normal text-mute">{r.users} pengguna</p>
                  </th>
                ))}
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
                          const locked = r.locked || p.super_only;
                          const checked = r.locked ? true : !p.super_only && !!draft[r.key]?.has(p.key);
                          return (
                            <td key={r.key} className="px-3 py-2 text-center">
                              {locked && !checked ? (
                                <Lock size={12} className="inline text-slate-300" aria-label="Khusus Super Admin" />
                              ) : (
                                <input
                                  type="checkbox"
                                  className="size-4 cursor-pointer accent-[#2563EB] disabled:cursor-not-allowed"
                                  checked={checked}
                                  disabled={isLocked || locked}
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
          {isSuper &&
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
            {!isSuper
              ? 'Hanya Super Admin yang dapat mengubah permission.'
              : isLocked
              ? 'Terkunci. Buka kunci untuk mengubah permission.'
              : changed.length
                ? `${changed.length} role berubah belum disimpan.`
                : `Tidak ada perubahan. Terkunci otomatis setelah ${IDLE_LOCK_MS / 60000} menit tanpa aktivitas.`}
          </span>
        </div>
        <Btn
          variant="primary"
          icon={Save}
          disabled={!isSuper || isLocked || changed.length === 0}
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
            setMsg({ tone: 'ok', text: 'Akses dibuka. Anda dapat mengubah permission.' });
          }}
        />
      )}
    </>
  );
}

export default function Roles() {
  const q = useQuery({ queryKey: ['admin', 'roles'], queryFn: adminApi.roles });

  return (
    <Page title="Role & Permission" sub="Atur permission tiap role. Perubahan berlaku pada request berikutnya dari setiap pengguna.">
      <Query q={q}>{(d) => <Matrix data={d} />}</Query>
    </Page>
  );
}
