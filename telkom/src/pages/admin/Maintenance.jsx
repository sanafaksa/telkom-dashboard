import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Wrench } from 'lucide-react';
import { adminApi } from '../../features/admin/api';
import { Btn, Card, errText, Field, inputCls, Notice, Page, Query } from '../../features/admin/kit';

function MaintenanceForm({ data }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(data.maintenance_mode);
  const [message, setMessage] = useState(data.maintenance_message ?? '');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setEnabled(data.maintenance_mode);
    setMessage(data.maintenance_message ?? '');
  }, [data]);

  const save = useMutation({
    mutationFn: () => adminApi.saveMaintenance({ maintenance_mode: enabled, maintenance_message: message }),
    onSuccess: (res) => {
      setMsg({ tone: 'ok', text: res.maintenance_mode ? 'Mode pemeliharaan diaktifkan.' : 'Mode pemeliharaan dinonaktifkan.' });
      qc.invalidateQueries({ queryKey: ['admin', 'maintenance'] });
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
  });

  const dirty = enabled !== data.maintenance_mode || message !== (data.maintenance_message ?? '');

  return (
    <>
      <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>
      <Card title="Mode pemeliharaan">
        <div className="space-y-5 p-5">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="mt-0.5 size-4 cursor-pointer accent-[#2563EB]"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">Aktifkan mode pemeliharaan</span>
              <span className="block text-xs text-mute mt-0.5">
                Saat aktif, pengguna selain Super Admin tidak bisa masuk dan melihat pesan di bawah.
              </span>
            </span>
          </label>

          <Field label="Pesan pemeliharaan" hint="Maksimal 300 karakter.">
            <textarea
              className={`${inputCls} mt-1 min-h-24`}
              maxLength={300}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>

          <div className="flex justify-end">
            <Btn variant="primary" icon={Save} disabled={!dirty} busy={save.isPending} onClick={() => save.mutate()}>
              Simpan
            </Btn>
          </div>
        </div>
      </Card>
    </>
  );
}

export default function Maintenance() {
  const q = useQuery({ queryKey: ['admin', 'maintenance'], queryFn: adminApi.maintenance });

  return (
    <Page
      title="Mode Pemeliharaan"
      sub="Atur mode pemeliharaan sistem. Super Admin tetap bisa masuk saat mode ini aktif."
    >
      <div className="flex items-center gap-2 text-xs text-mute">
        <Wrench size={14} /> Perubahan langsung berlaku untuk semua pengguna.
      </div>
      <Query q={q}>
        {(d) => (
          <>
            <MaintenanceForm data={d} />
            <ReminderForm data={d} />
          </>
        )}
      </Query>
    </Page>
  );
}

// ISO (UTC) → nilai untuk <input type="datetime-local"> dalam zona waktu perangkat
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function ReminderForm({ data }) {
  const qc = useQueryClient();
  const [startLocal, setStartLocal] = useState(toLocalInput(data.maintenance_schedule_at));
  const [lead, setLead] = useState(data.maintenance_lead_minutes ?? 10);
  const [remMsg, setRemMsg] = useState(data.maintenance_reminder_message ?? '');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setStartLocal(toLocalInput(data.maintenance_schedule_at));
    setLead(data.maintenance_lead_minutes ?? 10);
    setRemMsg(data.maintenance_reminder_message ?? '');
  }, [data]);

  const save = useMutation({
    mutationFn: (body) => adminApi.saveMaintenance(body),
    onSuccess: (res) => {
      setMsg({ tone: 'ok', text: res.maintenance_schedule_at ? 'Pengingat pemeliharaan disimpan. Pengguna akan melihat notifikasi otomatis.' : 'Jadwal pemeliharaan dihapus.' });
      qc.invalidateQueries({ queryKey: ['admin', 'maintenance'] });
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
  });

  const submit = () =>
    save.mutate({
      maintenance_schedule_at: startLocal ? new Date(startLocal).toISOString() : null,
      maintenance_lead_minutes: Number(lead),
      maintenance_reminder_message: remMsg,
    });

  const clear = () => {
    setStartLocal('');
    save.mutate({ maintenance_schedule_at: null });
  };

  return (
    <>
      <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>
      <Card title="Pengingat pemeliharaan terjadwal">
        <div className="space-y-5 p-5">
          <p className="text-xs text-mute">
            Pengingat tampil otomatis di layar semua pengguna (login maupun belum login) dalam beberapa menit sebelum waktu mulai.
            Pengingat ini tidak mengaktifkan mode pemeliharaan; aktifkan mode di atas saat pemeliharaan dimulai.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Waktu mulai pemeliharaan">
              <input
                type="datetime-local"
                className={`${inputCls} mt-1`}
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </Field>
            <Field label="Tampil berapa menit sebelumnya" hint="1–1440 menit">
              <input
                type="number"
                min={1}
                max={1440}
                className={`${inputCls} mt-1`}
                value={lead}
                onChange={(e) => setLead(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Pesan pengingat">
            <textarea
              className={`${inputCls} mt-1 min-h-20`}
              maxLength={300}
              value={remMsg}
              onChange={(e) => setRemMsg(e.target.value)}
            />
          </Field>

          <div className="flex flex-wrap justify-end gap-2">
            {data.maintenance_schedule_at && (
              <Btn variant="danger" busy={save.isPending} onClick={clear}>
                Hapus jadwal
              </Btn>
            )}
            <Btn variant="primary" icon={Save} disabled={!startLocal || Number(lead) < 1} busy={save.isPending} onClick={submit}>
              Simpan pengingat
            </Btn>
          </div>
        </div>
      </Card>
    </>
  );
}
