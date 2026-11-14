import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, Plus, Trash2, XCircle } from 'lucide-react';
import { adminApi } from '../../features/admin/api';
import { Badge, Btn, Card, DataTable, errText, Field, fmtDate, inputCls, Modal, Notice, Page, Query } from '../../features/admin/kit';

function CreateKeyModal({ abilities, onClose, onCreated }) {
  const [label, setLabel] = useState('');
  const [picked, setPicked] = useState([]);
  const [days, setDays] = useState('90');
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () => adminApi.createApiKey({ label, abilities: picked, expires_days: days ? Number(days) : null }),
    onSuccess: (res) => onCreated(res.token),
    onError: (e) => setError(errText(e)),
  });

  const toggle = (key) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  return (
    <Modal
      title="Buat API key"
      sub="Key hanya bisa membaca data sesuai scope yang dipilih."
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" busy={create.isPending} onClick={() => create.mutate()}>Buat key</Btn>
        </>
      }
    >
      <Notice tone="bad">{error}</Notice>
      <Field label="Nama integrasi">
        <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. Dashboard BI Regional" autoFocus />
      </Field>
      <div>
        <span className="mb-1.5 block text-xs font-bold text-slate-700">Scope</span>
        <div className="space-y-1.5">
          {abilities.map((a) => (
            <label key={a.key} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2 text-xs">
              <input type="checkbox" className="size-4 accent-[#2563EB]" checked={picked.includes(a.key)} onChange={() => toggle(a.key)} />
              <span className="font-medium text-slate-700">{a.label}</span>
              <code className="ml-auto text-[10px] text-slate-400">{a.key}</code>
            </label>
          ))}
        </div>
      </div>
      <Field label="Masa berlaku (hari)" hint="Kosongkan untuk tanpa batas waktu. Maksimal 365 hari.">
        <input className={inputCls} type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} />
      </Field>
    </Modal>
  );
}

function TokenModal({ token, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
  };

  return (
    <Modal title="API key dibuat" sub="Salin sekarang. Key ini tidak akan ditampilkan lagi." onClose={onClose} footer={<Btn variant="primary" onClick={onClose}>Selesai</Btn>}>
      <code className="block break-all rounded-xl bg-slate-900 p-3 text-[11px] text-emerald-300">{token}</code>
      <Btn icon={Copy} onClick={copy}>{copied ? 'Tersalin' : 'Salin key'}</Btn>
      <p className="text-[11px] text-mute">
        Kirim sebagai header <code>Authorization: Bearer &lt;key&gt;</code> ke endpoint <code>/api/…</code>.
      </p>
    </Modal>
  );
}

export default function ApiKeys() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'api-keys'], queryFn: adminApi.apiKeys });
  const [creating, setCreating] = useState(false);
  const [token, setToken] = useState(null);
  const [msg, setMsg] = useState(null);

  const reload = () => qc.invalidateQueries({ queryKey: ['admin', 'api-keys'] });

  const revoke = useMutation({
    mutationFn: (id) => adminApi.revokeApiKey(id),
    onSuccess: (res) => {
      setMsg({ tone: 'ok', text: res.message });
      reload();
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
  });

  return (
    <Page
      title="API Management"
      sub="Kelola API key untuk integrasi dan periksa status integrasi eksternal."
      actions={<Btn variant="primary" icon={Plus} onClick={() => setCreating(true)}>Buat API key</Btn>}
    >
      <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>

      <Query q={q}>
        {(d) => (
          <>
            <Card title="API key">
              <DataTable
                rows={d.keys}
                empty="Belum ada API key."
                columns={[
                  { key: 'label', label: 'Integrasi', render: (k) => <b className="font-semibold text-slate-800">{k.label}</b> },
                  {
                    key: 'abilities',
                    label: 'Scope',
                    render: (k) => (
                      <div className="flex flex-wrap gap-1">
                        {k.abilities.map((a) => <code key={a} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">{a}</code>)}
                      </div>
                    ),
                  },
                  { key: 'owner', label: 'Dibuat oleh', render: (k) => k.owner?.name ?? '—' },
                  { key: 'last_used_at', label: 'Terakhir dipakai', render: (k) => fmtDate(k.last_used_at) },
                  {
                    key: 'expires_at',
                    label: 'Berlaku sampai',
                    render: (k) =>
                      k.expired ? <Badge tone="bg-rose-100 text-rose-700">Kedaluwarsa</Badge> : k.expires_at ? fmtDate(k.expires_at) : 'Tanpa batas',
                  },
                  {
                    key: 'act',
                    label: '',
                    className: 'text-right',
                    render: (k) => (
                      <Btn
                        variant="danger"
                        icon={Trash2}
                        busy={revoke.isPending && revoke.variables === k.id}
                        onClick={() => window.confirm(`Cabut API key "${k.label}"? Integrasi yang memakainya akan berhenti.`) && revoke.mutate(k.id)}
                      >
                        Cabut
                      </Btn>
                    ),
                  },
                ]}
              />
            </Card>

            <Card title="Status integrasi">
              <ul className="divide-y divide-slate-100">
                {d.integrations.map((i) => (
                  <li key={i.name} className="flex items-center gap-3 px-5 py-3 text-xs">
                    {i.configured ? <CheckCircle2 size={15} className="text-emerald-500" /> : <XCircle size={15} className="text-rose-500" />}
                    <b className="font-semibold text-slate-800">{i.name}</b>
                    <span className="ml-auto break-all text-right text-mute">
                      {i.detail ?? (i.configured ? 'Terkonfigurasi' : 'Belum dikonfigurasi di .env')}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            {creating && (
              <CreateKeyModal
                abilities={d.abilities}
                onClose={() => setCreating(false)}
                onCreated={(t) => {
                  setCreating(false);
                  setToken(t);
                  reload();
                }}
              />
            )}
          </>
        )}
      </Query>

      {token && <TokenModal token={token} onClose={() => setToken(null)} />}
    </Page>
  );
}
