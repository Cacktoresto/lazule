export function EmptyAnalyticsState() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-lazule-gold/35 bg-lazule-night/55 p-6 text-center">
      <p className="font-display text-xl text-lazule-mist">Sem dados locais ainda.</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-lazule-mist/68">
        Navegue pelo site para gerar eventos de teste. O dashboard usa somente sinais agregados do snapshot local, sem dados pessoais.
      </p>
    </div>
  );
}
