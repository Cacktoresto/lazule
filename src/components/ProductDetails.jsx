import { useEffect, useMemo, useRef, useState } from 'react';
import { formatBRL } from '../utils/currency';
import { getAllProducts, getProductBySlug } from '../data/catalogRepository';
import { getProductRecommendations } from '../utils/catalog';
import { similarPerfumes } from '../data/generated/similarPerfumes.js';
import { getSimilarPerfumesForProduct } from '../ai/similarPerfumeEngine.js';
import { trackBrandClick, trackCouponManualApply, trackCouponRemoved, trackEvent, trackProductView, trackRecommendationClick, trackReferralManualApply, trackWhatsappClick } from '../utils/analytics';
import { createBrandPath, createProductPath, createProductSlug } from '../utils/productRouting';
import { createProductWhatsAppLink } from '../utils/whatsapp';
import { canDirectBuy, getCommercialStatusMeta } from '../utils/commercialStatus';
import { applyManualReferralCode, getReferralChangeEventName, getReferralContext, removeReferralField } from '../utils/referral';
import { applyProductSeo, createCanonicalUrl } from '../utils/seo';
import { ProductImageFallback } from './ProductCard';
import { generateOlfactiveRelationships, getExplorableOlfactiveTerms } from '../ai/olfactiveRelationships';
import { createPerfumeExperience } from '../ai/perfumeExperience';

function normalizeProductClassifier(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bfemininos\b/g, 'feminino')
    .replace(/\bmasculinos\b/g, 'masculino');
}

function shouldShowGender(category, gender) {
  const normalizedGender = normalizeProductClassifier(gender);

  if (!normalizedGender) {
    return false;
  }

  return normalizeProductClassifier(category) !== normalizedGender;
}

function getProductDisplayName(product) {
  return String(product?.name || '').split('|').pop().trim() || product?.name;
}

function getProductEssence(product) {
  const normalizedCategory = normalizeProductClassifier(product.category);
  const normalizedGender = normalizeProductClassifier(product.gender);
  const normalizedName = normalizeProductClassifier(product.name);
  const normalizedReference = normalizeProductClassifier(product.olfactoryReference);

  if (normalizedReference.includes('bleu') || normalizedName.includes('blue') || normalizedName.includes('bleu')) {
    return 'Sofisticado, magnético e limpo para presença imediata.';
  }

  if (normalizedReference.includes('erba') || normalizedName.includes('gold')) {
    return 'Solar, marcante e envolvente para deixar rastro.';
  }

  if (normalizedReference.includes('delina') || normalizedGender === 'feminino') {
    return 'Elegante, luminoso e viciante para momentos memoráveis.';
  }

  if (normalizedCategory.includes('arabe')) {
    return 'Intenso, opulento e moderno para noites de impacto.';
  }

  if (normalizedGender === 'masculino') {
    return 'Confiante, refinado e presente sem esforço.';
  }

  return 'Elegante, intenso e viciante para noites especiais.';
}

function createEditorialGallery(product) {
  const slides = [
    {
      id: 'hero',
      src: product.image,
      alt: `Perfume ${product.name}`,
      label: 'Frasco em destaque',
      tone: 'from-lazule-royal via-lazule-night to-lazule-blue',
    },
    {
      id: 'mood',
      src: product.image,
      alt: `Atmosfera editorial do perfume ${product.name}`,
      label: 'Mood editorial',
      tone: 'from-[#07111f] via-lazule-royal to-lazule-night',
    },
    {
      id: 'detail',
      src: product.image,
      alt: `Detalhe premium do perfume ${product.name}`,
      label: 'Detalhe LAZULE',
      tone: 'from-lazule-night via-[#122b62] to-[#050816]',
    },
  ];

  return product.image ? slides : slides.slice(0, 1);
}

function preloadProductImage(image) {
  if (!image) {
    return undefined;
  }

  const existingPreload = Array.from(document.querySelectorAll('link[data-lazule-product-preload]')).some(
    (preloadLink) => preloadLink.getAttribute('data-lazule-product-preload') === image,
  );

  if (existingPreload) {
    return undefined;
  }

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = image;
  link.fetchPriority = 'high';
  link.setAttribute('data-lazule-product-preload', image);
  document.head.appendChild(link);

  return () => {
    link.remove();
  };
}


function ReferralCouponBadge({ coupon, className = '' }) {
  if (!coupon) {
    return null;
  }

  return (
    <div className={`inline-flex items-center rounded-full border border-lazule-gold/35 bg-lazule-gold/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-lazule-gold shadow-aureate/20 backdrop-blur ${className}`}>
      Cupom aplicado: {coupon}
    </div>
  );
}

function getAppliedReferralLabel(referralContext = {}) {
  if (referralContext.coupon) {
    return { type: 'coupon', label: 'Cupom aplicado', value: referralContext.coupon };
  }

  if (referralContext.ref) {
    return { type: 'ref', label: 'Código aplicado', value: referralContext.ref };
  }

  return null;
}

function ManualReferralForm({ product, referralContext }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const appliedCode = getAppliedReferralLabel(referralContext);
  const productSlug = createProductSlug(product?.name);

  function buildAnalyticsPayload(extraPayload = {}) {
    return {
      source_page: 'product',
      product_id: product?.id,
      product_slug: productSlug,
      product_name: product?.name,
      ...extraPayload,
    };
  }

  function handleSubmit(event) {
    event.preventDefault();
    const result = applyManualReferralCode(code);

    if (!result.ok) {
      setFeedback('');
      setError(result.error || 'Não foi possível aplicar este código.');
      return;
    }

    setError('');
    setFeedback(result.type === 'coupon' ? 'Cupom aplicado à experiência LAZULE.' : 'Código de indicação conectado à sua curadoria.');
    setCode('');

    if (result.type === 'coupon') {
      trackCouponManualApply(buildAnalyticsPayload({ coupon: result.coupon }));
    } else {
      trackReferralManualApply(buildAnalyticsPayload({ ref: result.ref }));
    }
  }

  function handleRemove() {
    if (!appliedCode) {
      return;
    }

    const result = removeReferralField(appliedCode.type);

    if (result.ok) {
      setError('');
      setFeedback('Benefício removido com segurança.');
      trackCouponRemoved(buildAnalyticsPayload({ [appliedCode.type]: appliedCode.value }));
    }
  }

  return (
    <div className="mt-6 rounded-[1.6rem] border border-lazule-night/10 bg-white/45 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:border-white/10 lg:bg-white/[0.045]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lazule-royal lg:text-lazule-gold">Tem cupom ou código de indicação?</p>
      <form className="mt-3 flex gap-2" onSubmit={handleSubmit}>
        <input
          className="min-w-0 flex-1 rounded-full border border-lazule-night/10 bg-white/70 px-4 py-2.5 text-sm text-lazule-night outline-none transition placeholder:text-slate-400 focus:border-lazule-gold/70 focus:ring-2 focus:ring-lazule-gold/20 lg:border-white/10 lg:bg-lazule-night/45 lg:text-lazule-mist"
          type="text"
          inputMode="text"
          autoComplete="off"
          value={code}
          maxLength={80}
          onChange={(event) => {
            setCode(event.target.value);
            if (error) setError('');
            if (feedback) setFeedback('');
          }}
          placeholder="Cupom ou código do parceiro"
          aria-label="Cupom ou código do parceiro"
        />
        <button className="lazule-pressable rounded-full border border-lazule-gold/45 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lazule-royal transition hover:bg-lazule-gold hover:text-lazule-night lg:text-lazule-gold" type="submit">
          Aplicar
        </button>
      </form>
      <div className="mt-3 min-h-5 text-xs leading-5">
        {error ? <p className="text-red-600 lg:text-red-200" role="alert">{error}</p> : null}
        {!error && feedback ? <p className="text-emerald-700 lg:text-emerald-200" role="status">{feedback}</p> : null}
        {!error && appliedCode ? (
          <p className="flex flex-wrap items-center gap-2 text-slate-600 lg:text-slate-300">
            <span><strong className="text-lazule-royal lg:text-lazule-gold">{appliedCode.label}:</strong> {appliedCode.value}</span>
            <button className="lazule-pressable text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500 underline decoration-lazule-gold/40 underline-offset-4 transition hover:text-lazule-gold" type="button" onClick={handleRemove}>
              Remover
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DetailImage({ product }) {
  const gallery = useMemo(() => createEditorialGallery(product), [product]);
  const galleryRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loadedImages, setLoadedImages] = useState(() => new Set());

  function updateActiveSlide(nextSlide) {
    setActiveSlide((currentSlide) => (currentSlide === nextSlide ? currentSlide : nextSlide));
  }

  function handleScroll(event) {
    const nextSlide = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth);
    const boundedSlide = Math.min(Math.max(nextSlide, 0), gallery.length - 1);
    updateActiveSlide(boundedSlide);
    trackEvent('image_gallery_interaction', { product_id: product.id, product_name: product.name, slide_index: boundedSlide, interaction_type: 'scroll' }, { dedupeKey: `gallery|${product.id}|${boundedSlide}`, dedupeMs: 2000 });
  }

  function handleIndicatorClick(index) {
    const galleryNode = galleryRef.current;

    if (!galleryNode) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    galleryNode.scrollTo({ left: galleryNode.clientWidth * index, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    updateActiveSlide(index);
    trackEvent('image_gallery_interaction', { product_id: product.id, product_name: product.name, slide_index: index, interaction_type: 'indicator_click' });
  }

  function handleImageLoad(slideId) {
    setLoadedImages((currentImages) => {
      if (currentImages.has(slideId)) {
        return currentImages;
      }

      return new Set(currentImages).add(slideId);
    });
  }

  return (
    <div className="lazule-product-hero relative overflow-hidden rounded-b-[2.35rem] border-b border-lazule-gold/20 bg-lazule-night shadow-mineral lg:rounded-[3rem] lg:border">
      <div
        ref={galleryRef}
        className="lazule-product-gallery flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
        onScroll={handleScroll}
        aria-label={`Galeria editorial do produto ${product.name}`}
        tabIndex={0}
      >
        {gallery.map((slide, index) => {
          const isLoaded = loadedImages.has(slide.id);
          const scale = index === 1 ? 1.055 : index === 2 ? 1.095 : 1;

          return (
            <figure
              className={`lazule-product-hero-frame relative w-full shrink-0 snap-center overflow-hidden bg-gradient-to-br ${slide.tone}`}
              key={slide.id}
              aria-label={`${index + 1} de ${gallery.length}: ${slide.label}`}
            >
              <div className="lazule-product-atmosphere absolute inset-0" aria-hidden="true" />
              <div className="lazule-product-stage absolute left-1/2 top-[52%]" aria-hidden="true" />
              {product?.image ? (
                <>
                  {!isLoaded && <div className="lazule-product-skeleton absolute" aria-hidden="true" />}
                  <img
                    className={`lazule-product-bottle lazule-product-bottle--${slide.id} absolute left-1/2 object-contain transition duration-700 ${isLoaded ? 'opacity-95 blur-0' : 'opacity-0 blur-sm'}`}
                    src={product.image}
                    alt={slide.alt}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    style={{ '--bottle-scale': scale }}
                    onLoad={() => handleImageLoad(slide.id)}
                    onError={() => handleImageLoad(slide.id)}
                  />
                </>
              ) : (
                <ProductImageFallback label="Imagem em atualização" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-lazule-night via-lazule-night/10 to-transparent" aria-hidden="true" />
              <figcaption className="absolute bottom-7 left-6 text-[0.62rem] uppercase tracking-[0.34em] text-lazule-gold/80 sm:left-8">
                {slide.label}
              </figcaption>
            </figure>
          );
        })}
      </div>
      {gallery.length > 1 && (
        <div className="absolute bottom-7 right-6 flex items-center gap-1.5 sm:right-8" role="group" aria-label="Selecionar imagem da galeria">
          {gallery.map((slide, index) => (
            <button
              className={`lazule-product-dot h-1 rounded-full transition-all duration-300 ${activeSlide === index ? 'w-6 bg-lazule-gold' : 'w-1.5 bg-white/35'}`}
              key={slide.id}
              type="button"
              aria-label={`Ver ${slide.label}`}
              aria-current={activeSlide === index ? 'true' : undefined}
              onClick={() => handleIndicatorClick(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductNotFound() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 lg:py-28">
      <div className="overflow-hidden rounded-[2.5rem] border border-lazule-gold/20 bg-white/[0.055] p-8 text-center shadow-mineral backdrop-blur sm:p-12">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-lazule-gold">Curadoria LAZULE</p>
        <h1 className="font-display text-4xl text-lazule-mist sm:text-5xl">Produto não encontrado.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">
          Esta fragrância pode ter mudado de endereço ou saído da seleção atual. Volte ao catálogo para consultar a curadoria disponível.
        </p>
        <a
          className="lazule-premium-button lazule-cta-shimmer mt-8 inline-flex rounded-full bg-lazule-gold px-7 py-3.5 font-semibold text-lazule-night shadow-aureate"
          href="/catalogo"
        >
          Voltar ao catálogo
        </a>
      </div>
    </section>
  );
}

function ProductAccordion({ title, children, defaultOpen = false, product }) {
  function handleToggle(event) {
    if (event.currentTarget.open) {
      trackEvent('accordion_open', { product_id: product?.id, product_name: product?.name, accordion_title: title, source_page: 'product' });
    }
  }

  return (
    <details className="lazule-product-accordion group border-t border-lazule-night/10 py-5 first:border-t-0 lg:border-white/10" open={defaultOpen} onToggle={handleToggle}>
      <summary className="lazule-pressable flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl text-left text-sm font-semibold uppercase tracking-[0.22em] text-lazule-night transition hover:text-lazule-gold focus-visible:px-2 lg:text-lazule-mist">
        {title}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-lazule-night/10 bg-lazule-night/[0.04] text-lazule-gold transition group-open:rotate-45 lg:border-white/10 lg:bg-white/[0.04]">
          +
        </span>
      </summary>
      <div className="lazule-product-accordion-panel pt-4 text-sm leading-7 text-slate-700 lg:text-slate-300">{children}</div>
    </details>
  );
}

function getVibeItems(product) {
  const normalizedCategory = normalizeProductClassifier(product.category);
  const normalizedGender = normalizeProductClassifier(product.gender);
  const normalizedReference = normalizeProductClassifier(product.olfactoryReference);
  const base = ['presença forte', 'elegante sem esforço'];

  if (normalizedCategory.includes('arabe')) {
    base.unshift('noite intensa', 'rastro opulento');
  } else {
    base.unshift('assinatura sofisticada', 'rotina premium');
  }

  if (normalizedReference || normalizedGender === 'unissex') {
    base.push('descoberta sensorial');
  }

  if (normalizedGender === 'feminino') {
    base.push('encontro luminoso');
  } else if (normalizedGender === 'masculino') {
    base.push('executivo noturno');
  } else {
    base.push('clima frio');
  }

  return [...new Set(base)].slice(0, 6);
}

function getAccordionItems(product, description, olfactoryReference) {
  const notes = olfactoryReference
    ? `DNA olfativo inspirado em ${olfactoryReference}, com leitura moderna e acabamento marcante.`
    : `Curadoria LAZULE com perfil ${String(product.category || '').toLowerCase()} e assinatura pensada para presença.`;

  return [
    {
      title: 'Notas olfativas',
      content: notes,
      defaultOpen: true,
    },
    {
      title: 'Performance',
      content: 'Selecionado para quem busca projeção elegante, sem perder a sensação refinada na pele.',
    },
    {
      title: 'Ocasião',
      content: `${product.narrative || getProductEssence(product)} Ideal para transformar um momento simples em assinatura pessoal.`,
    },
    {
      title: 'Similaridades',
      content: olfactoryReference ? `Para quem gosta da direção olfativa de ${olfactoryReference}.` : 'A curadoria aproxima este perfume de famílias olfativas desejadas, mantendo descoberta e personalidade.',
    },
    {
      title: 'Fixação',
      content: 'Fixação percebida como confortável para uso social. A duração pode variar conforme pele, clima e quantidade aplicada.',
    },
    {
      title: 'Sobre a fragrância',
      content: description || product.narrative || 'Uma escolha premium da LAZULE FRAGRANCES para quem prefere perfumes com identidade, presença e acabamento elegante.',
    },
  ];
}


function trackExperienceEvent(eventName, experience, extra = {}, options) {
  trackEvent(eventName, {
    product_slug: experience.productSlug,
    status: experience.status,
    dominant_dimensions: experience.dominantDimensions,
    source_page: 'product',
    ...extra,
  }, options);
}

function PerfumeExperienceLayer({ product, experience, whatsAppLink }) {
  return (
    <section className="lazule-reveal mt-10 overflow-hidden rounded-[2.65rem] border border-lazule-gold/20 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_32rem),linear-gradient(145deg,rgba(10,20,42,0.94),rgba(4,8,18,0.88))] p-5 shadow-mineral backdrop-blur sm:p-7 lg:mt-14 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Perfil olfativo</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist sm:text-4xl">DNA olfativo</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Um mapa sensorial da curadoria LAZULE — leitura estética do perfume, sem promessas científicas absolutas.
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-lazule-gold/20 bg-lazule-gold/10 p-4 text-sm leading-6 text-lazule-mist lg:max-w-sm">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Assinatura LAZULE</p>
          <p className="mt-2 font-display text-2xl leading-tight">{experience.signature.text}</p>
          {experience.inCuration ? <p className="mt-2 text-xs text-slate-300">Perfil olfativo em curadoria.</p> : null}
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {experience.dimensions.map((dimension, index) => (
            <button
              key={dimension.id}
              type="button"
              className="lazule-dna-row lazule-reveal-item w-full rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-4 text-left transition hover:border-lazule-gold/35 hover:bg-white/[0.07]"
              style={{ '--item-delay': `${index * 55}ms`, '--dna-width': `${Math.round(dimension.value * 100)}%` }}
              onClick={() => trackExperienceEvent('dna_dimension_click', experience, { dimension: dimension.id, dimension_level: dimension.level })}
            >
              <span className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-lazule-mist">{dimension.label}</span>
                <span className="shrink-0 rounded-full border border-lazule-gold/20 bg-lazule-gold/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lazule-gold">{dimension.level}</span>
              </span>
              <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <span className="lazule-dna-meter block h-full rounded-full bg-gradient-to-r from-lazule-gold/75 via-[#dfbd68] to-white/80" />
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-400">{dimension.tone}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <ExperienceChipPanel title="Ideal para" eyebrow="Uso ideal" items={experience.idealUsage} experience={experience} eventName="ideal_usage_click" />
          <PerformancePanel performance={experience.performance} />
          <div className="rounded-[1.6rem] border border-white/10 bg-lazule-night/45 p-5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Status comercial</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{experience.statusCta.supportingCopy}</p>
            <a
              className="lazule-premium-button mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-lazule-gold px-5 text-sm font-semibold text-lazule-night shadow-aureate"
              href={whatsAppLink}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackWhatsappClick({ product_id: product.id, product_slug: experience.productSlug, product_name: product.name, price: product.salePrice, source_page: 'product', cta_location: 'experience_status' })}
            >
              {experience.statusCta.ctaLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExperienceChipPanel({ title, eyebrow, items, experience, eventName }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-5">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">{eyebrow}</p>
      <h3 className="mt-2 font-display text-2xl text-lazule-mist">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={`${item.type}-${item.label}`}
            type="button"
            className="lazule-touch-card min-h-10 rounded-full border border-lazule-gold/20 bg-lazule-gold/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-lazule-gold"
            onClick={() => trackExperienceEvent(eventName, experience, { usage_type: item.type, usage_label: item.label })}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PerformancePanel({ performance }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-5">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Presença</p>
      <h3 className="mt-2 font-display text-2xl text-lazule-mist">Performance esperada</h3>
      <div className="mt-4 space-y-3">
        {performance.map((item) => (
          <div key={item.id} className="rounded-2xl bg-lazule-night/45 p-3" style={{ '--dna-width': `${Math.round(item.value * 100)}%` }}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-200">{item.label}</span>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[0.64rem] uppercase tracking-[0.12em] text-lazule-gold">{item.level}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <span className="lazule-dna-meter block h-full rounded-full bg-gradient-to-r from-lazule-gold/70 to-white/70" />
            </div>
            {item.disclaimer ? <p className="mt-2 text-[0.68rem] leading-4 text-slate-400">{item.disclaimer}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function VibeSection({ product }) {
  const vibeItems = getVibeItems(product);

  return (
    <section className="lazule-reveal mt-10 rounded-[2.4rem] border border-lazule-gold/15 bg-white/[0.045] p-6 shadow-mineral backdrop-blur sm:p-8 lg:mt-14">
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-lazule-gold">Vibe</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vibeItems.map((item, index) => (
          <div
            className="lazule-touch-card lazule-reveal-item rounded-full border border-white/10 bg-lazule-night/35 px-4 py-3 text-sm text-lazule-mist"
            key={item}
            style={{ '--item-delay': `${index * 55}ms` }}
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function RecommendationCard({ product, context = 'recommendations', explanation }) {
  return (
    <a
      className="lazule-product-card group flex min-h-[19rem] w-[78vw] max-w-[19rem] shrink-0 snap-start flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-mineral backdrop-blur transition md:w-[20rem]"
      href={createProductPath(product)}
      onClick={() => trackRecommendationClick(product, { source_page: 'product_recommendations', section: context })}
    >
      <div className="relative min-h-44 overflow-hidden bg-lazule-depth">
        {product.image ? (
          <img
            className="absolute inset-0 h-full w-full object-contain p-5 opacity-90 transition duration-500 group-hover:scale-105"
            src={product.image}
            alt={`Perfume ${product.name}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <ProductImageFallback />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-lazule-night/60 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.26em] text-lazule-gold">{product.brand}</p>
          <h3 className="mt-2 line-clamp-2 font-display text-2xl leading-tight text-lazule-mist group-hover:text-lazule-gold">
            {getProductDisplayName(product)}
          </h3>
          <p className="mt-3 line-clamp-1 text-xs text-slate-400">DNA: {humanizeSignature(product.signature || product.olfactoryReference || 'Perfil olfativo em curadoria')}</p>
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-300">{explanation || product.semanticReasons?.[0] || product.narrative || 'Conexão por assinatura olfativa e contexto de uso.'}</p>
        </div>
        <strong className="mt-5 text-base text-lazule-mist">{canDirectBuy(product) ? formatBRL(product.salePrice) : getCommercialStatusMeta(product).badge}</strong>
      </div>
    </a>
  );
}


function OlfactiveDiscoveryTerms({ product }) {
  const terms = getExplorableOlfactiveTerms(product, { limit: 9 });

  if (!terms.length) {
    return null;
  }

  return (
    <section className="lazule-reveal mt-10 rounded-[2.4rem] border border-lazule-gold/15 bg-white/[0.045] p-6 shadow-mineral backdrop-blur sm:p-8 lg:mt-14">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-lazule-gold">Mapa olfativo</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist">Explore notas e acordes</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-300">Toque em uma nota para descobrir perfumes com a mesma assinatura.</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {terms.map((item) => (
          <a
            key={`${item.type}-${item.term}`}
            className="lazule-premium-button rounded-full border border-lazule-gold/25 bg-lazule-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night"
            href={`/catalogo?busca=${encodeURIComponent(item.term)}`}
            onClick={() => trackEvent('olfactive_term_exploration', {
              product_id: product.id,
              product_slug: product.productSlug,
              product_name: product.name,
              term_type: item.type,
              term: item.term,
              source_page: 'product',
              privacy: 'olfactive_taxonomy_only',
            })}
          >
            {item.label}
          </a>
        ))}
      </div>
    </section>
  );
}

function RelationshipBlocks({ sections, currentProduct, experience }) {
  if (!sections.length) {
    return null;
  }

  return (
    <section className="lazule-reveal mt-10 rounded-[2.5rem] border border-lazule-gold/15 bg-white/[0.035] p-5 shadow-mineral backdrop-blur sm:p-7 lg:mt-14 lg:p-8">
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Relações olfativas</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist sm:text-4xl">Descoberta por assinatura</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-300">Conexões explicáveis por acordes, notas, DNA, vibe e disponibilidade — curadoria, não comparação de clones.</p>
      </div>
      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.id} onMouseEnter={() => trackEvent('relationship_block_engagement', {
            product_id: currentProduct.id,
            product_slug: currentProduct.productSlug,
            relationship_block: section.id,
            item_count: section.items.length,
            source_page: 'product',
          }, { dedupeKey: `relationship_block|${currentProduct.id}|${section.id}`, dedupeMs: 12000 })}>
            <div className="mb-4">
              <h3 className="font-display text-2xl text-lazule-mist">{section.title}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">{section.subtitle}</p>
            </div>
            <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
              {section.items.map((item) => (
                <div key={`${section.id}-${item.product.id ?? item.product.productSlug}`} onClick={() => {
                  trackExperienceEvent('related_signature_click', experience, {
                    related_product_slug: item.product.productSlug || createProductSlug(item.product.name),
                    relationship_block: section.id,
                    relationship_score: item.score,
                  });
                  trackEvent(section.id === 'available_alternatives' ? 'alternative_perfume_click' : 'relationship_click', {
                  product_id: currentProduct.id,
                  product_slug: currentProduct.productSlug,
                  related_product_id: item.product.id,
                  related_product_slug: item.product.productSlug,
                  relationship_block: section.id,
                  relationship_score: item.score,
                  source_page: 'product',
                  conversion_type: section.id === 'available_alternatives' ? 'unavailable_to_in_stock' : undefined,
                  });
                }}>
                  <RecommendationCard product={item.product} context={section.id} explanation={item.explanation} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SimilarPerfumeSections({ groups = {} }) {
  const [isVisible, setIsVisible] = useState(false);
  const railRef = useRef(null);

  useEffect(() => {
    if (!railRef.current || isVisible) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      });
    }, { rootMargin: "240px" });
    observer.observe(railRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  const sections = [
    { key: "highlySimilar", title: "Perfumes com DNA parecido" },
    { key: "complementary", title: "Mesma vibe, outra assinatura" },
    { key: "adventurousAlternatives", title: "Para explorar algo mais ousado" },
  ].filter((section) => (groups[section.key] || []).length > 0);

  if (!sections.length) return null;

  return (
    <section ref={railRef} className="lazule-reveal mt-10 rounded-[2.5rem] border border-lazule-gold/15 bg-white/[0.035] p-5 shadow-mineral backdrop-blur sm:p-7 lg:mt-14 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Consultoria olfativa</p>
      </div>
      {!isVisible ? <div className="h-24 animate-pulse rounded-2xl bg-white/5" /> : sections.map((section) => (
        <div key={section.key} className="mb-8 last:mb-0">
          <h3 className="mb-4 font-display text-2xl text-lazule-mist">{section.title}</h3>
          <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
            {(groups[section.key] || []).map((item) => (
              <RecommendationCard key={item.slug} product={item} context={section.key} explanation={item.explanation} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Recommendations({ products }) {
  if (!products.length) {
    return null;
  }

  return (
    <section className="lazule-reveal mt-10 rounded-[2.5rem] border border-lazule-gold/15 bg-white/[0.035] p-5 shadow-mineral backdrop-blur sm:p-7 lg:mt-14 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Descoberta emocional</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist sm:text-4xl">Você também pode gostar</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-300">
          Seleção guiada por vibe, DNA olfativo, performance e ocasião — como uma conversa de boutique.
        </p>
      </div>
      <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
        {products.map((product) => (
          <RecommendationCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function StickyWhatsAppBar({ product, whatsAppLink, referralContext }) {
  const disabled = !whatsAppLink;
  const directBuy = canDirectBuy(product);
  const statusMeta = getCommercialStatusMeta(product);
  const appliedCode = getAppliedReferralLabel(referralContext);

  return (
    <div className="lazule-sticky-whatsapp fixed inset-x-0 bottom-0 z-[70] border-t border-lazule-gold/20 bg-lazule-night/90 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 shadow-[0_-18px_60px_rgba(2,6,23,0.52)] backdrop-blur-xl lg:hidden" role="region" aria-label="Compra rápida pelo WhatsApp">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] uppercase tracking-[0.22em] text-slate-400">Preço LAZULE</p>
          <strong className="block truncate text-lg text-lazule-mist">{directBuy ? formatBRL(product.salePrice) : 'Sob consulta'}</strong>
          {appliedCode ? (
            <p className="mt-1 truncate text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-lazule-gold/85">
              {appliedCode.label}: {appliedCode.value}
            </p>
          ) : null}
        </div>
        <a
          className={`lazule-premium-button lazule-cta-shimmer inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-lazule-gold px-5 text-sm font-bold text-lazule-night shadow-aureate transition active:scale-[0.98] ${disabled ? 'pointer-events-none opacity-60' : ''}`}
          href={whatsAppLink || '#'}
          aria-disabled={disabled}
          aria-label={`${directBuy ? 'Comprar' : 'Consultar'} ${product.name || 'fragrância LAZULE'} pelo WhatsApp`}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            trackEvent('sticky_cta_click', { product_id: product.id, product_name: product.name, source_page: 'product', cta_location: 'sticky_cta' });
            trackWhatsappClick({ product_id: product.id, product_slug: createProductSlug(product.name), product_name: product.name, price: product.salePrice, source_page: 'product', cta_location: 'sticky_cta' });
          }}
        >
          {directBuy ? 'WhatsApp' : statusMeta.shortCtaLabel}
        </a>
      </div>
    </div>
  );
}

export function ProductDetails({ slug }) {
  const catalogProducts = useMemo(() => getAllProducts(), []);
  const normalizedSlug = createProductSlug(slug);
  const product = getProductBySlug(normalizedSlug, catalogProducts);
  const recommendations = useMemo(() => (product ? getProductRecommendations(product, catalogProducts) : []), [catalogProducts, product]);
  const similarGroups = useMemo(() => (product ? getSimilarPerfumesForProduct(product, similarPerfumes) : {}), [product]);
  const relationshipSections = useMemo(() => (product ? generateOlfactiveRelationships(product, catalogProducts, { limit: 4 }) : []), [catalogProducts, product]);
  const experience = useMemo(() => (product ? createPerfumeExperience(product) : null), [product]);
  const [referralContext, setReferralContext] = useState(() => getReferralContext());

  useEffect(() => {
    const eventName = getReferralChangeEventName();
    const refreshReferralContext = () => setReferralContext(getReferralContext());

    refreshReferralContext();
    window.addEventListener(eventName, refreshReferralContext);

    return () => window.removeEventListener(eventName, refreshReferralContext);
  }, []);

  useEffect(() => {
    if (!product) {
      return undefined;
    }

    applyProductSeo(product);
    trackProductView(product, { source_page: 'product' });

    return preloadProductImage(product.image);
  }, [product]);

  useEffect(() => {
    if (!product || !experience) {
      return;
    }

    trackExperienceEvent('perfume_dna_view', experience, {}, { dedupeKey: `perfume_dna_view|${experience.productSlug}`, dedupeMs: 30000 });
    trackExperienceEvent('olfactive_signature_view', experience, {}, { dedupeKey: `signature_view|${experience.productSlug}`, dedupeMs: 30000 });
    trackExperienceEvent('performance_profile_view', experience, {}, { dedupeKey: `performance_view|${experience.productSlug}`, dedupeMs: 30000 });
  }, [product, experience]);

  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll('.lazule-reveal'));

    if (!revealItems.length) {
      return undefined;
    }

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 },
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [product]);

  if (!product) {
    return <ProductNotFound />;
  }

  const description = String(product.description || '').trim();
  const olfactoryReference = String(product.olfactoryReference || '').trim();
  const productUrl = createCanonicalUrl(createProductPath(product));
  const whatsAppLink = createProductWhatsAppLink(product, { productUrl, referralContext });
  const directBuy = canDirectBuy(product);
  const statusMeta = getCommercialStatusMeta(product);
  const showGender = shouldShowGender(product.category, product.gender);
  const accordionItems = getAccordionItems(product, description, olfactoryReference);

  return (
    <section className="mx-auto max-w-7xl pb-32 lg:px-8 lg:py-20">
      <div className="lg:hidden">
        <a className="absolute left-5 top-5 z-20 rounded-full border border-white/10 bg-lazule-night/45 px-4 py-2 text-xs font-semibold text-lazule-gold backdrop-blur transition hover:text-[#dfbd68]" href="/catalogo">
          ← catálogo
        </a>
      </div>
      <a className="mb-8 hidden text-sm font-semibold text-lazule-gold transition hover:text-[#dfbd68] lg:inline-flex" href="/catalogo">
        ← Voltar ao catálogo
      </a>

      <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr] lg:items-start lg:gap-10">
        <DetailImage product={product} />

        <article className="lazule-hero-copy lazule-product-info-card relative z-10 mx-4 rounded-[2.35rem] border border-white/10 bg-[#f7f2e8]/[0.965] text-lazule-night shadow-mineral backdrop-blur lg:mt-0 lg:rounded-[3rem] lg:bg-white/[0.065] lg:p-10 lg:text-lazule-mist">
          <a className="text-xs font-semibold uppercase tracking-[0.34em] text-lazule-royal transition hover:text-lazule-gold lg:text-lazule-gold" href={createBrandPath(product.brand)} onClick={() => trackBrandClick(product.brand, { source_page: 'product_details' })}>
            {product.brand}
          </a>
          <h1 className="mt-4 font-display text-4xl leading-[0.98] text-lazule-night sm:text-5xl lg:text-6xl lg:text-lazule-mist">
            {getProductDisplayName(product)}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-700 lg:text-slate-300">{getProductEssence(product)}</p>
          <div className="mt-7 flex items-end justify-between gap-5 border-y border-lazule-night/10 py-5 lg:border-white/10">
            <div>
              <span className="text-[0.65rem] uppercase tracking-[0.25em] text-slate-500">Preço</span>
              <strong className="mt-1 block text-3xl text-lazule-night lg:text-lazule-mist">{directBuy ? formatBRL(product.salePrice) : 'Sob consulta'}</strong>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[0.68rem] ${product.availability.className}`}>{product.availability.label}</span>
          </div>

          <ReferralCouponBadge coupon={referralContext.coupon} className="mt-5" />

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-600 lg:text-slate-300">
            <span>{product.category}</span>
            {showGender && <span>• {product.gender}</span>}
            {olfactoryReference && <span>• DNA {olfactoryReference}</span>}
          </div>

          <ManualReferralForm product={product} referralContext={referralContext} />

          <a
            className="lazule-premium-button lazule-cta-shimmer mt-6 hidden w-full items-center justify-center rounded-full bg-lazule-gold px-6 py-4 font-semibold text-lazule-night shadow-aureate transition active:scale-[0.99] lg:inline-flex"
            href={whatsAppLink}
            aria-label={`${directBuy ? 'Comprar' : 'Consultar'} ${product.name || 'fragrância LAZULE'} pelo WhatsApp`}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackWhatsappClick({ product_id: product.id, product_slug: createProductSlug(product.name), product_name: product.name, price: product.salePrice, source_page: 'product', cta_location: 'product_details' })}
          >
            {statusMeta.ctaLabel}
          </a>

          <p className="mt-4 text-sm leading-6 text-slate-600 lg:text-slate-300">{experience?.statusCta.supportingCopy}</p>

          <div className="mt-8 rounded-[2rem] border border-lazule-night/10 bg-white/45 px-5 lg:border-white/10 lg:bg-lazule-night/35">
            {accordionItems.map((item) => (
              <ProductAccordion key={item.title} title={item.title} defaultOpen={item.defaultOpen} product={product}>
                <p>{item.content}</p>
              </ProductAccordion>
            ))}
          </div>
        </article>
      </div>

      <div className="px-4 lg:px-0">
        <PerfumeExperienceLayer product={product} experience={experience} whatsAppLink={whatsAppLink} />
        <VibeSection product={product} />
        <OlfactiveDiscoveryTerms product={product} />
        <RelationshipBlocks sections={relationshipSections} currentProduct={product} experience={experience} />
        <SimilarPerfumeSections groups={similarGroups} />
        <Recommendations products={recommendations} />
      </div>
      <StickyWhatsAppBar product={product} whatsAppLink={whatsAppLink} referralContext={referralContext} />
    </section>
  );
}
