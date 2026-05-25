import { Component } from 'react';

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Falha em rota crítica', error);
    console.error('[ErrorBoundary] componentStack', info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="mx-auto flex min-h-[62vh] max-w-4xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full rounded-[2rem] border border-lazule-gold/25 bg-slate-950/72 p-8 text-center shadow-2xl backdrop-blur sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold/80">Recuperação de sessão</p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-5xl">Estamos restaurando a experiência.</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-lazule-mist/74 sm:text-base">
              Não foi possível carregar toda a camada inteligente deste conteúdo. Você ainda pode seguir no catálogo com os dados básicos.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a className="rounded-full border border-lazule-gold/50 px-5 py-2 text-sm font-semibold text-lazule-gold" href="/catalogo">Ir para catálogo</a>
              <button className="rounded-full bg-lazule-gold px-5 py-2 text-sm font-semibold text-lazule-night" type="button" onClick={() => window.location.reload()}>
                Recarregar página
              </button>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
