import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { formatBRL } from '../utils/currency';
import { getAllProducts, getProductBySlug } from '../data/catalogRepository';
import { getProductRecommendations, getProductRecommendationsAsync } from '../utils/catalog';
import { similarPerfumes } from '../data/generated/similarPerfumes.js';
import { trackBrandClick, trackCouponManualApply, trackCouponRemoved, trackEvent, trackProductView, trackRecommendationClick, trackReferralManualApply, trackWhatsappClick } from '../utils/analytics';
import { createBrandPath, createProductPath, createProductSlug } from '../utils/productRouting';
import { addToLuxurySelection } from '../commerce/cart/luxuryCartState';
import { createProductWhatsAppLink } from '../utils/whatsapp';
import { canDirectBuy, getCommercialStatusMeta } from '../utils/commercialStatus';
import { applyManualReferralCode, getReferralChangeEventName, getReferralContext, removeReferralField } from '../utils/referral';
import { applyProductSeo, createCanonicalUrl } from '../utils/seo';
import { ProductImageFallback } from './ProductCard';
import { loadProductExperienceRuntime, preloadSemanticRuntime } from '../ai/semanticRuntimeLoader';
import { humanizeSignature as importedHumanizeSignature } from '../utils/semanticPresentation';
import {
  createStoryFragments,
  resolvePresenceProfile,
  resolveSessionAtmosphere,
  trackPresenceEvent,
  updateMemoryWeights,
} from '../ai/presenceAwarenessEngine';
import { createHumanPerfumeReading } from '../ai/humanPerfumeReadingEngine';
import { loadTasteMemoryStore } from '../utils/tasteMemoryStore';
import { deriveTasteEvolution } from '../ai/tasteEvolutionEngine';
import { deriveIdentityTension } from '../ai/identityTensionEngine.js';
import { buildHumanPresenceReading } from '../ai/humanPresenceWritingEngine.js';
import { createHumanObservationFragments } from '../ai/humanObservationFragmentsEngine.js';
import { createEditorialOpinion } from '../ai/editorialOpinionEngine.js';
import { CHECKOUT_ERROR_MESSAGE, startMercadoPagoCheckout } from '../services/mercadoPagoCheckout.js';

class ProductSectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(`[ProductDetails:${this.props.sectionName}] section error`, error);
    console.error(`[ProductDetails:${this.props.sectionName}] componentStack`, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}


const humanizeSignature = typeof importedHumanizeSignature === 'function'
  ? importedHumanizeSignature
  : (value) => String(value || 'Perfil olfativo em curadoria');


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



function splitProductTerms(value) {
  if (Array.isArray(value)) return value.flatMap(splitProductTerms);
  if (value === undefined || value === null) return [];
  return String(value).split(/[;,|]/).map((entry) => entry.trim()).filter(Boolean);
}

function getProductOlfactiveSignals(product = {}) {
  const notes = splitProductTerms(product.notes);
  const text = normalizeProductClassifier([
    product.name,
    product.brand,
    product.category,
    product.catalogType,
    product.family,
    product.description,
    product.olfactoryReference,
    product.performanceLabel,
    product.projectionLabel,
    product.gender,
    product.badges,
    product.keywords,
    notes,
  ].flat().filter(Boolean).join(' '));
  const accordRules = [
    ['âmbar', /ambar|amber|resina|labdano|benjoim/],
    ['baunilha', /baunilha|vanilla|tonka/],
    ['cítrico', /citr|bergamota|limao|laranja|grapefruit/],
    ['fresco', /fresh|fresco|limpo|clean|azul|blue/],
    ['madeiras', /madeira|amadeir|woody|cedro|sandal|vetiver|patchouli/],
    ['floral', /floral|rosa|jasmim/],
    ['doce', /doce|sweet|gourmand|caramelo/],
    ['especiado', /spicy|especiad/],
    ['oud', /oud/],
    ['couro', /couro|leather/],
    ['almiscarado', /musk|almis/],
    ['aromático', /aromatic|aromatico|lavanda/],
  ];
  const accords = uniqueText([
    ...splitProductTerms(product.accords),
    ...splitProductTerms(product.keywords),
    ...accordRules.filter(([, pattern]) => pattern.test(text)).map(([label]) => label),
  ]).slice(0, 10);
  const vibes = splitProductTerms(product.vibeTags || product.vibe || product.vibes || product.tags);
  const occasions = splitProductTerms(product.occasionTags || product.occasions);
  const weather = splitProductTerms(product.weatherTags || product.weather);
  const family = uniqueText([product.family, product.category, product.catalogType].flatMap(splitProductTerms));
  const directions = uniqueText([...accords, ...family, ...getVibeItems(product)]).slice(0, 8);

  return { notes, accords, vibes, occasions, weather, family, directions };
}

function uniqueText(values = []) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function inferProductVolume(product = {}) {
  const source = [product.volume, product.size, product.name, product.description].filter(Boolean).join(' ');
  const match = String(source).match(/(\d{2,3})\s?ml/i);
  return match ? `${match[1]}ml` : 'Volume sob curadoria';
}

function inferProductConcentration(product = {}) {
  const source = normalizeProductClassifier([product.concentration, product.name, product.category, product.description].filter(Boolean).join(' '));
  if (/\b(xdp|extrait)\b/.test(source)) return 'Extrait de Parfum';
  if (/\b(parfum|le parfum)\b/.test(source)) return 'Parfum';
  if (/\b(edp|eau de parfum)\b/.test(source)) return 'Eau de Parfum';
  if (/\b(edt|eau de toilette)\b/.test(source)) return 'Eau de Toilette';
  return product.concentration || 'Concentração em curadoria';
}

function getCategoryLabel(product = {}) {
  return uniqueText([product.category, shouldShowGender(product.category, product.gender) ? product.gender : null]).join(' · ') || 'Fragrância';
}

function buildLuxuryDescriptor(product = {}, atmosphere = buildSemanticAtmosphere(product)) {
  const profileCopy = {
    'mineral-aquatic': 'Frescor polido com presença limpa.',
    'amber-oriental': 'Calor ambarado com profundidade elegante.',
    'amber-nocturne': 'Rastro noturno de presença envolvente.',
    'smoky-dark': 'Madeiras escuras com tensão refinada.',
    'luxury-clean': 'Elegância silenciosa para assinatura diária.',
    'floral-luminous': 'Luminosidade floral com acabamento macio.',
    signature: 'Presença refinada com assinatura moderna.',
  };
  return product.luxuryDescriptor || profileCopy[atmosphere.profile] || profileCopy.signature;
}

function buildAtmosphericSignature(product = {}, humanReading = {}) {
  return product.atmosphericSignature || humanReading.socialImpression || getProductEssence(product);
}

function buildOlfactiveIdentitySummary(product = {}, signature = '') {
  const signals = getProductOlfactiveSignals(product);
  const directions = uniqueText([...(signals.accords || []), ...(signals.directions || [])]).slice(0, 3);
  if (directions.length) return `Identidade ${directions.join(', ')} com leitura ${signature || 'editorial'}.`;
  return product.narrative || 'Uma leitura clara de presença, ocasião e assinatura.';
}

function buildWhyThisFragranceBullets(product = {}, experience = null, presenceReading = {}, humanReading = {}) {
  const signals = getProductOlfactiveSignals(product);
  const normalized = normalizeProductClassifier([
    product.name,
    product.category,
    product.gender,
    product.olfactoryReference,
    ...(signals.accords || []),
    ...(signals.vibes || []),
    ...(signals.occasions || []),
    ...(signals.weather || []),
    ...(experience?.dominantDimensions || []),
  ].flat().filter(Boolean).join(' '));

  const bullets = [];
  const add = (copy) => {
    if (copy && !bullets.includes(copy)) bullets.push(copy);
  };

  if (/noite|night|sedutor|intenso|oud|ambar|amber|doce|gourmand/.test(normalized)) add('ideal para noites elegantes');
  if (/office|trabalho|executivo|limpo|fresh|fresco|azul|citr/.test(normalized)) add('funciona bem em rotina executiva');
  if (/luxo|premium|elegante|nicho|royal|sofistic/.test(normalized)) add('transmite sofisticação discreta');
  if (/frio|ameno|madeira|woody|ambar|oriental/.test(normalized)) add('combina com clima ameno e ambientes refinados');
  if (/fresco|citr|marine|ocean|aquatic|praia|verao|summer/.test(normalized)) add('entrega frescor com acabamento arrumado');
  if (/floral|rosa|jasmim|feminino|luminos/.test(normalized)) add('traz presença luminosa sem excesso');
  if (experience?.idealUsage?.[0]?.label) add(`boa escolha para ${String(experience.idealUsage[0].label).toLowerCase()}`);
  if (presenceReading?.presenceDistance) add(`projeção de presença ${String(presenceReading.presenceDistance).toLowerCase()}`);
  add('excelente assinatura pessoal');
  add('leitura fácil para decidir com confiança');

  return bullets.slice(0, 4);
}

function createOlfactiveProfileRows(product = {}, experience = null, humanReading = {}, presenceReading = {}) {
  const signals = getProductOlfactiveSignals(product);
  const rows = [
    { label: 'Acordes', value: uniqueText(signals.accords).slice(0, 4).join(' · ') || humanizeSignature(product.signature || product.olfactoryReference || 'em curadoria') },
    { label: 'Famílias', value: uniqueText(signals.family).slice(0, 3).join(' · ') || getCategoryLabel(product) },
    { label: 'Ocasião', value: uniqueText(signals.occasions).slice(0, 3).join(' · ') || experience?.idealUsage?.map((item) => item.label).slice(0, 2).join(' · ') || humanReading.humanOccasion },
    { label: 'Clima', value: uniqueText(signals.weather).slice(0, 3).join(' · ') || presenceReading.temperaturePerception || 'ameno' },
    { label: 'Projeção', value: product.projectionLabel || experience?.performance?.find((item) => item.id === 'projection')?.level || presenceReading.presenceDistance || 'moderada' },
    { label: 'Vibe', value: uniqueText([...(signals.vibes || []), ...getVibeItems(product)]).slice(0, 3).join(' · ') || humanReading.personality },
  ];

  return rows.filter((row) => row.value);
}

function createProductCheckoutItem(product = {}) {
  const slug = product.productSlug || createProductSlug(product.name);
  return {
    id: product.id || slug,
    slug,
    name: getProductDisplayName(product),
    brand: product.brand,
    image: product.image,
    quantity: 1,
    unit_price: Number(product.salePrice || product.price || 0),
  };
}

function buildProductAnalyticsPayload(product = {}, extra = {}) {
  return {
    product_id: product.id,
    product_slug: product.productSlug || createProductSlug(product.name),
    product_name: product.name,
    brand: product.brand,
    price: product.salePrice,
    source_page: 'product',
    ...extra,
  };
}

function getMoodAtmosphereProfile(product = {}) {
  const pool = normalizeProductClassifier([
    product.name,
    product.olfactoryReference,
    product.signature,
    product.category,
    product.gender,
    ...(Array.isArray(product.vibe) ? product.vibe : []),
    ...(Array.isArray(product.vibes) ? product.vibes : []),
  ].filter(Boolean).join(' '));

  if (/\b(marine|aquatic|acquatic|ocean|oceano|salin|sea)\b/.test(pool)) return 'marine';
  if (/\b(clean|fresh|fresco|crisp|citrico|branco)\b/.test(pool)) return 'clean';
  if (/\b(executive|luxury|nicho|premium|elegante|royal)\b/.test(pool)) return 'luxury';
  if (/\b(night|seductive|noite|sensual|intense)\b/.test(pool)) return 'night';
  if (/\b(leather|couro|smoky|fumaca|incenso|oud)\b/.test(pool)) return 'smoky';
  return 'signature';
}


function buildSemanticAtmosphere(product = {}) {
  const pool = normalizeProductClassifier([
    product.name,
    product.olfactoryReference,
    product.signature,
    product.category,
    product.gender,
    product.personality,
    product.usageContext,
    ...(Array.isArray(product.vibe) ? product.vibe : []),
    ...(Array.isArray(product.vibes) ? product.vibes : []),
    ...(Array.isArray(product.accords) ? product.accords : []),
  ].filter(Boolean).join(' '));

  const flags = {
    marine: /(marine|aquatic|ocean|salin|sea|blue)/.test(pool),
    amber: /(amber|oriental|resin|oud|gold|warm|gourmand|vanilla)/.test(pool),
    smoky: /(smoky|dark|night|incense|charcoal|couro|leather)/.test(pool),
    clean: /(clean|fresh|white|mineral|executive|office|crisp|citr)/.test(pool),
    floral: /(floral|rose|jasmine|luminous|petal)/.test(pool),
  };

  let profile = 'signature';
  if (flags.marine && flags.clean) profile = 'mineral-aquatic';
  else if (flags.amber && flags.smoky) profile = 'amber-nocturne';
  else if (flags.amber) profile = 'amber-oriental';
  else if (flags.smoky) profile = 'smoky-dark';
  else if (flags.clean) profile = 'luxury-clean';
  else if (flags.floral) profile = 'floral-luminous';

  return { profile, flags };
}
function resolveEditorialCadence({ moodProfile, atmosphereProfile, contentScore = 0, recommendationCount = 0, chipCount = 0 }) {
  const denseMood = moodProfile === 'smoky' || moodProfile === 'night' || atmosphereProfile === 'smoky-dark' || atmosphereProfile === 'amber-nocturne';
  const airyMood = moodProfile === 'marine' || atmosphereProfile === 'mineral-aquatic' || atmosphereProfile === 'luxury-clean';
  const cadence = (denseMood ? 1 : airyMood ? -1 : 0)
    + (recommendationCount >= 8 ? 1 : recommendationCount <= 3 ? -1 : 0)
    + (contentScore >= 7 ? 1 : contentScore <= 3 ? -1 : 0)
    + (chipCount >= 5 ? 1 : chipCount <= 2 ? -1 : 0);
  return { compactness: cadence >= 2 ? 'dense' : cadence <= -2 ? 'airy' : 'balanced', cadence };
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
  if (!experience) {
    return null;
  }

  return (
    <section className="lazule-reveal overflow-hidden rounded-[2.65rem] border border-lazule-gold/20 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_32rem),linear-gradient(145deg,rgba(10,20,42,0.94),rgba(4,8,18,0.88))] p-5 shadow-mineral backdrop-blur sm:p-6 lg:p-7">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
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

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
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

        <div className="space-y-3">
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
  if (!vibeItems.length) return null;

  return (
    <section className="lazule-reveal rounded-[1.8rem] border border-lazule-gold/15 bg-white/[0.045] p-4 shadow-mineral backdrop-blur sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-lazule-gold">Vibe</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {vibeItems.map((item, index) => (
          <div
            className="lazule-touch-card lazule-reveal-item rounded-full border border-white/10 bg-lazule-night/35 px-3 py-1.5 text-xs text-lazule-mist"
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

function RecommendationCard({ product, context = 'recommendations', explanation, index = 0, moodProfile = 'signature', atmosphereProfile = 'signature' }) {
  return (
    <a
      className="lazule-product-card lazule-reveal-item lazule-recommendation-card group flex w-[74vw] max-w-[18rem] shrink-0 snap-start flex-col overflow-hidden rounded-[1.8rem] border border-white/12 bg-white/[0.08] shadow-mineral backdrop-blur transition duration-500 md:w-[17.5rem]"
      href={createProductPath(product)}
      data-mood={moodProfile}
      data-atmosphere={atmosphereProfile}
      style={{ '--item-delay': `${120 + (index * 85)}ms` }}
      onClick={() => trackRecommendationClick(product, { source_page: 'product_recommendations', section: context })}
    >
      <div className="relative h-44 overflow-hidden bg-lazule-depth">
        {product.image ? (
          <img
            className="absolute inset-0 h-full w-full object-contain object-center p-3.5 opacity-95 transition duration-700 group-hover:scale-[1.04]"
            src={product.image}
            alt={`Perfume ${product.name}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <ProductImageFallback />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-lazule-night/68 via-lazule-night/16 to-transparent" />
        <div className="absolute inset-x-[12%] top-3 h-8 rounded-full bg-white/25 blur-xl opacity-55" aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.26em] text-lazule-gold">{product.brand}</p>
          <h3 className="mt-2 line-clamp-2 font-display text-[1.65rem] leading-tight text-lazule-mist group-hover:text-lazule-gold">
            {getProductDisplayName(product)}
          </h3>
          <p className="mt-2 line-clamp-1 text-xs text-slate-300">DNA: {humanizeSignature(product.signature || product.olfactoryReference || 'Perfil olfativo em curadoria')}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{explanation || product.semanticReasons?.[0] || product.narrative || 'Conexão por assinatura olfativa e contexto de uso.'}</p>
        </div>
        <strong className="mt-3 inline-flex w-fit rounded-full border border-lazule-gold/30 bg-lazule-gold/12 px-3 py-1.5 text-base font-semibold text-[#f8f3df]">{canDirectBuy(product) ? formatBRL(product.salePrice) : getCommercialStatusMeta(product).badge}</strong>
      </div>
    </a>
  );
}


function OlfactiveDiscoveryTerms({ product, runtimeModules }) {
  const terms = runtimeModules?.olfactiveRelationships?.getExplorableOlfactiveTerms?.(product, { limit: 9 });

  if (!Array.isArray(terms) || !terms.length) {
    return null;
  }

  return (
    <section className="lazule-reveal rounded-[2.1rem] border border-lazule-gold/15 bg-white/[0.045] p-4 shadow-mineral backdrop-blur sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-lazule-gold">Mapa olfativo</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist">Explore notas e acordes</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-300">Toque em uma nota para descobrir perfumes com a mesma assinatura.</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
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

  const atmosphere = buildSemanticAtmosphere(currentProduct || {});
  const editorialTitles = { 'mineral-aquatic': 'Ecos da assinatura', 'amber-oriental': 'Leituras mais densas', 'amber-nocturne': 'Rastros em continuidade', 'smoky-dark': 'Presenças paralelas', 'luxury-clean': 'Mesmo eixo sensorial', 'floral-luminous': 'Interpretações correlatas', signature: 'Continuidade sensorial' };
  const editorialSubtitle = atmosphere.profile === 'smoky-dark' ? 'Perfumes que conversam com a mesma presença.' : atmosphere.profile === 'amber-oriental' ? 'Leituras próximas da assinatura interpretada pela LAZ.' : 'Seleção guiada por vibe, DNA olfativo, performance e ocasião.';

  return (
    <section className="lazule-reveal lazule-recommendation-atmosphere rounded-[2.6rem] border border-white/10 bg-white/[0.03] p-5 shadow-mineral backdrop-blur sm:p-6 lg:p-7">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Relações olfativas</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist sm:text-4xl">Descoberta por assinatura</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-300">Conexões explicáveis por acordes, notas, DNA, vibe e disponibilidade — curadoria, não comparação de clones.</p>
      </div>
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.id} onMouseEnter={() => trackEvent('relationship_block_engagement', {
            product_id: currentProduct.id,
            product_slug: currentProduct.productSlug,
            relationship_block: section.id,
            item_count: section.items.length,
            source_page: 'product',
          }, { dedupeKey: `relationship_block|${currentProduct.id}|${section.id}`, dedupeMs: 12000 })}>
            <div className="mb-3">
              <h3 className="font-display text-2xl text-lazule-mist">{section.title}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">{section.subtitle}</p>
            </div>
            <div className="mb-2 flex items-center justify-end text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-400"><span>deslize para ver mais</span></div>
            <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pr-2">
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
  const railRef = useRef(null);

  const sections = [
    { key: "highlySimilar", title: "Perfumes com DNA parecido", subtitle: "Compartilham acordes, notas ou uma assinatura sensorial próxima." },
    { key: "complementary", title: "Mesma vibe, outra assinatura", subtitle: "Exploram uma atmosfera semelhante com personalidade própria." },
    { key: "adventurousAlternatives", title: "Para explorar algo mais ousado", subtitle: "Mantêm pontos de contato, mas ampliam intensidade, textura ou presença." },
  ].filter((section) => (groups[section.key] || []).length > 0);

  if (!sections.length) return null;

  return (
    <section ref={railRef} className="lazule-reveal rounded-[2.5rem] border border-lazule-gold/15 bg-white/[0.035] p-5 shadow-mineral backdrop-blur sm:p-6 lg:p-7">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Consultoria olfativa</p>
      </div>
      {sections.map((section) => (
        <div key={section.key} className="mb-6 last:mb-0">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-display text-2xl text-lazule-mist">{section.title}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">{section.subtitle}</p>
            </div>
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-400">deslize para ver mais</span>
          </div>
          <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pr-2">
            {(groups[section.key] || []).map((item) => (
              <RecommendationCard key={item.slug} product={item} context={section.key} explanation={item.explanation} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Recommendations({ products, currentProduct }) {
  if (!products.length) {
    return null;
  }

  const atmosphere = buildSemanticAtmosphere(currentProduct || {});
  const moodProfile = getMoodAtmosphereProfile(currentProduct || {});
  const editorialTitles = { 'mineral-aquatic': 'Ecos da assinatura', 'amber-oriental': 'Leituras mais densas', 'amber-nocturne': 'Rastros em continuidade', 'smoky-dark': 'Presenças paralelas', 'luxury-clean': 'Mesmo eixo sensorial', 'floral-luminous': 'Interpretações correlatas', signature: 'Continuidade sensorial' };
  const editorialSubtitle = atmosphere.profile === 'smoky-dark' ? 'Perfumes que conversam com a mesma presença.' : atmosphere.profile === 'amber-oriental' ? 'Leituras próximas da assinatura interpretada pela LAZ.' : 'Seleção guiada por vibe, DNA olfativo, performance e ocasião.';

  return (
    <section className="lazule-reveal lazule-recommendation-atmosphere rounded-[2.6rem] border border-white/10 bg-white/[0.03] p-5 shadow-mineral backdrop-blur sm:p-6 lg:p-7">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Descoberta emocional</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist sm:text-4xl">{editorialTitles[atmosphere.profile] || editorialTitles.signature}</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-300">
          {editorialSubtitle}
        </p>
      </div>
      <div className="mb-2 flex items-center justify-end text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-400"><span>deslize para descobrir</span></div>
      <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pr-2">
        {products.map((product, index) => (
          <RecommendationCard key={product.id} product={product} index={index} moodProfile={moodProfile} atmosphereProfile={atmosphere.profile} />
        ))}
      </div>
    </section>
  );
}

function StickyWhatsAppBar({ product, whatsAppLink, referralContext }) {
  const [showBar, setShowBar] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 560);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const disabled = !whatsAppLink;
  const directBuy = canDirectBuy(product);
  const statusMeta = getCommercialStatusMeta(product);
  const appliedCode = getAppliedReferralLabel(referralContext);

  async function handleStickyCheckout() {
    if (!directBuy || isCheckingOut) return;
    setIsCheckingOut(true);
    try {
      await startMercadoPagoCheckout([createProductCheckoutItem(product)], {
        total: Number(product.salePrice || product.price || 0),
        source: 'product_sticky_cta',
      });
    } catch (error) {
      console.warn('[ProductDetails] sticky checkout failed', error);
      setIsCheckingOut(false);
    }
  }

  return (
    <div className={`lazule-sticky-whatsapp fixed inset-x-0 bottom-0 z-[70] border-t border-lazule-gold/20 bg-slate-950/72 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-18px_60px_rgba(2,6,23,0.52)] backdrop-blur-xl transition duration-500 ${showBar ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`} role="region" aria-label="Compra rápida">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        {product.image ? <img src={product.image} alt={product.name} className="hidden h-12 w-12 rounded-xl border border-white/10 object-contain bg-black/20 p-1 sm:block" loading="lazy" /> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.62rem] uppercase tracking-[0.22em] text-slate-400">{getProductDisplayName(product)}</p>
          <strong className="block truncate text-lg text-lazule-mist">{directBuy ? formatBRL(product.salePrice) : 'Sob consulta'}</strong>
          {appliedCode ? (
            <p className="mt-1 truncate text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-lazule-gold/85">
              {appliedCode.label}: {appliedCode.value}
            </p>
          ) : null}
        </div>
        <button
          className="hidden min-h-11 shrink-0 items-center justify-center rounded-full border border-lazule-gold/40 bg-lazule-gold/10 px-4 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-lazule-gold sm:inline-flex"
          onClick={() => {
            addToLuxurySelection(product);
            trackEvent('add_to_selection', buildProductAnalyticsPayload(product, { cta_location: 'sticky_cta' }));
          }}
        >
          Adicionar
        </button>
        {directBuy ? (
          <button
            type="button"
            className="lazule-premium-button lazule-cta-shimmer inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-lazule-gold px-5 text-xs font-bold uppercase tracking-[0.12em] text-lazule-night shadow-aureate transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            disabled={isCheckingOut}
            aria-label={`Finalizar compra de ${product.name || 'fragrância LAZULE'} via Mercado Pago`}
            onClick={() => {
              trackEvent('sticky_cta_click', { product_id: product.id, product_name: product.name, source_page: 'product', cta_location: 'sticky_checkout' });
              handleStickyCheckout();
            }}
          >
            {isCheckingOut ? 'Pagamento seguro...' : 'Finalizar compra'}
          </button>
        ) : (
          <a
            className={`lazule-premium-button lazule-cta-shimmer inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-lazule-gold px-5 text-xs font-bold uppercase tracking-[0.12em] text-lazule-night shadow-aureate transition active:scale-[0.98] ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            href={whatsAppLink || '#'}
            aria-disabled={disabled}
            aria-label={`Consultar ${product.name || 'fragrância LAZULE'} pelo WhatsApp`}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              trackEvent('whatsapp_consultation', buildProductAnalyticsPayload(product, { cta_location: 'sticky_cta' }));
              trackWhatsappClick({ product_id: product.id, product_slug: createProductSlug(product.name), product_name: product.name, price: product.salePrice, source_page: 'product', cta_location: 'sticky_cta' });
            }}
          >
            {statusMeta.shortCtaLabel}
          </a>
        )}
      </div>
    </div>
  );
}


function WhyThisFragrancePanel({ bullets = [] }) {
  if (!bullets.length) return null;

  return (
    <section className="rounded-[1.8rem] border border-lazule-night/10 bg-white/55 p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:border-white/10 lg:bg-white/[0.045]">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-royal lg:text-lazule-gold">Por que este perfume?</p>
      <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-700 lg:text-slate-300 sm:grid-cols-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lazule-gold" aria-hidden="true" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PremiumOlfactiveProfile({ rows = [] }) {
  if (!rows.length) return null;

  return (
    <section className="rounded-[1.8rem] border border-lazule-night/10 bg-white/45 p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] lg:border-white/10 lg:bg-white/[0.04]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-royal lg:text-lazule-gold">Perfil olfativo</p>
          <h2 className="mt-1 font-display text-2xl text-lazule-night lg:text-lazule-mist">Leitura editorial</h2>
        </div>
        <span className="hidden text-xs text-slate-500 lg:block">sem excesso técnico</span>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-lazule-night/10 bg-lazule-night/[0.03] p-3.5 lg:border-white/10 lg:bg-lazule-night/35">
            <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-500 lg:text-slate-400">{row.label}</dt>
            <dd className="mt-2 text-sm font-semibold leading-5 text-lazule-night lg:text-lazule-mist">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function LazuleTrustLayer() {
  const items = [
    ['Seleção curada', 'Escolhas revisadas por intenção de uso, presença e acabamento.'],
    ['Pagamento seguro', 'Checkout via Mercado Pago com transição transparente.'],
    ['Suporte especializado', 'Atendimento humano para dúvidas antes da compra.'],
    ['Atendimento consultivo', 'Ajuda para comparar caminhos olfativos sem pressão.'],
    ['Processo transparente', 'Preço, disponibilidade e próximos passos sempre claros.'],
  ];

  return (
    <section className="lazule-reveal rounded-[2.35rem] border border-lazule-gold/15 bg-white/[0.04] p-5 shadow-mineral backdrop-blur sm:p-6 lg:p-7">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Curadoria LAZULE</p>
        <h2 className="mt-2 font-display text-3xl text-lazule-mist sm:text-4xl">Compra calma. Escolha bem orientada.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">Uma camada de confiança para você decidir sem pressa, com segurança e suporte quando precisar.</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {items.map(([title, copy]) => (
          <div key={title} className="rounded-[1.45rem] border border-white/10 bg-lazule-night/35 p-4">
            <h3 className="text-sm font-semibold text-lazule-mist">{title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">{copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SemanticSearchEntry({ product }) {
  const suggestions = ['cheiro de rico', 'assinatura elegante', 'praia chique', 'luxo discreto', 'perfume executivo'];

  return (
    <section className="lazule-reveal rounded-[2.1rem] border border-lazule-gold/15 bg-white/[0.045] p-4 shadow-mineral backdrop-blur sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Buscando algo parecido?</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist">Entre por uma sensação</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-300">Use a busca semântica para encontrar perfumes pela atmosfera, não só pelo nome.</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <a
            key={suggestion}
            className="lazule-premium-button rounded-full border border-lazule-gold/25 bg-lazule-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night"
            href={`/catalogo?busca=${encodeURIComponent(suggestion)}&src=product_semantic`}
            onClick={() => trackEvent('semantic_suggestion_click', {
              ...buildProductAnalyticsPayload(product),
              query: suggestion,
              source_component: 'product_semantic_entry',
              privacy: 'query_intent_only',
            })}
          >
            {suggestion}
          </a>
        ))}
      </div>
    </section>
  );
}

function ProductCheckoutActions({ product, whatsAppLink, directBuy }) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  function handleAddToSelection() {
    addToLuxurySelection(product);
    trackEvent('add_to_selection', buildProductAnalyticsPayload(product, { cta_location: 'product_hero' }));
  }

  async function handleCheckoutClick() {
    if (!directBuy || isCheckingOut) return;
    setIsCheckingOut(true);
    setCheckoutError('');
    try {
      await startMercadoPagoCheckout([createProductCheckoutItem(product)], {
        total: Number(product.salePrice || product.price || 0),
        source: 'product_page',
      });
    } catch (error) {
      setCheckoutError(error?.message || CHECKOUT_ERROR_MESSAGE);
      setIsCheckingOut(false);
    }
  }

  function handleConsultationClick() {
    trackEvent('whatsapp_consultation', buildProductAnalyticsPayload(product, { cta_location: 'product_hero_secondary' }));
    trackWhatsappClick(buildProductAnalyticsPayload(product, { cta_location: 'product_hero_secondary' }));
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="grid gap-2 sm:grid-cols-[0.95fr_1.05fr]">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-full border border-lazule-gold/35 bg-lazule-gold/10 px-6 py-3 text-sm font-semibold text-lazule-night transition hover:bg-lazule-gold/20 lg:text-lazule-gold"
          onClick={handleAddToSelection}
        >
          Adicionar à seleção
        </button>
        <button
          type="button"
          disabled={!directBuy || isCheckingOut}
          className="lazule-premium-button lazule-cta-shimmer inline-flex w-full items-center justify-center rounded-full bg-lazule-gold px-6 py-3 font-semibold text-lazule-night shadow-aureate transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
          onClick={handleCheckoutClick}
        >
          {isCheckingOut ? 'Iniciando pagamento seguro...' : 'Finalizar compra'}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-slate-600 lg:text-slate-300">
        <span>Pagamento via Mercado Pago</span>
        <span aria-hidden="true">·</span>
        <span>Atendimento especializado</span>
        <span aria-hidden="true">·</span>
        <span>Seleção curada pela LAZULE</span>
      </div>
      {checkoutError ? <p className="text-xs leading-5 text-red-600 lg:text-red-200" role="alert">{checkoutError}</p> : null}
      <a
        className="inline-flex w-full items-center justify-center rounded-full border border-lazule-night/10 bg-white/45 px-6 py-3 text-sm font-semibold text-lazule-night transition hover:border-lazule-gold/45 lg:border-white/10 lg:bg-white/[0.045] lg:text-lazule-mist"
        href={whatsAppLink}
        target="_blank"
        rel="noreferrer"
        onClick={handleConsultationClick}
      >
        Precisa de ajuda para escolher?
      </a>
    </div>
  );
}


function ProductUnderstandingSection({ product, experience }) {
  const humanReading = createHumanPerfumeReading(product);
  const presenceReading = buildHumanPresenceReading(product);
  const whyBullets = buildWhyThisFragranceBullets(product, experience, presenceReading, humanReading);
  const profileRows = createOlfactiveProfileRows(product, experience, humanReading, presenceReading);

  if (!whyBullets.length && !profileRows.length) {
    return null;
  }

  return (
    <section className="lazule-reveal rounded-[2.6rem] border border-lazule-gold/15 bg-white/[0.035] p-5 shadow-mineral backdrop-blur sm:p-6 lg:p-7">
      <div className="mb-5 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Entenda a escolha</p>
        <h2 className="mt-2 font-display text-3xl text-lazule-mist sm:text-4xl">Por que esta fragrância entra na sua jornada</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">Primeiro a intenção, depois o perfil: uma leitura objetiva para decidir se a assinatura combina com você.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <WhyThisFragrancePanel bullets={whyBullets} />
        <PremiumOlfactiveProfile rows={profileRows} />
      </div>
    </section>
  );
}

function FinalPurchaseSection({ product, whatsAppLink, referralContext }) {
  const directBuy = canDirectBuy(product);
  const statusMeta = getCommercialStatusMeta(product);

  return (
    <section className="lazule-reveal overflow-hidden rounded-[2.8rem] border border-lazule-gold/25 bg-[radial-gradient(circle_at_top_right,rgba(200,162,77,0.18),transparent_28rem),linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 shadow-mineral backdrop-blur sm:p-6 lg:p-7">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Decisão final</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist sm:text-4xl">Pronto para transformar descoberta em assinatura?</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">Você já viu o perfil, os sinais de confiança e as alternativas. Agora escolha comprar com segurança ou pedir uma última orientação humana.</p>
        </div>
        <div className="rounded-[1.8rem] border border-white/10 bg-lazule-night/45 p-5 lg:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-lazule-gold">{getProductDisplayName(product)}</p>
              <strong className="mt-2 block text-3xl font-semibold text-lazule-mist">{directBuy ? formatBRL(product.salePrice) : statusMeta.badge}</strong>
            </div>
            <p className="max-w-xs text-xs leading-5 text-slate-400">{directBuy ? 'Checkout seguro via Mercado Pago, com suporte LAZULE se precisar.' : statusMeta.supportingCopy}</p>
          </div>
          <ManualReferralForm product={product} referralContext={referralContext} />
          <ProductCheckoutActions product={product} whatsAppLink={whatsAppLink} directBuy={directBuy} />
        </div>
      </div>
    </section>
  );
}

function ProductFooterBridge() {
  return (
    <div className="lazule-reveal px-1 py-8 lg:py-10" aria-hidden="true">
      <div className="mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-lazule-gold/35 to-transparent" />
      <p className="mt-4 text-center text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-lazule-gold/70">fim da consultoria · atendimento abaixo</p>
    </div>
  );
}

function ProductDetailsSafeShell({ product, whatsAppLink, referralContext, experience, tasteEvolution, identityTensionState }) {
  console.info('[ProductDetails] ProductDetailsSafeShell render', { hasProduct: Boolean(product) });
  const directBuy = canDirectBuy(product);
  const statusMeta = getCommercialStatusMeta(product);
  const chips = getVibeItems(product);
  const moodProfile = getMoodAtmosphereProfile(product);
  const atmosphere = buildSemanticAtmosphere(product);
  const humanReading = createHumanPerfumeReading(product);
  const signature = humanizeSignature(product.signature || product.olfactoryReference || 'Assinatura em curadoria');
  const contentScore = [
    Boolean(product?.description),
    Boolean(product?.narrative),
    Boolean(experience?.signature?.text),
    Boolean(experience?.idealUse?.headline || experience?.occasionNarrative),
    Boolean(experience?.performance?.summary),
    Boolean((product?.accords || []).length),
    Boolean((product?.notes || []).length),
    Boolean((product?.vibes || product?.vibe || []).length),
  ].filter(Boolean).length;
  const cadence = resolveEditorialCadence({ moodProfile, atmosphereProfile: atmosphere.profile, contentScore, chipCount: chips.length });
  const [presenceProfile, setPresenceProfile] = useState(() => resolvePresenceProfile());
  const [memoryStore, setMemoryStore] = useState({ entries: {} });

  useEffect(() => {
    if (!product?.productSlug) return;
    const nextSession = trackPresenceEvent({ type: 'product_view', productSlug: product.productSlug });
    setPresenceProfile(resolvePresenceProfile(nextSession));
    setMemoryStore(updateMemoryWeights({ productSlug: product.productSlug, viewed: true }));
  }, [product?.productSlug]);

  const memoryEntry = memoryStore.entries?.[product?.productSlug] || {};
  const sessionAtmosphere = resolveSessionAtmosphere({ product, presence: presenceProfile, memory: memoryStore });
  const storyFragments = createStoryFragments({ product, presence: presenceProfile, atmosphere: sessionAtmosphere, memoryEntry });
  const presenceReading = buildHumanPresenceReading(product);
  const observationFragments = createHumanObservationFragments({ profile: presenceProfile, context: 'pdp' });
  const editorialOpinion = createEditorialOpinion(product);
  const categoryLabel = getCategoryLabel(product);
  const concentration = inferProductConcentration(product);
  const volume = inferProductVolume(product);
  const luxuryDescriptor = buildLuxuryDescriptor(product, atmosphere);
  const atmosphericSignature = buildAtmosphericSignature(product, humanReading);
  const olfactiveIdentitySummary = buildOlfactiveIdentitySummary(product, signature);

  return (
    <div className={`lazule-editorial-stage lazule-atmospheric-crossfade grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-8 lazule-mood-surface lazule-mood-${moodProfile} lazule-atmo-${atmosphere.profile}`} data-mood={moodProfile} data-compactness={cadence.compactness}>
      <span className="lazule-depth-layer lazule-depth-layer-3" aria-hidden="true" />
      <span className="lazule-depth-layer lazule-depth-layer-6" aria-hidden="true" />
      <span className="lazule-depth-layer lazule-depth-layer-fog" aria-hidden="true" />
      <DetailImage product={product} />
      <article className="lazule-hero-copy lazule-product-info-card relative z-10 overflow-hidden rounded-[2.35rem] border border-white/10 bg-[#f7f2e8]/[0.94] text-lazule-night shadow-mineral backdrop-blur lg:-ml-10 lg:mt-12 lg:rounded-[2.8rem] lg:bg-white/[0.06] lg:p-9 lg:text-lazule-mist">
        <a className="text-xs font-semibold uppercase tracking-[0.34em] text-lazule-royal transition hover:text-lazule-gold lg:text-lazule-gold" href={createBrandPath(product.brand)} onClick={() => trackBrandClick(product.brand, { source_page: 'product_details' })}>
          {product.brand}
        </a>
        <h1 className="lazule-text-reveal mt-3 font-display text-[clamp(2.25rem,5.4vw,4rem)] leading-[0.98] text-lazule-night lg:text-lazule-mist">{getProductDisplayName(product)}</h1>
        <div className="mt-4 flex flex-wrap gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-600 lg:text-slate-300">
          {[categoryLabel, concentration, volume].filter(Boolean).map((item) => (
            <span key={item} className="rounded-full border border-lazule-night/10 bg-white/45 px-3 py-1.5 lg:border-white/10 lg:bg-white/[0.045]">{item}</span>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          <p className="font-display text-[1.7rem] leading-tight text-lazule-night lg:text-lazule-mist">{luxuryDescriptor}</p>
          <p className="text-sm leading-6 text-slate-700 lg:text-slate-300">{atmosphericSignature}</p>
          <p className="text-sm leading-6 text-slate-700 lg:text-slate-300">{olfactiveIdentitySummary}</p>
        </div>
        <div className="mt-5 flex items-end justify-between gap-5 rounded-[1.45rem] border border-lazule-night/10 bg-white/45 p-4 lg:border-white/10 lg:bg-white/[0.045]">
          <div>
            <span className="text-[0.65rem] uppercase tracking-[0.25em] text-lazule-royal/90 lg:text-lazule-gold">Preço</span>
            <strong className="mt-1 block text-3xl font-semibold text-[#081937] drop-shadow-[0_2px_10px_rgba(226,198,126,0.25)] lg:text-[#f7f3e5]">{directBuy ? formatBRL(product.salePrice) : 'Sob consulta'}</strong>
            <p className="mt-1 text-xs text-slate-600 lg:text-slate-300">{directBuy ? 'checkout seguro · disponibilidade imediata' : statusMeta.supportingCopy || 'consulta assistida pela curadoria'}</p>
          </div>
        </div>
        <div className="lazule-live-interpretation lazule-text-reveal mt-4 rounded-[1.2rem] border border-lazule-gold/20 bg-lazule-night/[0.03] p-4 lg:bg-white/[0.028]">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Assinatura LAZULE</p>
          <p className="mt-2 text-sm font-semibold text-lazule-night lg:text-lazule-mist">{signature}</p>
          <div className="mt-2 grid gap-2 text-sm leading-5 text-slate-700 lg:text-slate-300">
            <p>{humanReading.firstImpression}</p>
            <p>{presenceReading.whenItWorksBest?.[0] || humanReading.context}</p>
          </div>
          <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-lazule-gold">Ler interpretação completa</summary>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700 lg:text-slate-300">
              <p>{tasteEvolution?.narrative || 'Esse perfume conversa com a direção recente da sua assinatura.'}</p>
              <p>{identityTensionState?.identityTension?.narrative || 'Seu gosto recente mantém contraste entre conforto e presença.'}</p>
              <p>Leitura social: {humanReading.socialImpression}</p>
              <p>Personalidade: {humanReading.personality}</p>
              <p>Ocasião humana: {humanReading.humanOccasion}</p>
              <p>Leitura editorial: {humanReading.commentary[0]}</p>
              <p>Opinião LAZULE: {editorialOpinion}</p>
            </div>
          </details>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-lazule-royal/80 lg:text-lazule-gold/80">Presença da sessão · {sessionAtmosphere.profile}</p>
          <div className="mt-2 space-y-1.5">
            {storyFragments.map((fragment) => (
              <p key={fragment} className="text-sm leading-6 text-slate-700 lg:text-slate-300">{fragment}</p>
            ))}
          </div>
          <div className="mt-3 space-y-2" aria-hidden="true">
            {['intensidade', 'projeção', 'assinatura'].map((label, index) => (
              <div key={label} className="lazule-olfactive-row" style={{ '--item-delay': `${index * 120}ms` }}>
                <span className="text-[0.58rem] uppercase tracking-[0.16em] text-slate-500 lg:text-slate-400">{label}</span>
                <span className="lazule-olfactive-bar" style={{ '--bar-value': `${[84,72,91][index]}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...chips, ...humanReading.discoveryTags].slice(0, 6).map((chip, index) => (
              <span key={chip} className="lazule-semantic-chip rounded-full border border-lazule-gold/35 bg-lazule-gold/10 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-lazule-royal lg:text-lazule-gold" style={{ '--item-delay': `${120 + index * 90}ms` }}>
                {chip}
              </span>
            ))}
          </div>
          <div className="mt-5 grid gap-3 rounded-2xl border border-lazule-gold/20 bg-white/[0.04] p-4 text-sm leading-6 text-slate-700 lg:text-slate-300">
            <p><strong className="text-lazule-night lg:text-lazule-mist">Quando funciona melhor:</strong> {presenceReading.whenItWorksBest.join(' ')}</p>
            <p><strong className="text-lazule-night lg:text-lazule-mist">Quando pode falhar:</strong> {presenceReading.whenItCanFail.join(' ')}</p>
            <p><strong className="text-lazule-night lg:text-lazule-mist">Leitura social:</strong> {presenceReading.socialReading}</p>
            <p><strong className="text-lazule-night lg:text-lazule-mist">Quem costuma usar:</strong> {presenceReading.whoUsuallyWearsThis.join(', ')}.</p>
            <p><strong className="text-lazule-night lg:text-lazule-mist">Percepção térmica:</strong> {presenceReading.temperaturePerception}</p>
            <p><strong className="text-lazule-night lg:text-lazule-mist">Distância de presença:</strong> {presenceReading.presenceDistance}</p>
            <p><strong className="text-lazule-night lg:text-lazule-mist">Fadiga/saturação:</strong> {presenceReading.fatigueSaturation}</p>
            {observationFragments.map((fragment) => <p key={fragment}>• {fragment}</p>)}
          </div>
        </div>
      </article>
    </div>
  );
}

function ProductExperienceSection({ product, experience, whatsAppLink }) {
  console.info('[ProductDetails] ProductExperienceSection render', { hasProduct: Boolean(product), hasExperience: Boolean(experience) });
  if (!experience) {
    return null;
  }
  return <PerfumeExperienceLayer product={product} experience={experience} whatsAppLink={whatsAppLink} />;
}

function ProductRecommendationsSection({ products, currentProduct }) {
  console.info('[ProductDetails] ProductRecommendationsSection render', { count: Array.isArray(products) ? products.length : 0 });
  if (!Array.isArray(products) || !products.length) return null;
  return <Recommendations products={products} currentProduct={currentProduct} />;
}

function ProductRelationshipsSection({ sections, currentProduct, experience }) {
  console.info('[ProductDetails] ProductRelationshipsSection render', { hasProduct: Boolean(currentProduct), count: Array.isArray(sections) ? sections.length : 0, hasExperience: Boolean(experience) });
  if (!Array.isArray(sections) || !sections.length) return null;
  return <RelationshipBlocks sections={sections} currentProduct={currentProduct} experience={experience} />;
}

function ProductDiscoveryTermsSection({ product, runtimeModules }) {
  const terms = runtimeModules?.olfactiveRelationships?.getExplorableOlfactiveTerms?.(product, { limit: 9 }) || [];
  console.info('[ProductDetails] ProductDiscoveryTermsSection render', {
    hasProduct: Boolean(product),
    hasRuntime: Boolean(runtimeModules?.olfactiveRelationships),
    count: Array.isArray(terms) ? terms.length : 0,
  });
  if (!product || !runtimeModules?.olfactiveRelationships) return null;
  return <OlfactiveDiscoveryTerms product={product} runtimeModules={runtimeModules} />;
}

function SemanticEditorialFallback({ title, copy }) {
  return (
    <section className="lazule-reveal rounded-[2.4rem] border border-lazule-gold/15 bg-white/[0.03] p-5 shadow-mineral backdrop-blur sm:p-6 lg:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-lazule-gold">Curadoria LAZ</p>
      <h2 className="mt-2 font-display text-3xl text-lazule-mist">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{copy}</p>
    </section>
  );
}

export function ProductDetails({ slug }) {
  const catalogProducts = useMemo(() => getAllProducts(), []);
  const normalizedSlug = createProductSlug(slug);
  const product = getProductBySlug(normalizedSlug, catalogProducts);
  const fallbackRecommendations = useMemo(() => (product ? getProductRecommendations(product, catalogProducts) : []), [catalogProducts, product]);
  const [recommendations, setRecommendations] = useState(fallbackRecommendations);
  const [runtimeModules, setRuntimeModules] = useState(null);

  useEffect(() => {
    setRecommendations(fallbackRecommendations);

    if (!product) return;

    let isMounted = true;
    getProductRecommendationsAsync(product, catalogProducts)
      .then((nextRecommendations) => {
        if (isMounted && Array.isArray(nextRecommendations) && nextRecommendations.length) {
          setRecommendations(nextRecommendations);
        }
      })
      .catch((error) => {
        console.error('[ProductDetails] recommendation runtime failed', error);
      });

    return () => {
      isMounted = false;
    };
  }, [catalogProducts, fallbackRecommendations, product]);
  const [similarGroups, setSimilarGroups] = useState({});
  const relationshipSections = useMemo(() => {
    if (!product) return [];
    const sections = runtimeModules?.olfactiveRelationships?.generateOlfactiveRelationships?.(product, catalogProducts, { limit: 4 });
    return Array.isArray(sections) ? sections : [];
  }, [catalogProducts, product, runtimeModules]);

  const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];
  const tasteStore = useMemo(() => loadTasteMemoryStore(window.localStorage), []);
  const tasteEvolution = useMemo(() => deriveTasteEvolution({ profile: tasteStore.profile || {}, events: tasteStore.events || [], wishlist: [] }), [tasteStore]);
  const identityTensionState = useMemo(() => deriveIdentityTension({ profile: tasteStore.profile || {}, events: tasteStore.events || [], wishlist: [] }), [tasteStore]);
  const semanticRecommendationsCount = safeRecommendations.length;
  const [experience, setExperience] = useState(null);
  const [semanticRuntimeState, setSemanticRuntimeState] = useState('idle');
  const [referralContext, setReferralContext] = useState(() => getReferralContext());

  useEffect(() => {
    console.info('[ProductDetails] ProductDetails mounted');
    console.info('[ProductDetails] product slug', normalizedSlug);
    console.info('[ProductDetails] runtime loading begin (preload)');
    preloadSemanticRuntime();
  }, [normalizedSlug]);

  useEffect(() => {
    console.info('[ProductDetails] semantic hydration effect start', { hasProduct: Boolean(product), slug: normalizedSlug });
    if (!product) {
      console.info('[ProductDetails] semantic hydration skipped: !product');
      setSimilarGroups({});
      setExperience(null);
      setSemanticRuntimeState('idle');
      return;
    }

    let isMounted = true;
    console.info('[ProductDetails] semanticRuntimeState transition', { from: semanticRuntimeState, to: 'loading' });
    setSemanticRuntimeState('loading');
    console.info('[ProductDetails] runtime loading begin');

    loadProductExperienceRuntime()
      .then(({ similarPerfumeEngine, perfumeExperience, olfactiveRelationships }) => {
        if (!isMounted) return;
        if (import.meta.env.DEV) {
          console.info('[ProductDetails] runtime module exports', {
            createPerfumeExperience: typeof perfumeExperience?.createPerfumeExperience === 'function',
            findSimilarPerfumes: typeof similarPerfumeEngine?.findSimilarPerfumes === 'function',
            getSimilarPerfumes: typeof similarPerfumeEngine?.getSimilarPerfumes === 'function',
            getSimilarPerfumesForProduct: typeof similarPerfumeEngine?.getSimilarPerfumesForProduct === 'function',
            generateOlfactiveRelationships: typeof olfactiveRelationships?.generateOlfactiveRelationships === 'function',
            buildRelationshipSections: typeof olfactiveRelationships?.buildRelationshipSections === 'function',
            getExplorableOlfactiveTerms: typeof olfactiveRelationships?.getExplorableOlfactiveTerms === 'function',
          });
        }
        setRuntimeModules({ olfactiveRelationships });
        setSimilarGroups(similarPerfumeEngine?.getSimilarPerfumesForProduct?.(product, similarPerfumes) || {});
        setExperience(perfumeExperience?.createPerfumeExperience?.(product) || null);
        console.info('[ProductDetails] semanticRuntimeState transition', { from: 'loading', to: 'ready' });
        setSemanticRuntimeState('ready');
        console.info('[ProductDetails] runtime loaded');
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Falha ao montar runtime de experiência', error);
        console.info('[ProductDetails] semanticRuntimeState transition', { from: 'loading', to: 'error' });
        console.info('[ProductDetails] runtime error', error?.message);
        setRuntimeModules(null);
        setSimilarGroups({});
        setExperience(null);
        setSemanticRuntimeState('error');
      });

    return () => {
      isMounted = false;
    };
  }, [product]);

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
  }, [product, experience, runtimeModules, safeRecommendations.length, Object.keys(similarGroups || {}).length, relationshipSections.length, semanticRuntimeState]);


  useEffect(() => {
    const stage = document.querySelector('.lazule-editorial-stage');

    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    let frame = 0;
    const updateStageOffset = () => {
      frame = 0;
      const viewportHeight = Math.max(window.innerHeight, 1);
      const shift = Math.min(26, Math.max(-10, (window.scrollY / viewportHeight) * 18));
      stage.style.setProperty('--scroll-shift', `${shift.toFixed(2)}px`);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateStageOffset);
    };

    updateStageOffset();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [product]);

  useEffect(() => {
    const stage = document.querySelector('.lazule-editorial-stage');
    if (!stage || !product) return;
    const nextMood = getMoodAtmosphereProfile(product);
    const previousMood = stage.getAttribute('data-mood');
    if (previousMood && previousMood !== nextMood) {
      stage.setAttribute('data-prev-mood', previousMood);
      const timeoutId = window.setTimeout(() => stage.removeAttribute('data-prev-mood'), 1400);
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [product]);
  console.info('[ProductDetails] render guard check', { slug: normalizedSlug, found: Boolean(product), semanticRuntimeState, hasRuntimeModules: Boolean(runtimeModules), hasExperience: Boolean(experience) });
  const similarGroupsCount = Object.values(similarGroups || {}).reduce((total, group) => total + (Array.isArray(group) ? group.length : 0), 0);
  const relationshipSectionsCount = Array.isArray(relationshipSections)
    ? relationshipSections.reduce((total, section) => total + (Array.isArray(section?.items) ? section.items.length : 0), 0)
    : 0;
  const discoveryTerms = runtimeModules?.olfactiveRelationships?.getExplorableOlfactiveTerms?.(product, { limit: 9 }) || [];
  const discoveryTermsCount = Array.isArray(discoveryTerms) ? discoveryTerms.length : 0;

  if (import.meta.env.DEV) {
    console.info('[ProductDetails] semantic hydration', {
      runtimeModulesLoaded: Boolean(runtimeModules),
      runtimeState: semanticRuntimeState,
      experienceExists: Boolean(experience),
      similarGroupsCount,
      relationshipSectionsCount,
      discoveryTermsCount,
      recommendationsCount: semanticRecommendationsCount,
    });
    console.info('[ProductDetails] semantic sections calls', {
      ProductExperienceSection: Boolean(product),
      ProductRecommendationsSection: true,
      ProductRelationshipsSection: Boolean(product),
      ProductDiscoveryTermsSection: Boolean(product),
    });
  }
  if (!product) {
    console.info('[ProductDetails] early return: ProductNotFound (!product)');
    return <ProductNotFound />;
  }

  const productUrl = createCanonicalUrl(createProductPath(product));
  const whatsAppLink = createProductWhatsAppLink(product, { productUrl, referralContext });

  return (
    <section className="mx-auto max-w-7xl pb-14 lg:px-8 lg:py-10">
      <div className="lg:hidden">
        <a className="absolute left-5 top-5 z-20 rounded-full border border-white/10 bg-lazule-night/45 px-4 py-2 text-xs font-semibold text-lazule-gold backdrop-blur transition hover:text-[#dfbd68]" href="/catalogo">
          ← catálogo
        </a>
      </div>
      <a className="mb-6 hidden text-sm font-semibold text-lazule-gold transition hover:text-[#dfbd68] lg:inline-flex" href="/catalogo">
        ← Voltar ao catálogo
      </a>
      {semanticRuntimeState === 'loading' ? (
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-lazule-gold/80">
          Curadoria LAZ em preparação…
        </p>
      ) : null}

      <div>
        <ProductDetailsSafeShell product={product} whatsAppLink={whatsAppLink} referralContext={referralContext} experience={experience} tasteEvolution={tasteEvolution} identityTensionState={identityTensionState} />
      </div>

      {console.info('[ProductDetails] semantic sections present in JSX', {
        experience: true,
        discoveryTerms: true,
        relationships: true,
        similar: true,
        recommendations: true,
      }) || null}

      <div className="mt-8 space-y-8 px-4 lg:mt-10 lg:space-y-12 lg:px-0">
        <ProductSectionErrorBoundary sectionName="understanding"><ProductUnderstandingSection product={product} experience={experience} /></ProductSectionErrorBoundary>
        {experience ? <ProductSectionErrorBoundary sectionName="experience_top"><ProductExperienceSection product={product} experience={experience} whatsAppLink={whatsAppLink} /></ProductSectionErrorBoundary> : null}
        <ProductSectionErrorBoundary sectionName="trust_layer"><LazuleTrustLayer /></ProductSectionErrorBoundary>
        {similarGroupsCount ? <ProductSectionErrorBoundary sectionName="similar"><SimilarPerfumeSections groups={similarGroups} /></ProductSectionErrorBoundary> : null}
        {safeRecommendations.length ? <ProductSectionErrorBoundary sectionName="recommendations"><ProductRecommendationsSection products={safeRecommendations} currentProduct={product} /></ProductSectionErrorBoundary> : null}
        <ProductSectionErrorBoundary sectionName="semantic_entry"><SemanticSearchEntry product={product} /></ProductSectionErrorBoundary>
        {getVibeItems(product).length ? <ProductSectionErrorBoundary sectionName="vibe_top"><VibeSection product={product} /></ProductSectionErrorBoundary> : null}
        {discoveryTermsCount ? <ProductSectionErrorBoundary sectionName="discovery_terms"><ProductDiscoveryTermsSection product={product} runtimeModules={runtimeModules} /></ProductSectionErrorBoundary> : null}
        {relationshipSectionsCount ? <ProductSectionErrorBoundary sectionName="relationships"><ProductRelationshipsSection sections={relationshipSections} currentProduct={product} experience={experience} /></ProductSectionErrorBoundary> : null}
        {semanticRuntimeState === 'ready' && !experience ? (
          <SemanticEditorialFallback
            title="DNA em atualização editorial"
            copy="A assinatura olfativa detalhada deste perfume está sendo consolidada. Enquanto isso, mantemos a leitura premium de marca, categoria e contexto para orientar sua escolha."
          />
        ) : null}
        {semanticRuntimeState === 'ready' && !safeRecommendations.length ? (
          <SemanticEditorialFallback
            title="Sugestões em curadoria ativa"
            copy="Nossas recomendações semânticas estão sendo refinadas para este item. Explore o catálogo por marca, assinatura e ocasião enquanto concluímos a seleção."
          />
        ) : null}
        <ProductSectionErrorBoundary sectionName="final_purchase"><FinalPurchaseSection product={product} whatsAppLink={whatsAppLink} referralContext={referralContext} /></ProductSectionErrorBoundary>
        <ProductFooterBridge />
      </div>
      <StickyWhatsAppBar product={product} whatsAppLink={whatsAppLink} referralContext={referralContext} />
    </section>
  );
}
