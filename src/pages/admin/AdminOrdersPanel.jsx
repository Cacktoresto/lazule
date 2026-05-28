import { useEffect, useMemo, useState } from 'react';

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function StatusPill({ status }) {
  const label = status || 'sem status';
  return <span className="rounded-full border border-lazule-gold/20 bg-lazule-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-lazule-gold">{label}</span>;
}

export function AdminOrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });

  useEffect(() => {
    let active = true;
    async function loadOrders() {
      setState({ loading: true, error: null });
      try {
        const response = await fetch('/api/admin/orders?limit=50');
        if (!response.ok) throw new Error('orders_unavailable');
        const data = await response.json();
        if (!active) return;
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setState({ loading: false, error: null });
      } catch (error) {
        if (!active) return;
        setState({ loading: false, error: error?.message || 'orders_unavailable' });
      }
    }
    loadOrders();
    return () => { active = false; };
  }, []);

  const metrics = useMemo(() => ({
    paid: orders.filter((order) => order.status === 'paid').length,
    pending: orders.filter((order) => ['awaiting_payment', 'pending', 'processing'].includes(order.status)).length,
    failed: orders.filter((order) => ['failed', 'cancelled', 'refunded'].includes(order.status)).length,
    revenue: orders.filter((order) => order.status === 'paid').reduce((sum, order) => sum + Number(order.total || 0), 0),
  }), [orders]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/76 p-6 shadow-2xl shadow-lazule-blue/15 backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold/75">Operação commerce</p>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Pedidos LAZULE</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-lazule-mist/68">Painel operacional conectado ao source of truth persistente: pedidos, pagamentos, Pix, timeline append-only, jobs e reconciliação.</p>
          </div>
          <a href="/admin/analytics" className="rounded-full border border-lazule-gold/25 px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-lazule-gold transition hover:bg-lazule-gold/10">Analytics</a>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Pagos" value={metrics.paid} />
          <Metric label="Pendentes" value={metrics.pending} />
          <Metric label="Falhados/cancelados" value={metrics.failed} />
          <Metric label="Receita paga" value={formatCurrency(metrics.revenue)} />
        </div>

        {state.loading ? <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-lazule-mist/70">Carregando pedidos persistentes…</div> : null}
        {state.error ? <div className="mt-8 rounded-2xl border border-red-300/20 bg-red-400/10 p-5 text-red-100/85">Não foi possível carregar pedidos. Verifique o segredo admin ou a conexão Supabase.</div> : null}

        {!state.loading && !state.error ? (
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.22em] text-lazule-mist/55">
                <tr>
                  <th className="px-4 py-4">Pedido</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Cliente</th>
                  <th className="px-4 py-4">Total</th>
                  <th className="px-4 py-4">Eventos</th>
                  <th className="px-4 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-950/40">
                {orders.map((order) => (
                  <tr key={order.id} className="align-top text-lazule-mist/78">
                    <td className="px-4 py-4 font-mono text-xs text-white/80">{order.id}</td>
                    <td className="px-4 py-4"><StatusPill status={order.status} /></td>
                    <td className="px-4 py-4">{order.customer?.email || order.customer_json?.email || '—'}</td>
                    <td className="px-4 py-4 text-white">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-4">{order.events?.length || 0}</td>
                    <td className="px-4 py-4"><a className="text-lazule-gold hover:underline" href={`/pedido/${order.id}`}>Ver timeline</a></td>
                  </tr>
                ))}
                {!orders.length ? (
                  <tr><td className="px-4 py-8 text-center text-lazule-mist/60" colSpan={6}>Nenhum pedido persistido ainda.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-lg font-semibold text-white">Jobs recentes</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {jobs.slice(0, 6).map((job) => <div key={job.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-xs text-lazule-mist/70"><b className="text-lazule-gold">{job.type}</b><br />{job.status} · {job.order_id || 'sem pedido'}</div>)}
            {!jobs.length ? <p className="text-sm text-lazule-mist/60">Nenhum job enfileirado.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs uppercase tracking-[0.22em] text-lazule-mist/50">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}
