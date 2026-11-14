import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database as DbIcon, Eye, Rows3, Table2, TriangleAlert } from 'lucide-react';
import { adminApi } from '../../features/admin/api';
import { Badge, Btn, Card, DataTable, fmtBytes, Modal, Page, Query, Stat } from '../../features/admin/kit';

function TablePreview({ name, onClose }) {
  const q = useQuery({ queryKey: ['admin', 'database', name], queryFn: () => adminApi.table(name) });

  return (
    <Modal title={`Tabel ${name}`} sub="25 baris pertama. Kolom sensitif disamarkan." onClose={onClose} wide>
      <Query q={q}>
        {(d) => (
          <>
            <div className="flex flex-wrap gap-1.5">
              {d.columns.map((c) => (
                <span key={c.name} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                  <b>{c.name}</b> · {c.type}
                  {c.nullable ? ' · null' : ''}
                </span>
              ))}
            </div>
            <div className="rounded-xl border border-line">
              <DataTable
                rows={d.rows}
                rowKey={(r, i) => i}
                empty="Tabel kosong."
                columns={d.columns.map((c) => ({
                  key: c.name,
                  label: c.name,
                  className: 'whitespace-nowrap max-w-60 truncate',
                  render: (r) => (r[c.name] === null ? <span className="text-slate-300">null</span> : String(r[c.name])),
                }))}
              />
            </div>
          </>
        )}
      </Query>
    </Modal>
  );
}

export default function Database() {
  const q = useQuery({ queryKey: ['admin', 'database'], queryFn: adminApi.database });
  const [preview, setPreview] = useState(null);

  return (
    <Page title="Database Management" sub="Inspeksi struktur dan isi database (hanya baca).">
      <Query q={q}>
        {(d) => (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat icon={DbIcon} label="Database" value={d.database} note={`${d.driver} ${d.version}`} />
              <Stat icon={Table2} label="Jumlah tabel" value={d.tables.length} />
              <Stat icon={Rows3} label="Total baris" value={d.total_rows.toLocaleString('id-ID')} />
              <Stat
                icon={TriangleAlert}
                label="Migration tertunda"
                value={d.pending.length}
                note={d.total_size ? `Ukuran data ${fmtBytes(d.total_size)}` : undefined}
                tone={d.pending.length ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <Card title="Tabel" className="lg:col-span-2">
                <DataTable
                  rows={d.tables}
                  rowKey="name"
                  columns={[
                    { key: 'name', label: 'Nama', render: (t) => <code className="font-semibold text-slate-800">{t.name}</code> },
                    { key: 'rows', label: 'Baris', className: 'text-right', render: (t) => t.rows.toLocaleString('id-ID') },
                    { key: 'size', label: 'Ukuran', className: 'text-right', render: (t) => fmtBytes(t.size) },
                    {
                      key: 'act',
                      label: '',
                      className: 'text-right',
                      render: (t) => <Btn icon={Eye} onClick={() => setPreview(t.name)}>Lihat</Btn>,
                    },
                  ]}
                />
              </Card>

              <Card title="Migration">
                <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto text-[11px]">
                  {d.pending.map((m) => (
                    <li key={m} className="flex items-center justify-between gap-2 px-5 py-2">
                      <code className="break-all text-slate-700">{m}</code>
                      <Badge tone="bg-amber-100 text-amber-700">Tertunda</Badge>
                    </li>
                  ))}
                  {d.migrations.map((m) => (
                    <li key={m.migration} className="flex items-center justify-between gap-2 px-5 py-2">
                      <code className="break-all text-slate-600">{m.migration}</code>
                      <span className="shrink-0 text-mute">batch {m.batch}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </>
        )}
      </Query>

      {preview && <TablePreview name={preview} onClose={() => setPreview(null)} />}
    </Page>
  );
}
