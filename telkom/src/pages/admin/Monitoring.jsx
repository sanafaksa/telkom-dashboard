import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { adminApi } from '../../features/admin/api';
import { Btn, Card, fmtBytes, Page, Query } from '../../features/admin/kit';

function Meter({ label, used, total }) {
  const pct = total ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const tone = pct >= 90 ? 'bg-bad' : pct >= 75 ? 'bg-warn' : 'bg-ok';
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <b className="font-semibold text-slate-700">{label}</b>
        <span className="text-mute">
          {fmtBytes(used)} / {fmtBytes(total)} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const KeyValue = ({ data }) => (
  <dl className="divide-y divide-slate-100 text-xs">
    {Object.entries(data).map(([k, v]) => (
      <div key={k} className="flex justify-between gap-4 px-5 py-2.5">
        <dt className="text-mute">{k}</dt>
        <dd className="break-all text-right font-semibold text-slate-800">{v === null ? '—' : String(v)}</dd>
      </div>
    ))}
  </dl>
);

export default function Monitoring() {
  const q = useQuery({
    queryKey: ['admin', 'monitoring'],
    queryFn: adminApi.monitoring,
    refetchInterval: 30_000,
    staleTime: 0,
  });

  return (
    <Page
      title="System Monitoring"
      sub="Kesehatan server dan aplikasi. Diperbarui otomatis setiap 30 detik."
      actions={<Btn icon={RefreshCw} busy={q.isFetching} onClick={() => q.refetch()}>Muat ulang</Btn>}
    >
      <Query q={q}>
        {(d) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {d.checks.map((c) => (
                <div key={c.name} className="card flex items-center gap-3 p-4">
                  {c.ok ? <CheckCircle2 size={22} className="text-emerald-500" /> : <XCircle size={22} className="text-rose-500" />}
                  <div>
                    <p className="text-sm font-bold text-slate-800">{c.name}</p>
                    <p className="text-[11px] text-mute">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <Card title="Aplikasi">
                <KeyValue data={d.app} />
              </Card>

              <Card title="Sumber daya">
                <div className="space-y-4 p-5">
                  {d.resources.disk_total && (
                    <Meter label="Disk" used={d.resources.disk_total - d.resources.disk_free} total={d.resources.disk_total} />
                  )}
                  <KeyValue
                    data={{
                      'Memori request ini': fmtBytes(d.resources.memory_usage),
                      'Memori puncak': fmtBytes(d.resources.memory_peak),
                      'Batas memori PHP': d.resources.memory_limit,
                      'Ukuran laravel.log': fmtBytes(d.resources.log_size),
                    }}
                  />
                </div>
              </Card>

              <Card title="Data">
                <KeyValue data={d.counts} />
              </Card>
            </div>
          </>
        )}
      </Query>
    </Page>
  );
}
