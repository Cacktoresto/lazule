import { useMemo, useState } from 'react';
import {
  aggregateAICommerceIntelligence,
  aggregateFunnel,
  aggregateMetrics,
  aggregateTopBrands,
  aggregateTopCategories,
  aggregateTopProducts,
  aggregateTopRecommendations,
  aggregateTopSearches,
  getAnalyticsEvents,
} from '../../utils/analyticsDashboard';
import { AnalyticsSection } from './AnalyticsSection';
import { AnalyticsTable } from './AnalyticsTable';
import { EmptyAnalyticsState } from './EmptyAnalyticsState';
import { FunnelSummary } from './FunnelSummary';
import { MetricCard } from './MetricCard';
import { PartnerInvitesAdmin } from './PartnerInvitesAdmin.jsx';
import { RankingList } from './RankingList';

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatPercent(value) {
  return `${((value || 0) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function useLocalAnalyticsDashboard() {
  const [refreshToken, setRefreshToken] = useState(0);

  const data = useMemo(() => {
    const events = getAnalyticsEvents();
    const metrics = aggregateMetrics(events);
    const products = aggregateTopProducts(events);
    const searches = aggregateTopSearches(events);

    return {
      events,
      metrics,
      products,
      searches,
      brands: aggregateTopBrands(events),
      categories: aggregateTopCategories(events),
      recommendations: aggregateTopRecommendations(events),
      aiCommerce: aggregateAICommerceIntelligence(events),
      funnel: aggregateFunnel(events),
    };
  }, [refreshToken]);

  return { ...data, refresh: () => setRefreshToken((current) => current + 1) };
}

export function AnalyticsDashboard() {
  const { events, metrics, products, searches, brands, categories, recommendations, aiCommerce, funnel, refresh } = useLocalAnalyticsDashboard();
  const hasEvents = events.length > 0;

  const summaryCards = [
    { label: 'Visitas', value: formatNumber(metrics.pageViews), helper: 'Sessões e páginas vistas na experiência.' },
    { label: 'Fragrâncias vistas', value: formatNumber(metrics.productViews), helper: 'Interesse por produto e assinatura olfativa.' },
    { label: 'Cliques WhatsApp', value: formatNumber(metrics.whatsappClicks), helper: 'Sinais de intenção comercial.', tone: 'gold' },
    { label: 'Produto → WhatsApp', value: formatPercent(metrics.productToWhatsappRate), helper: 'Conversão de intenção para conversa.' },
    { label: 'Buscas', value: formatNumber(metrics.searches), helper: 'Termos pesquisados no catálogo.' },
    { label: 'Desejos sem match', value: formatNumber(metrics.emptySearches), helper: 'Oportunidades de sortimento e curadoria.' },
    { label: 'Marcas clicadas', value: formatNumber(metrics.brandClicks), helper: 'Interesse por maison/marca.' },
    { label: 'Categorias', value: formatNumber(metrics.categoryClicks), helper: 'Curadorias acionadas.' },
    { label: 'Recomendações', value: formatNumber(metrics.recommendationClicks), helper: 'Cross-sell validado.' },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="lazule-surface-premium overflow-hidden rounded-[2.5rem] border border-lazule-gold/20 bg-lazule-depth p-6 shadow-mineral md:p-10">
        <div className="max-w-3xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-lazule-gold">LAZULE Business Intelligence</p>
          <h1 className="mt-4 font-display text-4xl text-lazule-mist md:text-5xl">Inteligência comercial</h1>
          <p className="mt-4 text-sm leading-7 text-lazule-mist/72 md:text-base">
            Leitura premium para transformar navegação, busca e intenção no WhatsApp em decisões de curadoria. Fonte atual: snapshot local recente, sem dados pessoais.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="lazule-premium-button rounded-full border border-lazule-gold/35 bg-lazule-gold/15 px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-lazule-gold" aria-label="Atualizar leitura de analytics" onClick={refresh}>
            Refinar leitura
          </button>
          <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-lazule-mist/68">{formatNumber(events.length)} eventos locais</span>
          <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-lazule-mist/68">Dados agregados</span>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => <MetricCard key={card.label} {...card} />)}
      </section>

      <PartnerInvitesAdmin />

      {!hasEvents ? <div className="mt-8"><EmptyAnalyticsState /></div> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <AnalyticsSection title="Funil comercial" eyebrow="Home / catálogo / produto / WhatsApp">
          <FunnelSummary steps={funnel} />
        </AnalyticsSection>

        <AnalyticsSection title="Produtos que movem intenção" eyebrow="Ranking comercial">
          <div className="grid gap-4 md:grid-cols-2">
            <RankingList
              title="Top visualizados"
              items={products.viewed}
              getPrimary={(item) => item.product_name}
              getSecondary={(item) => item.brand}
              getValue={(item) => `${formatNumber(item.views)} views`}
            />
            <RankingList
              title="Top WhatsApp"
              items={products.whatsapp}
              getPrimary={(item) => item.product_name}
              getSecondary={(item) => item.brand}
              getValue={(item) => `${formatNumber(item.whatsapp_clicks)} cliques`}
            />
          </div>
        </AnalyticsSection>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <AnalyticsSection title="Marcas" eyebrow="Demanda por brand">
          <RankingList
            title="Top marcas"
            items={brands}
            getPrimary={(item) => item.brand_name}
            getSecondary={(item) => `${formatNumber(item.clicks)} cliques · ${formatNumber(item.views)} views`}
            getValue={(item) => formatNumber(item.count)}
          />
        </AnalyticsSection>

        <AnalyticsSection title="Categorias" eyebrow="Curadoria">
          <RankingList
            title="Top categorias"
            items={categories}
            getPrimary={(item) => item.category_name}
            getValue={(item) => `${formatNumber(item.clicks)} cliques`}
          />
        </AnalyticsSection>

        <AnalyticsSection title="Recomendações" eyebrow="Cross-sell">
          <RankingList
            title="Top recomendações"
            items={recommendations}
            getPrimary={(item) => item.product_name}
            getSecondary={(item) => item.source_page}
            getValue={(item) => formatNumber(item.count)}
          />
        </AnalyticsSection>
      </div>


      <AnalyticsSection className="mt-6" title="AI Commerce Intelligence" eyebrow="Intenção anônima · DNA olfativo · curadoria assistida">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Consultas IA" value={formatNumber(aiCommerce.aiQueries)} helper="Pedidos processados pelo Assistente Olfativo." tone="gold" />
          <MetricCard label="IA → WhatsApp" value={formatPercent(aiCommerce.aiWhatsappRate)} helper="Conversão assistente para conversa comercial." />
          <MetricCard label="Sem resultado IA" value={formatNumber(aiCommerce.noResultSearches)} helper="Oportunidades de sortimento detectadas sem texto bruto." />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <RankingList
            title="Intenções dominantes"
            items={aiCommerce.dominantIntents}
            getPrimary={(item) => item.label}
            getValue={(item) => formatNumber(item.count)}
          />
          <RankingList
            title="Distribuição DNA"
            items={aiCommerce.dnaDistribution}
            getPrimary={(item) => item.label}
            getSecondary={() => 'doce · fresco · sedutor · elegante · trabalho · noite'}
            getValue={(item) => formatNumber(item.count)}
          />
          <RankingList
            title="Vibes em crescimento"
            items={aiCommerce.commonVibes}
            getPrimary={(item) => item.label}
            getValue={(item) => formatNumber(item.count)}
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <RankingList
            title="Mais recomendados pela IA"
            items={aiCommerce.recommendedProducts}
            getPrimary={(item) => item.product_name}
            getValue={(item) => formatNumber(item.count)}
          />
          <RankingList
            title="Mais clicados pela IA"
            items={aiCommerce.clickedProducts}
            getPrimary={(item) => item.product_name}
            getSecondary={(item) => `${formatNumber(item.whatsapp)} WhatsApp`}
            getValue={(item) => formatNumber(item.count)}
          />
          <RankingList
            title="Categorias relacionadas"
            items={aiCommerce.relatedCategories}
            getPrimary={(item) => item.label}
            getValue={(item) => formatNumber(item.count)}
          />
        </div>
      </AnalyticsSection>

      <AnalyticsSection className="mt-6" title="Inteligência de busca" eyebrow="Desejo declarado">
        <div className="grid gap-6 lg:grid-cols-2">
          <AnalyticsTable
            columns={[
              { key: 'search_term', label: 'Termo' },
              { key: 'count', label: 'Buscas', render: (row) => formatNumber(row.count) },
              { key: 'average_result_count', label: 'Média de resultados', render: (row) => row.average_result_count.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) },
            ]}
            rows={searches.all}
          />
          <AnalyticsTable
            columns={[
              { key: 'search_term', label: 'Busca sem resultado' },
              { key: 'count', label: 'Ocorrências', render: (row) => formatNumber(row.count) },
            ]}
            rows={searches.empty}
          />
        </div>
      </AnalyticsSection>
    </div>
  );
}
