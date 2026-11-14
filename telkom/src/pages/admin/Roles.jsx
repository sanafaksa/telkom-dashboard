import { Fragment, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Save } from 'lucide-react';
import { adminApi } from '../../features/admin/api';
import { Btn, Card, errText, Notice, Page, Query, RoleBadge } from '../../features/admin/kit';

function Matrix({ data }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setDraft(Object.fromEntries(data.roles.map((r) => [r.key, new Set(r.permissions)])));
  }, [data]);

  const save = useMutation({
    mutationFn: (role) => adminApi.updateRole(role, [...draft[role]]),
    onSuccess: (res) => {
      setMsg({ tone: 'ok', text: `Permission role ${res.role} disimpan dan langsung berlaku.` });
      qc.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
  });

  const dirty = (role) => {
    const now = draft[role.key];
    return !!now && (now.size !== role.permissions.length || role.permissions.some((p) => !now.has(p)));
  };

  const toggle = (role, perm) => {
    const next = new Set(draft[role]);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    setDraft({ ...draft, [role]: next });
  };

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
                                  disabled={locked}
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
              <tr>
                <td className="px-4 py-3 text-[11px] text-mute">
                  Super Admin selalu memiliki semua permission. Baris bertanda gembok hanya untuk Super Admin.
                </td>
                {data.roles.map((r) => (
                  <td key={r.key} className="px-3 py-3 text-center">
                    {!r.locked && (
                      <Btn
                        variant="primary"
                        icon={Save}
                        disabled={!dirty(r)}
                        busy={save.isPending && save.variables === r.key}
                        onClick={() => save.mutate(r.key)}
                      >
                        Simpan
                      </Btn>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
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
