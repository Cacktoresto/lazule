import { useMemo } from 'react';
import { loadSensoryWishlist, loadTasteMemoryStore } from '../utils/tasteMemoryStore.js';
import { buildUserAtmosphereProfile } from '../ai/userAtmosphereProfile.js';
import { deriveLivingPresence } from '../ai/presenceEditorialEngine.js';
import { buildRevisitNarrative } from '../ai/revisitNarrativeEngine.js';
import { deriveIdentityRecommendations } from '../ai/identityRecommendationLayer.js';
import { buildIdentityDiscoveryStream } from '../ai/identityDiscoveryStream.js';
import { buildLivingMemoryTimeline } from '../ai/livingMemoryTimelineEngine.js';
import { describePresenceConfirmation } from '../ai/sensoryWishlistEngine.js';

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

function buildConstellation(memoryEvents = []) {
  return memoryEvents.slice(0, 6).map((event, index) => ({
    id: `${event.productSlug || event.productName || 'event'}-${index}`,
    title: event.productName || event.productSlug || 'Presença revisitada',
    note: event.reason || 'Descoberta que deixou rastro sensorial.',
    atmosphere: event.atmosphere || event.primaryAtmosphere || 'luxury clean',
  }));
}

export function AdaptiveIdentityLanding({ identityMemory }) {
  const memory = useMemo(() => loadTasteMemoryStore(), []);
  const profile = useMemo(() => buildUserAtmosphereProfile(memory.profile), [memory.profile]);
  const livingPresence = useMemo(() => deriveLivingPresence(profile), [profile]);
  const wishlist = useMemo(() => loadSensoryWishlist(), []);
  const revisitNarrative = useMemo(() => buildRevisitNarrative(memory.events), [memory.events]);
  const discoveryStream = useMemo(() => buildIdentityDiscoveryStream({ profile, sensoryWishlist: wishlist.presences, revisitNarrative }), [profile, wishlist.presences, revisitNarrative]);
  const recommendations = useMemo(() => deriveIdentityRecommendations({
    phase: livingPresence.phase,
    dominantSignature: signature,
    sensoryWishlist: wishlist.presences,
    revisitNarrative,
    emotionalConstellations: profile.topAtmospheres,
  }), [livingPresence.phase, signature, wishlist.presences, revisitNarrative, profile.topAtmospheres]);
  const memoryTimeline = useMemo(() => buildLivingMemoryTimeline({ events: memory.events, revisitNarrative, discoveryStream }), [memory.events, revisitNarrative, discoveryStream]);

  const constellation = buildConstellation(memory.events);

  const auraHints = [
    ...(auraLexicon[profile.primaryFamily] || []),
    profile.density === 'dense' ? 'noturna' : 'equilibrada',
    profile.motionCadence,
  ].slice(0, 5);

  const auraGradient = {
    backgroundImage: `radial-gradient(circle at 14% 18%, ${livingPresence.glow}, transparent 32%), radial-gradient(circle at 82% 2%, ${livingPresence.accent}, transparent 28%)`,
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <div className="relative overflow-hidden rounded-[2rem] border border-lazule-gold/20 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-90 transition-opacity duration-[2200ms]" style={auraGradient} />
        <div className="pointer-events-none absolute inset-0 animate-[pulse_11s_ease-in-out_infinite] opacity-20" style={{ background: `radial-gradient(circle_at_50%_65%,${livingPresence.glow},transparent_56%)` }} />

        <div className="relative space-y-7 transition-all duration-700">
          <p className="text-xs uppercase tracking-[0.35em] text-lazule-gold/80">Living identity surface</p>
          <h1 className="text-3xl text-white sm:text-5xl">Bem-vindo de volta, {identityMemory?.label || 'presença LAZULE'}.</h1>
          <p className="max-w-3xl text-lazule-mist/80">{livingPresence.phaseNarrative}</p>

          <article className="rounded-2xl border border-lazule-gold/20 bg-black/15 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Atmospheric return sequence</p>
            <p className="mt-2 max-w-3xl text-sm text-lazule-mist/80">{livingPresence.key === 'mineral_aquatic' ? 'A LAZULE reconhece uma continuidade mineral refinada.' : 'Sua presença recente continua silenciosa e sofisticada.'}</p>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Assinatura viva</p>
              <p className="mt-2 text-sm text-white">{signature}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Aura sensorial</p>
              <p className="mt-2 text-sm text-white">{auraHints.join(' · ')}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Cadência editorial</p>
              <p className="mt-2 text-sm text-white">{livingPresence.recommendationRhythm.cadenceLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Wardrobe intelligence</p>
              <p className="mt-2 text-sm text-white">{livingPresence.wardrobeNarrative}</p>
            </article>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Olfactive phase visualization</p>
              <p className="mt-2 text-sm text-lazule-mist/75">{livingPresence.phaseNarrative}</p>
              <ul className="mt-4 space-y-2 text-sm text-lazule-mist/85">
                {profile.topAtmospheres.slice(0, 4).map((item) => <li key={item}>• {item.replaceAll('_', ' ')}</li>)}
              </ul>
            </article>

            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Recommendation rhythm engine</p>
              <p className="mt-2 text-sm text-lazule-mist/80">Revelação {livingPresence.recommendationRhythm.revealSpeed}, espaçamento {livingPresence.recommendationRhythm.spacing} e densidade {livingPresence.recommendationRhythm.density}.</p>
              <p className="mt-3 text-sm text-lazule-mist/65">A continuidade ajusta intensidade e silêncio sem parecer análise técnica.</p>
            </article>
          </div>

          <article className="rounded-2xl border border-lazule-gold/20 bg-gradient-to-b from-lazule-gold/10 to-transparent p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Memory constellation surface</p>
            <p className="mt-2 text-sm text-lazule-mist/75">Presenças que continuam orbitando sua assinatura.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {constellation.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-3 transition-opacity duration-[1600ms]">
                  <p className="text-sm text-white">{entry.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-lazule-gold/70">{entry.atmosphere}</p>
                  <p className="mt-2 text-xs text-lazule-mist/70">{entry.note}</p>
                </div>
              ))}
            </div>
          </article>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Curadoria futura</p>
              <p className="mt-2 text-sm text-lazule-mist/80">{wishlist.presences[0] ? describePresenceConfirmation(wishlist.presences[0]) : 'Atmosferas desejadas começam a compor sua próxima assinatura.'}</p>
              <ul className="mt-3 space-y-2 text-xs text-lazule-mist/70">
                {wishlist.presences.slice(-3).reverse().map((presence) => (
                  <li key={`${presence.perfumeSlug}-${presence.timestamp}`}>• {presence.perfumeName || presence.perfumeSlug} · {presence.atmosphere}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Adaptive identity recommendations</p>
              <p className="mt-2 text-sm text-lazule-mist/80">{recommendations.continuityNarratives[0]}</p>
              <p className="mt-2 text-xs text-lazule-mist/65">{revisitNarrative.narrative}</p>
            </article>
          </div>

          <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Identity discovery stream</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {discoveryStream.map((line) => <p key={line} className="text-sm text-lazule-mist/80">{line}</p>)}
            </div>
          </article>

          <article className="rounded-2xl border border-lazule-gold/20 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Living memory timeline</p>
            <div className="mt-3 space-y-2">
              {memoryTimeline.map((fragment) => (
                <div key={fragment.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm text-white">{fragment.title}</p>
                  <p className="text-xs text-lazule-mist/70">{fragment.note}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
