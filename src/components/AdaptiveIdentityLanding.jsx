import { useMemo } from 'react';
import { loadTasteMemoryStore } from '../utils/tasteMemoryStore.js';
import { buildUserAtmosphereProfile } from '../ai/userAtmosphereProfile.js';

const auraLexicon = {
  mineral: ['silenciosa', 'luminosa', 'precisa'],
  amber: ['densa', 'envolvente', 'sofisticada'],
  smoky: ['misteriosa', 'profunda', 'executiva'],
  fresh: ['expansiva', 'limpa', 'elegante'],
};

function inferDominantSignature(profile) {
  if (profile.topAtmospheres.includes('amber_nocturne') || profile.density === 'dense') return 'Presença âmbar sofisticada';
  if (profile.topAtmospheres.includes('smoky_executive')) return 'Aura executiva silenciosa';
  if (profile.topAtmospheres.includes('mineral_aquatic')) return 'Luxo clean mineral';
  return 'Atmosfera noturna refinada';
}

function buildEvolutionNarrative(profile) {
  if (profile.recentShift === 'denser') {
    return 'Seu gosto recente começou a orbitar atmosferas mais densas e sofisticadas.';
  }

  if (profile.recentShift === 'mineral') {
    return 'A LAZULE percebe uma inclinação crescente para atmosferas minerais refinadas.';
  }

  return 'Você mantém uma assinatura fresca, com nuances cada vez mais autorais.';
}

function buildTimeline(memoryEvents = []) {
  return memoryEvents.slice(0, 4).map((event, index) => ({
    id: `${event.productSlug || event.productName || 'event'}-${index}`,
    title: event.productName || event.productSlug || 'Presença revisitada',
    note: event.reason || 'Descoberta que deixou rastro sensorial.',
    atmosphere: event.atmosphere || event.primaryAtmosphere || 'luxury clean',
  }));
}

export function AdaptiveIdentityLanding({ identityMemory }) {
  const memory = useMemo(() => loadTasteMemoryStore(), []);
  const profile = useMemo(() => buildUserAtmosphereProfile(memory.profile), [memory.profile]);

  const signature = inferDominantSignature(profile);
  const evolutionNarrative = buildEvolutionNarrative(profile);
  const timeline = buildTimeline(memory.events);

  const auraHints = [
    ...(auraLexicon[profile.primaryFamily] || []),
    profile.density === 'dense' ? 'noturna' : 'equilibrada',
    profile.motionCadence,
  ].slice(0, 5);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <div className="relative overflow-hidden rounded-[2rem] border border-lazule-gold/20 bg-slate-950/70 p-6 shadow-2xl backdrop-blur sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(200,162,77,0.20),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.20),transparent_26%)]" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.35em] text-lazule-gold/80">Continuidade sensorial</p>
          <h1 className="mt-4 text-3xl text-white sm:text-5xl">Bem-vindo de volta, {identityMemory?.label || 'presença LAZULE'}.</h1>
          <p className="mt-4 max-w-3xl text-lazule-mist/80">Sua atmosfera recente continua orbitando {identityMemory?.aura || 'frescor mineral'} e presença sofisticada.</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-lazule-mist/70">{evolutionNarrative}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Sua assinatura</p>
              <p className="mt-2 text-sm text-white">{signature}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Aura sensorial</p>
              <p className="mt-2 text-sm text-white">{auraHints.join(' · ')}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Densidade</p>
              <p className="mt-2 text-sm capitalize text-white">{profile.density}</p>
            </article>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Sua atmosfera</p>
              <ul className="mt-3 space-y-2 text-sm text-lazule-mist/85">
                {profile.topAtmospheres.slice(0, 4).map((item) => <li key={item}>• {item.replaceAll('_', ' ')}</li>)}
              </ul>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Contextos recorrentes</p>
              <ul className="mt-3 space-y-2 text-sm text-lazule-mist/85">
                {profile.contexts.slice(0, 4).map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </article>
          </div>

          <article className="mt-8 rounded-2xl border border-lazule-gold/20 bg-gradient-to-b from-lazule-gold/10 to-transparent p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Memória olfativa viva</p>
            <p className="mt-2 text-sm text-lazule-mist/75">Atmosferas revisitadas recentemente e descobertas que continuam orbitando sua assinatura.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {timeline.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm text-white">{entry.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-lazule-gold/70">{entry.atmosphere}</p>
                  <p className="mt-2 text-xs text-lazule-mist/70">{entry.note}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
