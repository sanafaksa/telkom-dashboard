import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, RefreshCw, Search } from 'lucide-react';
import { adminApi } from '../../features/admin/api';
import { Badge, Btn, Card, DataTable, errText, fmtBytes, inputCls, Notice, Page, Query } from '../../features/admin/kit';

const METHOD_TONE = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  PATCH: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-rose-100 text-rose-700',
};

export default function DevTools() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'dev'], queryFn: adminApi.dev, staleTime: 0 });
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState('');

  const run = useMutation({
    mutationFn: (action) => adminApi.runDev(action),
    onSuccess: (res) => {
      setMsg({ tone: 'ok', text: res.message });
      qc.invalidateQueries({ queryKey: ['admin', 'dev'] });
    },
    onError: (e) => setMsg({ tone: 'bad', text: errText(e) }),
  });

  return (
    <Page
      title="Developer Tools"
      sub="Pemeliharaan cache, log aplikasi, dan daftar route API."
      actions={<Btn icon={RefreshCw} busy={q.isFetching} onClick={() => q.refetch()}>Muat ulang</Btn>}
    >
      <Notice tone={msg?.tone} onClose={() => setMsg(null)}>{msg?.text}</Notice>

      <Query q={q}>
        {(d) => {
          const routes = d.routes.filter((r) => `${r.methods} ${r.uri} ${r.middleware}`.toLowerCase().includes(filter.toLowerCase()));
          return (
            <>
              <Card title="Aksi pemeliharaan">
                <div className="flex flex-wrap gap-2 p-5">
                  {d.actions.map((a) => (
                    <Btn
                      key={a.key}
                      icon={Play}
                      busy={run.isPending && run.variables === a.key}
                      onClick={() => window.confirm(`Jalankan: ${a.label}?`) && run.mutate(a.key)}
                    >
                      {a.label}
                    </Btn>
                  ))}
                </div>
              </Card>

              <Card title={`laravel.log (${fmtBytes(d.log.size)}) — ${d.log.lines.length} baris terakhir`}>
                <pre className="max-h-96 overflow-auto rounded-b-[14px] bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-200">
                  {d.log.lines.length ? d.log.lines.join('\n') : 'Log kosong.'}
                </pre>
              </Card>

              <Card title={`Route API (${routes.length})`}>
                <div className="border-b border-line p-4">
                  <label className="relative block">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className={`${inputCls} pl-9`} placeholder="Filter URI, method, atau middleware…" value={filter} onChange={(e) => setFilter(e.target.value)} />
                  </label>
                </div>
                <DataTable
                  rows={routes}
                  rowKey={(r) => `${r.methods} ${r.uri}`}
                  columns={[
                    { key: 'methods', label: 'Method', render: (r) => <Badge tone={METHOD_TONE[r.methods]}>{r.methods}</Badge> },
                    { key: 'uri', label: 'URI', render: (r) => <code className="text-slate-800">/{r.uri}</code> },
                    { key: 'middleware', label: 'Middleware', render: (r) => <code className="text-[10px] text-slate-500">{r.middleware}</code> },
                  ]}
                />
              </Card>
            </>
          );
        }}
      </Query>
    </Page>
  );
}
