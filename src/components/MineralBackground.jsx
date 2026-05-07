const MINERAL_PARTICLES = [
  { left: '7%', top: '14%', size: '0.25rem', tone: 'bg-lazule-gold/45', delay: '0s', duration: '18s' },
  { left: '18%', top: '72%', size: '0.18rem', tone: 'bg-lazule-blue/50', delay: '-6s', duration: '22s' },
  { left: '29%', top: '30%', size: '0.16rem', tone: 'bg-lazule-gold/35', delay: '-11s', duration: '24s' },
  { left: '42%', top: '84%', size: '0.22rem', tone: 'bg-sky-300/30', delay: '-3s', duration: '20s' },
  { left: '54%', top: '18%', size: '0.2rem', tone: 'bg-lazule-gold/40', delay: '-14s', duration: '26s' },
  { left: '66%', top: '62%', size: '0.28rem', tone: 'bg-lazule-blue/45', delay: '-8s', duration: '21s' },
  { left: '78%', top: '36%', size: '0.16rem', tone: 'bg-lazule-gold/30', delay: '-17s', duration: '28s' },
  { left: '89%', top: '76%', size: '0.2rem', tone: 'bg-slate-100/25', delay: '-4s', duration: '23s' },
  { left: '94%', top: '20%', size: '0.24rem', tone: 'bg-lazule-gold/35', delay: '-13s', duration: '25s' },
];

export function MineralBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.18),transparent_28rem),radial-gradient(circle_at_82%_12%,rgba(200,162,77,0.10),transparent_24rem),radial-gradient(circle_at_52%_88%,rgba(30,58,138,0.24),transparent_30rem)]" />
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-lazule-blue/10 blur-3xl lazule-mineral-drift" />
      <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-lazule-gold/10 blur-3xl lazule-mineral-drift [animation-delay:-9s]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(115deg,transparent_0%,rgba(248,250,252,0.18)_44%,transparent_46%),linear-gradient(35deg,transparent_0%,rgba(200,162,77,0.14)_50%,transparent_52%)]" />

      {MINERAL_PARTICLES.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}`}
          className={`absolute rounded-full ${particle.tone} lazule-mineral-particle shadow-[0_0_18px_rgba(200,162,77,0.35)] blur-[0.2px]`}
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
}
