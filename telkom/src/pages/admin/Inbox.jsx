import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { adminApi } from '../../features/admin/api';
import { Badge, Btn, Card, DataTable, errText, fmtDate, inputCls, Notice, Page, Query } from '../../features/admin/kit';

const STATUS_OPTIONS = [
  ['open', 'Belum ditangani'],
  ['done', 'Selesai'],
  ['all', 'Semua'],
];

export default function Inbox() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('open');
  const [msg, setMsg] = useState(null);

  const q = useQuery({
    queryKey: ['admin', 'help-requests', status],
    queryFn: () => adminApi.helpRequests(status),
    placeholderData: keepPreviousData,
  });

  const change = useMutation({
    mutationFn: ({ id, next }) => adminApi.updateHelpRequest(id, next),
    onSuccess: (res) => setMsg({ tone: 'ok', text: res.status === 'done' ? 'Aduan ditandai selesai.' : 'Aduan dibuka kembali.' }),
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'help-requests'] }),
  });

  const columns = [
    { key: 'created_at', label: 'Waktu', render: (r) => fmtDate(r.created_at) },
    { key: 'name', label: 'Nama', render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
    { key: 'nip', label: 'NIP' },
    { key: 'contact', label: 'Kontak' },
    {
      key: 'message',
      label: 'Pesan',
      className: 'min-w-64 whitespace-normal',
      render: (r) => <span className="leading-relaxed">{r.message}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) =>
        r.status === 'done' ? (
          <Badge tone="bg-emerald-50 text-emerald-700">Selesai</Badge>
        ) : (
          <Badge tone="bg-amber-50 text-amber-700">Baru</Badge>
        ),
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'text-right',
      render: (r) =>
        r.status === 'done' ? (
          <Btn icon={RotateCcw} disabled={change.isPending} onClick={() => change.mutate({ id: r.id, next: 'open' })}>
            Buka lagi
          </Btn>
        ) : (
          <Btn variant="primary" icon={CheckCircle2} disabled={change.isPending} onClick={() => change.mutate({ id: r.id, next: 'done' })}>
            Tandai selesai
          </Btn>
        ),
    },
  ];

  return (
    <Page
      title="Kotak Masuk Aduan"
      sub="Aduan lupa kata sandi dari user dan staff. Reset kata sandi tetap dilakukan lewat User Management."
    >
      <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>

      <div className="flex items-center gap-3">
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {q.data && <span className="text-xs text-mute">{q.data.open} aduan belum ditangani</span>}
      </div>

      <Query q={q}>
        {(d) => (
          <Card>
            <DataTable columns={columns} rows={d.items} empty="Tidak ada aduan." />
          </Card>
        )}
      </Query>
    </Page>
  );
}
