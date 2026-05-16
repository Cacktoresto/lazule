import { useEffect } from 'react';
import { navigateSpa } from '../../utils/navigation.js';

export function InfluencerLoginRedirect() {
  useEffect(() => {
    navigateSpa('/admin/login');
  }, []);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-lazule-gold/20 bg-slate-950/72 p-8 shadow-2xl shadow-lazule-blue/20 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold/80">Influencers LAZULE</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Login em preparação</h1>
        <p className="mt-3 text-sm leading-7 text-lazule-mist/70">Nesta etapa, o login reutiliza a base segura do admin. O dashboard individual será criado futuramente.</p>
      </div>
    </section>
  );
}
