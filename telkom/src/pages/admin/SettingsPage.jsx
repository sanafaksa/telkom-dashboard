import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Send } from 'lucide-react';
import { refreshUser } from '../../features/auth/auth';
import { adminApi } from '../../features/admin/api';
import { Btn, Card, errText, Field, inputCls, Notice, Page, Query } from '../../features/admin/kit';

const GROUPS = {
  general: {
    title: 'System Configuration',
    sub: 'Pengumuman untuk semua pengguna dan mode pemeliharaan.',
  },
  auth: {
    title: 'Authentication Settings',
    sub: 'Login memakai NIP + password (tanpa OTP). Atur durasi sesi, rate limit, dan aturan password.',
  },
  mail: {
    title: 'Email Configuration',
    sub: 'Konfigurasi pengiriman email sistem. Password SMTP disimpan terenkripsi.',
  },
};

const OPTIONS = { mail_mailer: [['log', 'Log (tidak dikirim, untuk uji)'], ['smtp', 'SMTP']] };

function SettingsForm({ group, settings }) {
  const qc = useQueryClient();
  const [values, setValues] = useState({});
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setValues(Object.fromEntries(settings.map((s) => [s.key, s.type === 'secret' ? '' : s.value])));
  }, [settings]);

  const save = useMutation({
    mutationFn: () => adminApi.saveSettings(group, values),
    onSuccess: () => {
      setMsg({ tone: 'ok', text: 'Pengaturan disimpan dan langsung berlaku.' });
      qc.invalidateQueries({ queryKey: ['admin', 'settings', group] });
      if (group === 'general') refreshUser().catch(() => {});
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
  });

  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <Card>
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>

        <div className="grid gap-4 sm:grid-cols-2">
          {settings.map((s) => {
            if (s.type === 'bool') {
              return (
                <label key={s.key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 sm:col-span-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-[#2563EB]"
                    checked={!!values[s.key]}
                    onChange={(e) => set(s.key, e.target.checked)}
                  />
                  <span className="text-xs font-semibold text-slate-700">{s.label}</span>
                </label>
              );
            }
            return (
              <Field
                key={s.key}
                label={s.label}
                hint={s.type === 'secret' ? (s.is_set ? 'Sudah diisi. Kosongkan bila tidak ingin mengubah.' : 'Belum diisi.') : undefined}
              >
                {OPTIONS[s.key] ? (
                  <select className={inputCls} value={values[s.key] ?? ''} onChange={(e) => set(s.key, e.target.value)}>
                    {OPTIONS[s.key].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ) : (
                  <input
                    className={inputCls}
                    type={s.type === 'int' ? 'number' : s.type === 'secret' ? 'password' : 'text'}
                    autoComplete={s.type === 'secret' ? 'new-password' : 'off'}
                    value={values[s.key] ?? ''}
                    onChange={(e) => set(s.key, e.target.value)}
                  />
                )}
              </Field>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Btn type="submit" variant="primary" icon={Save} busy={save.isPending}>Simpan pengaturan</Btn>
        </div>
      </form>
    </Card>
  );
}

function MailTest() {
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState(null);

  const send = useMutation({
    mutationFn: () => adminApi.testMail(to),
    onSuccess: (res) => setMsg({ tone: 'ok', text: res.message }),
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
  });

  return (
    <Card title="Kirim email uji">
      <form
        className="space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate();
        }}
      >
        <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-60 flex-1">
            <Field label="Alamat tujuan" hint="Simpan pengaturan dulu sebelum mengirim email uji.">
              <input className={inputCls} type="email" required value={to} onChange={(e) => setTo(e.target.value)} placeholder="nama@telkom.co.id" />
            </Field>
          </div>
          <Btn type="submit" icon={Send} busy={send.isPending} className="mb-5">Kirim</Btn>
        </div>
      </form>
    </Card>
  );
}

export default function SettingsPage({ group }) {
  const q = useQuery({ queryKey: ['admin', 'settings', group], queryFn: () => adminApi.settings(group) });

  return (
    <Page title={GROUPS[group].title} sub={GROUPS[group].sub}>
      <Query q={q}>{(d) => <SettingsForm group={group} settings={d.settings} />}</Query>
      {group === 'mail' && <MailTest />}
    </Page>
  );
}
