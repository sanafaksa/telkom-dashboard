import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, HardDriveDownload, RotateCcw, Trash2 } from 'lucide-react';
import { logout } from '../../features/auth/auth';
import { adminApi } from '../../features/admin/api';
import { Btn, Card, DataTable, errText, Field, fmtBytes, fmtDate, inputCls, Modal, Notice, Page, Query } from '../../features/admin/kit';

function RestoreModal({ backup, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const restore = useMutation({
    mutationFn: () => adminApi.restoreBackup(backup.name, password, confirm),
    onSuccess: (res) => setDone(res.message),
    onError: (e) => setError(errText(e)),
  });

  if (done) {
    return (
      <Modal title="Restore selesai" onClose={logout} footer={<Btn variant="primary" onClick={logout}>Login ulang</Btn>}>
        <Notice>{done}</Notice>
      </Modal>
    );
  }

  return (
    <Modal
      title="Restore backup"
      sub={`${backup.name} · ${fmtDate(backup.created_at)}`}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="danger" icon={RotateCcw} busy={restore.isPending} disabled={confirm !== backup.name || !password} onClick={() => restore.mutate()}>
            Timpa data sekarang
          </Btn>
        </>
      }
    >
      <Notice tone="bad">
        Seluruh data aplikasi (pengguna, permission, EDK, Kuadran, MoM, audit log) akan diganti dengan isi backup ini.
        Kondisi saat ini disimpan otomatis sebagai backup pengaman, dan semua pengguna harus login ulang.
      </Notice>
      <Notice tone="bad">{error}</Notice>
      <Field label="Ketik nama file backup untuk konfirmasi" hint={backup.name}>
        <input className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" spellCheck={false} />
      </Field>
      <Field label="Password Anda">
        <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </Field>
    </Modal>
  );
}

export default function Backups() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'backups'], queryFn: adminApi.backups });
  const [note, setNote] = useState('');
  const [restoring, setRestoring] = useState(null);
  const [msg, setMsg] = useState(null);

  const reload = () => qc.invalidateQueries({ queryKey: ['admin', 'backups'] });
  const fail = (e) => setMsg({ tone: 'bad', text: errText(e) });

  const create = useMutation({
    mutationFn: () => adminApi.createBackup(note || null),
    onSuccess: (res) => {
      setNote('');
      setMsg({ tone: 'ok', text: `Backup ${res.name} dibuat.` });
      reload();
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (name) => adminApi.deleteBackup(name),
    onSuccess: () => {
      setMsg({ tone: 'ok', text: 'Backup dihapus.' });
      reload();
    },
    onError: fail,
  });
  const download = useMutation({ mutationFn: (name) => adminApi.downloadBackup(name), onError: fail });

  return (
    <Page title="Backup & Restore" sub="Cadangkan seluruh data aplikasi dan pulihkan saat diperlukan.">
      <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>

      <Card title="Buat backup baru">
        <form
          className="flex flex-wrap items-end gap-2 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="min-w-60 flex-1">
            <Field label="Catatan (opsional)">
              <input className={inputCls} value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="mis. Sebelum upload EDK November" />
            </Field>
          </div>
          <Btn type="submit" variant="primary" icon={HardDriveDownload} busy={create.isPending}>Buat backup</Btn>
        </form>
      </Card>

      <Query q={q}>
        {(d) => (
          <Card title={`Backup tersimpan (${d.backups.length})`}>
            <DataTable
              rows={d.backups}
              rowKey="name"
              empty="Belum ada backup."
              columns={[
                {
                  key: 'name',
                  label: 'File',
                  render: (b) => (
                    <div>
                      <code className="font-semibold text-slate-800">{b.name}</code>
                      {b.note && <p className="text-[11px] text-mute">{b.note}</p>}
                    </div>
                  ),
                },
                { key: 'created_at', label: 'Dibuat', render: (b) => fmtDate(b.created_at), className: 'whitespace-nowrap' },
                { key: 'rows', label: 'Baris', className: 'text-right', render: (b) => b.rows.toLocaleString('id-ID') },
                { key: 'size', label: 'Ukuran', className: 'text-right whitespace-nowrap', render: (b) => fmtBytes(b.size) },
                {
                  key: 'act',
                  label: '',
                  className: 'text-right whitespace-nowrap',
                  render: (b) => (
                    <div className="flex justify-end gap-1.5">
                      <Btn icon={Download} busy={download.isPending && download.variables === b.name} onClick={() => download.mutate(b.name)}>Unduh</Btn>
                      <Btn icon={RotateCcw} onClick={() => setRestoring(b)}>Restore</Btn>
                      <Btn
                        variant="danger"
                        icon={Trash2}
                        busy={remove.isPending && remove.variables === b.name}
                        onClick={() => window.confirm(`Hapus backup ${b.name}?`) && remove.mutate(b.name)}
                      >
                        Hapus
                      </Btn>
                    </div>
                  ),
                },
              ]}
            />
            <p className="border-t border-line px-5 py-3 text-[11px] text-mute">
              Isi backup: {d.tables.join(', ')}. Sesi login, cache, dan antrean tidak ikut dicadangkan.
            </p>
          </Card>
        )}
      </Query>

      {restoring && <RestoreModal backup={restoring} onClose={() => setRestoring(null)} />}
    </Page>
  );
}
