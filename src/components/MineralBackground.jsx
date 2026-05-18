import { useEffect, useState } from 'react';

const MINERAL_PARTICLES = [
  { left: '7%', top: '14%', size: '0.18rem', tone: 'bg-lazule-gold/45', delay: '0s', duration: '26s' },
  { left: '18%', top: '72%', size: '0.12rem', tone: 'bg-lazule-blue/40', delay: '-6s', duration: '31s' },
  { left: '29%', top: '30%', size: '0.14rem', tone: 'bg-lazule-gold/35', delay: '-11s', duration: '29s' },
  { left: '42%', top: '84%', size: '0.16rem', tone: 'bg-sky-200/20', delay: '-3s', duration: '33s' },
  { left: '54%', top: '18%', size: '0.14rem', tone: 'bg-lazule-gold/40', delay: '-14s', duration: '35s' },
  { left: '66%', top: '62%', size: '0.18rem', tone: 'bg-lazule-blue/35', delay: '-8s', duration: '30s' },
  { left: '78%', top: '36%', size: '0.12rem', tone: 'bg-lazule-gold/30', delay: '-17s', duration: '37s' },
  { left: '89%', top: '76%', size: '0.14rem', tone: 'bg-slate-100/20', delay: '-4s', duration: '32s' },
  { left: '94%', top: '20%', size: '0.16rem', tone: 'bg-lazule-gold/30', delay: '-13s', duration: '34s' },
];

const LIGHT_TRAILS = [
  { left: '9%', top: '22%', width: '18rem', rotate: '-18deg', delay: '-10s' },
  { left: '62%', top: '18%', width: '22rem', rotate: '12deg', delay: '-24s' },
  { left: '36%', top: '70%', width: '20rem', rotate: '-8deg', delay: '-36s' },
];

export function MineralBackground() {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return undefined;
    }

    let frame = 0;

    function handlePointerMove(event) {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        setCursor({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
        frame = 0;
      });
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <div
      className="lazule-atmosphere pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
      style={{ '--cursor-x': cursor.x, '--cursor-y': cursor.y }}
    >
      <div className="lazule-atmosphere__depth absolute inset-0" />
      <div className="lazule-atmosphere__nebula absolute inset-[-8%]" />
      <div className="lazule-atmosphere__wave absolute inset-[-12%]" />
      <div className="lazule-atmosphere__vignette absolute inset-0" />
      <div className="lazule-atmosphere__noise absolute inset-0" />
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-lazule-blue/10 blur-3xl lazule-mineral-drift" />
      <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-lazule-gold/10 blur-3xl lazule-mineral-drift [animation-delay:-9s]" />

      {LIGHT_TRAILS.map((trail) => (
        <span
          key={`${trail.left}-${trail.top}`}
          className="lazule-light-trail absolute h-px rounded-full bg-gradient-to-r from-transparent via-lazule-gold/35 to-transparent"
          style={{
            left: trail.left,
            top: trail.top,
            width: trail.width,
            rotate: trail.rotate,
            animationDelay: trail.delay,
          }}
        />
      ))}

      {MINERAL_PARTICLES.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}`}
          className={`absolute rounded-full ${particle.tone} lazule-mineral-particle shadow-[0_0_18px_rgba(200,162,77,0.30)] blur-[0.2px]`}
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
