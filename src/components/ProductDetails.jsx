import { useEffect, useMemo, useRef, useState } from 'react';
import { formatBRL } from '../utils/currency';
import { getAllProducts, getProductBySlug } from '../data/catalogRepository';
import { getProductRecommendations } from '../utils/catalog';
import { trackBrandClick, trackCouponManualApply, trackCouponRemoved, trackEvent, trackProductView, trackRecommendationClick, trackReferralManualApply, trackWhatsappClick } from '../utils/analytics';
import { createBrandPath, createProductPath, createProductSlug } from '../utils/productRouting';
import { createProductWhatsAppLink } from '../utils/whatsapp';
import { applyManualReferralCode, getReferralChangeEventName, getReferralContext, removeReferralField } from '../utils/referral';
import { applyProductSeo, createCanonicalUrl } from '../utils/seo';
import { ProductImageFallback } from './ProductCard';

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
      setError(result.error || 'Não foi possível aplicar este código.');
      return;
    }

    setError('');
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
          }}
          placeholder="Cupom ou código do parceiro"
          aria-label="Cupom ou código do parceiro"
        />
        <button className="rounded-full border border-lazule-gold/45 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lazule-royal transition hover:bg-lazule-gold hover:text-lazule-night lg:text-lazule-gold" type="submit">
          Aplicar
        </button>
      </form>
      <div className="mt-3 min-h-5 text-xs leading-5">
        {error ? <p className="text-red-600 lg:text-red-200">{error}</p> : null}
        {!error && appliedCode ? (
          <p className="flex flex-wrap items-center gap-2 text-slate-600 lg:text-slate-300">
            <span><strong className="text-lazule-royal lg:text-lazule-gold">{appliedCode.label}:</strong> {appliedCode.value}</span>
            <button className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500 underline decoration-lazule-gold/40 underline-offset-4 transition hover:text-lazule-gold" type="button" onClick={handleRemove}>
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
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-semibold uppercase tracking-[0.22em] text-lazule-night transition hover:text-lazule-gold lg:text-lazule-mist">
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
      content: `${getProductEssence(product)} Ideal para transformar um momento simples em assinatura pessoal.`,
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
      content: description || 'Uma escolha premium da LAZULE FRAGRANCES para quem prefere perfumes com identidade, presença e acabamento elegante.',
    },
  ];
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

function RecommendationCard({ product }) {
  return (
    <a
      className="lazule-product-card group flex min-h-[19rem] w-[78vw] max-w-[19rem] shrink-0 snap-start flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-mineral backdrop-blur transition md:w-[20rem]"
      href={createProductPath(product)}
      onClick={() => trackRecommendationClick(product, { source_page: 'product_recommendations', section: 'recommendations' })}
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
          {product.olfactoryReference && <p className="mt-3 line-clamp-1 text-xs text-slate-400">DNA: {product.olfactoryReference}</p>}
        </div>
        <strong className="mt-5 text-base text-lazule-mist">{formatBRL(product.salePrice)}</strong>
      </div>
    </a>
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
  const appliedCode = getAppliedReferralLabel(referralContext);

  return (
    <div className="lazule-sticky-whatsapp fixed inset-x-0 bottom-0 z-[70] border-t border-lazule-gold/20 bg-lazule-night/90 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 shadow-[0_-18px_60px_rgba(2,6,23,0.52)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] uppercase tracking-[0.22em] text-slate-400">Preço LAZULE</p>
          <strong className="block truncate text-lg text-lazule-mist">{formatBRL(product.salePrice)}</strong>
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
          aria-label={`Comprar ${product.name || 'fragrância LAZULE'} pelo WhatsApp`}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            trackEvent('sticky_cta_click', { product_id: product.id, product_name: product.name, source_page: 'product', cta_location: 'sticky_cta' });
            trackWhatsappClick({ product_id: product.id, product_slug: createProductSlug(product.name), product_name: product.name, price: product.salePrice, source_page: 'product', cta_location: 'sticky_cta' });
          }}
        >
          Comprar via WhatsApp
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
              <strong className="mt-1 block text-3xl text-lazule-night lg:text-lazule-mist">{formatBRL(product.salePrice)}</strong>
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
            aria-label={`Comprar ${product.name || 'fragrância LAZULE'} pelo WhatsApp`}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackWhatsappClick({ product_id: product.id, product_slug: createProductSlug(product.name), product_name: product.name, price: product.salePrice, source_page: 'product', cta_location: 'product_details' })}
          >
            Comprar via WhatsApp
          </a>

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
        <VibeSection product={product} />
        <Recommendations products={recommendations} />
      </div>
      <StickyWhatsAppBar product={product} whatsAppLink={whatsAppLink} referralContext={referralContext} />
    </section>
  );
}
