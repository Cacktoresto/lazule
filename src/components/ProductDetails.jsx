import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { formatBRL } from '../utils/currency';
import { getAllProducts, getProductBySlug } from '../data/catalogRepository';
import { getProductRecommendations, getProductRecommendationsAsync } from '../utils/catalog';
import { similarPerfumes } from '../data/generated/similarPerfumes.js';
import { trackBrandClick, trackCouponManualApply, trackCouponRemoved, trackEvent, trackMicroconversion, trackProductView, trackRecommendationClick, trackReferralManualApply, trackWhatsappClick } from '../utils/analytics';
import { createBrandPath, createProductPath, createProductSlug } from '../utils/productRouting';
import { addToLuxurySelection } from '../commerce/cart/luxuryCartState';
import { createProductWhatsAppLink } from '../utils/whatsapp';
import { canDirectBuy, getCommercialStatusMeta } from '../utils/commercialStatus';
import { applyManualReferralCode, getReferralChangeEventName, getReferralContext, removeReferralField } from '../utils/referral';
import { applyProductSeo, createCanonicalUrl } from '../utils/seo';
import { ProductImageFallback } from './ProductCard';
import { ProductCompareEntry } from './PerfumeComparison';
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
import { recordMobileDiagnostic } from '../utils/mobileCrashDiagnostics.js';

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




function normalizePdpCopy(value) {
  const replacements = new Map([
    ['elegant', 'Elegante'],
    ['luxury', 'Luxo discreto'],
    ['premium', 'Refinado'],
    ['clean', 'Limpo'],
    ['fresh', 'Fresco'],
    ['designer', 'Urbano'],
    ['signature', 'Assinatura'],
    ['office', 'Trabalho'],
    ['nightlife', 'Noite'],
    ['beast mode', 'Intensa'],
  ]);
  const raw = String(value || '').trim();
  const key = normalizeProductClassifier(raw);
  return replacements.get(key) || raw.replace(/premium/gi, 'refinado').replace(/beast mode/gi, 'intensa');
}

function normalizePdpChipLabel(value) {
  const normalized = normalizePdpCopy(value);
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '';
}

function getPerformanceSignalStyle(item = {}) {
  const level = normalizeProductClassifier(item.level);
  const value = Number(item.value) || 0;
  if (level.includes('intens') || value >= 0.78) {
    return {
      label: 'Intensa',
      meterClass: 'lazule-dna-meter lazule-performance-meter lazule-performance-meter--intense block h-full rounded-full',
      barClass: 'h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5',
      cardClass: 'lazule-performance-signal lazule-performance-signal--intense rounded-2xl border border-lazule-gold/24 bg-lazule-night/58 p-3.5',
    };
  }
  if (level.includes('marcante') || value >= 0.62) {
    return {
      label: 'Marcante',
      meterClass: 'lazule-dna-meter lazule-performance-meter lazule-performance-meter--marked block h-full rounded-full',
      barClass: 'h-1.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5',
      cardClass: 'lazule-performance-signal lazule-performance-signal--marked rounded-2xl border border-lazule-gold/18 bg-lazule-night/48 p-3.5',
    };
  }
  return {
    label: level.includes('suave') ? 'Suave' : 'Moderada',
    meterClass: 'lazule-dna-meter lazule-performance-meter lazule-performance-meter--moderate block h-full rounded-full',
    barClass: 'h-1 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5',
    cardClass: 'lazule-performance-signal lazule-performance-signal--moderate rounded-2xl border border-white/10 bg-lazule-night/38 p-3.5',
  };
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


function buildMobileConversionChips(product = {}, atmosphere = buildSemanticAtmosphere(product), humanReading = {}) {
  const normalizedCategory = normalizeProductClassifier(product.category);
  const normalizedGender = normalizeProductClassifier(product.gender);
  const atmosphereLabels = {
    'mineral-aquatic': 'Luxo Clean',
    'amber-oriental': 'Âmbar Moderno',
    'amber-nocturne': 'Noite Elegante',
    'smoky-dark': 'Madeiras Escuras',
    'luxury-clean': 'Luxo Clean',
    'floral-luminous': 'Floral Luminoso',
    signature: 'Assinatura LAZULE',
  };
  const genderLabel = normalizedGender === 'masculino'
    ? 'Masculino'
    : normalizedGender === 'feminino'
      ? 'Feminino'
      : normalizedGender === 'unissex'
        ? 'Unissex'
        : '';
  const originLabel = normalizedCategory.includes('arabe') ? 'Importado Árabe' : 'Importado';

  return uniqueText([
    originLabel,
    genderLabel,
    atmosphereLabels[atmosphere.profile] || 'Luxo Clean',
    humanReading.humanOccasion ? normalizePdpChipLabel(humanReading.humanOccasion) : 'Assinatura Diária',
  ]).slice(0, 4);
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
    { label: 'Atmosfera', value: uniqueText([...(signals.vibes || []), ...getVibeItems(product)]).slice(0, 3).join(' · ') || humanReading.personality },
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
      alt: `Detalhe refinado do perfume ${product.name}`,
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
    <div className="pt-3">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lazule-gold">Tem cupom ou código de indicação?</p>
      <form className="mt-3 flex gap-2" onSubmit={handleSubmit}>
        <input
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-lazule-night/55 px-4 py-2.5 text-sm text-lazule-mist outline-none transition placeholder:text-slate-400 focus:border-lazule-gold/70 focus:ring-2 focus:ring-lazule-gold/20"
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
        <button className="lazule-pressable rounded-full border border-lazule-gold/45 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night" type="submit">
          Aplicar
        </button>
      </form>
      <div className="mt-3 min-h-5 text-xs leading-5">
        {error ? <p className="text-red-600 lg:text-red-200" role="alert">{error}</p> : null}
        {!error && feedback ? <p className="text-emerald-700 lg:text-emerald-200" role="status">{feedback}</p> : null}
        {!error && appliedCode ? (
          <p className="flex flex-wrap items-center gap-2 text-slate-300">
            <span><strong className="text-lazule-gold">{appliedCode.label}:</strong> {appliedCode.value}</span>
            <button className="lazule-pressable text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400 underline decoration-lazule-gold/40 underline-offset-4 transition hover:text-lazule-gold" type="button" onClick={handleRemove}>
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
    <div className="lazule-product-hero relative overflow-hidden rounded-b-[1.65rem] border-b border-lazule-gold/20 bg-lazule-night shadow-mineral sm:rounded-b-[2.35rem] lg:rounded-[3rem] lg:border">
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
              <figcaption className="absolute bottom-4 left-4 text-[0.6rem] uppercase tracking-[0.24em] text-lazule-gold/80 sm:bottom-7 sm:left-8 sm:tracking-[0.34em]">
                {slide.label}
              </figcaption>
            </figure>
          );
        })}
      </div>
      {gallery.length > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 sm:bottom-7 sm:right-8" role="group" aria-label="Selecionar imagem da galeria">
          {gallery.map((slide, index) => (
            <button
              className={`lazule-product-dot h-2 rounded-full transition-all duration-300 ${activeSlide === index ? 'w-7 bg-lazule-gold' : 'w-2 bg-white/35'}`}
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
      trackMicroconversion('accord_click', { product_id: product?.id, product_name: product?.name, accordion_title: title, source_page: 'product' });
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
  const base = ['presença forte', 'elegância natural'];

  if (normalizedCategory.includes('arabe')) {
    base.unshift('noite intensa', 'rastro opulento');
  } else {
    base.unshift('assinatura sofisticada', 'rotina refinada');
  }

  if (normalizedReference || normalizedGender === 'unissex') {
    base.push('descoberta olfativa');
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
      content: description || product.narrative || 'Uma escolha refinada da LAZULE FRAGRANCES para quem prefere perfumes com identidade, presença e acabamento elegante.',
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
    <section className="lazule-pdp-card lazule-reveal overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_30rem),linear-gradient(145deg,rgba(10,20,42,0.94),rgba(4,8,18,0.9))]">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Perfil olfativo</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist sm:text-4xl">DNA olfativo</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Uma leitura clara de presença, textura e contexto. Sem excesso técnico.
          </p>
        </div>
        <div className="rounded-[1.55rem] border border-lazule-gold/18 bg-lazule-gold/[0.075] p-4 text-sm leading-6 text-lazule-mist lg:max-w-sm">
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
              className="lazule-dna-row lazule-reveal-item w-full rounded-[1.55rem] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-lazule-gold/30 hover:bg-white/[0.06]"
              style={{ '--item-delay': `${index * 55}ms`, '--dna-width': `${Math.round(dimension.value * 100)}%` }}
              onClick={() => trackExperienceEvent('dna_dimension_click', experience, { dimension: dimension.id, dimension_level: dimension.level })}
            >
              <span className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-lazule-mist">{normalizePdpCopy(dimension.label)}</span>
                <span className="shrink-0 rounded-full border border-lazule-gold/20 bg-lazule-gold/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lazule-gold">{normalizePdpChipLabel(dimension.level)}</span>
              </span>
              <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <span className="lazule-dna-meter block h-full rounded-full bg-gradient-to-r from-lazule-gold/75 via-[#dfbd68] to-white/80" />
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-400">{normalizePdpCopy(dimension.tone)}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <ExperienceChipPanel title="Ideal para" eyebrow="Uso ideal" items={experience.idealUsage} experience={experience} eventName="ideal_usage_click" />
          <PerformancePanel performance={experience.performance} />
          <div className="rounded-[1.65rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Disponibilidade</p>
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
    <div className="rounded-[1.65rem] border border-white/10 bg-white/[0.04] p-5">
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
            {normalizePdpChipLabel(item.label)}
          </button>
        ))}
      </div>
    </div>
  );
}

function PerformancePanel({ performance }) {
  return (
    <div className="rounded-[1.65rem] border border-white/10 bg-white/[0.04] p-5">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Presença</p>
      <h3 className="mt-2 font-display text-2xl text-lazule-mist">Performance na pele</h3>
      <p className="mt-2 text-xs leading-5 text-slate-400">Sinais práticos para entender alcance, duração e impacto.</p>
      <div className="mt-4 space-y-3">
        {performance.map((item) => {
          const signal = getPerformanceSignalStyle(item);
          return (
            <div key={item.id} className={signal.cardClass} style={{ '--dna-width': `${Math.round(item.value * 100)}%` }}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-200">{normalizePdpCopy(item.label).replace(' percebida', '')}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[0.64rem] uppercase tracking-[0.12em] text-lazule-gold">{signal.label}</span>
              </div>
              <div className={`mt-2.5 ${signal.barClass}`} aria-hidden="true">
                <span className={signal.meterClass} />
              </div>
              {item.disclaimer ? <p className="mt-2 text-[0.68rem] leading-4 text-slate-400">{normalizePdpCopy(item.disclaimer)}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VibeSection({ product }) {
  const vibeItems = getVibeItems(product);
  if (!vibeItems.length) return null;

  return (
    <section className="lazule-reveal rounded-[1.8rem] border border-lazule-gold/15 bg-white/[0.045] p-4 shadow-mineral backdrop-blur sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-lazule-gold">Atmosfera</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {vibeItems.map((item, index) => (
          <div
            className="lazule-touch-card lazule-reveal-item rounded-full border border-white/10 bg-lazule-night/35 px-3 py-1.5 text-xs text-lazule-mist"
            key={item}
            style={{ '--item-delay': `${index * 55}ms` }}
          >
            {normalizePdpChipLabel(item)}
          </div>
        ))}
      </div>
    </section>
  );
}

function RecommendationCard({ product, context = 'recommendations', explanation, index = 0, moodProfile = 'signature', atmosphereProfile = 'signature' }) {
  return (
    <a
      className="lazule-product-card lazule-reveal-item lazule-recommendation-card group flex w-[64vw] max-w-[15.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.065] shadow-mineral backdrop-blur transition duration-500 md:w-[15.5rem]"
      href={createProductPath(product)}
      data-mood={moodProfile}
      data-atmosphere={atmosphereProfile}
      style={{ '--item-delay': `${120 + (index * 85)}ms` }}
      onClick={() => trackRecommendationClick(product, { source_page: 'product_recommendations', section: context, recommendation_origin: context, position: index + 1 })}
    >
      <div className="relative h-36 overflow-hidden bg-lazule-depth">
        {product.image ? (
          <img
            className="absolute inset-0 h-full w-full object-contain object-center p-2.5 opacity-95 transition duration-700 group-hover:scale-[1.04]"
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
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.26em] text-lazule-gold">{product.brand}</p>
          <h3 className="mt-1.5 line-clamp-2 font-display text-[1.35rem] leading-tight text-lazule-mist group-hover:text-lazule-gold">
            {getProductDisplayName(product)}
          </h3>
          <p className="mt-1.5 line-clamp-1 text-[0.7rem] text-slate-300">DNA: {humanizeSignature(product.signature || product.olfactoryReference || 'Perfil olfativo em curadoria')}</p>
          <p className="mt-1 line-clamp-2 text-[0.7rem] leading-4 text-slate-300">{explanation || product.semanticReasons?.[0] || product.narrative || 'Conexão por assinatura olfativa e contexto de uso.'}</p>
        </div>
        <strong className="mt-2 inline-flex w-fit rounded-full border border-lazule-gold/30 bg-lazule-gold/12 px-2.5 py-1 text-sm font-semibold text-[#f8f3df]">{canDirectBuy(product) ? formatBRL(product.salePrice) : getCommercialStatusMeta(product).badge}</strong>
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
    <section className="lazule-pdp-card lazule-reveal">
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
    <section className="lazule-pdp-card lazule-reveal lazule-recommendation-atmosphere">
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
    <section ref={railRef} className="lazule-pdp-card lazule-reveal">
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
    <section className="lazule-pdp-card lazule-reveal lazule-recommendation-atmosphere">
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
    <div className={`lazule-sticky-whatsapp fixed inset-x-0 bottom-0 z-[70] border-t border-lazule-gold/20 bg-slate-950/82 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2.5 shadow-[0_-18px_60px_rgba(2,6,23,0.52)] backdrop-blur-xl transition duration-500 sm:px-4 sm:pt-3 ${showBar ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`} role="region" aria-label="Compra rápida">
      <div className="mx-auto flex max-w-5xl items-center gap-2 sm:gap-3">
        {product.image ? <img src={product.image} alt={product.name} className="hidden h-12 w-12 rounded-xl border border-white/10 object-contain bg-black/20 p-1 sm:block" loading="lazy" /> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.62rem] uppercase tracking-[0.18em] text-slate-400">{getProductDisplayName(product)}</p>
          <strong className="block truncate text-base text-lazule-mist sm:text-lg">{directBuy ? formatBRL(product.salePrice) : 'Sob consulta'}</strong>
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
          Guardar
        </button>
        {directBuy ? (
          <button
            type="button"
            className="lazule-premium-button lazule-cta-shimmer inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-lazule-gold px-4 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-lazule-night shadow-aureate transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-xs sm:tracking-[0.12em]"
            disabled={isCheckingOut}
            aria-label={`Finalizar compra de ${product.name || 'fragrância LAZULE'} via Mercado Pago`}
            onClick={() => {
              trackEvent('sticky_cta_click', { product_id: product.id, product_name: product.name, source_page: 'product', cta_location: 'sticky_checkout' });
              handleStickyCheckout();
            }}
          >
            {isCheckingOut ? 'Abrindo pagamento…' : 'Comprar'}
          </button>
        ) : (
          <a
            className={`lazule-premium-button lazule-cta-shimmer inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-lazule-gold px-4 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-lazule-night shadow-aureate transition active:scale-[0.98] sm:px-5 sm:text-xs sm:tracking-[0.12em] ${disabled ? 'pointer-events-none opacity-60' : ''}`}
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


function ProductUnderstandingSection({ product, experience }) {
  const humanReading = createHumanPerfumeReading(product);
  const presenceReading = buildHumanPresenceReading(product);
  const whyBullets = buildWhyThisFragranceBullets(product, experience, presenceReading, humanReading);
  const profileRows = createOlfactiveProfileRows(product, experience, humanReading, presenceReading);
  const usageItems = (experience?.idealUsage || []).slice(0, 4);
  const performanceItems = (experience?.performance || []).slice(0, 3);
  const dimensionItems = (experience?.dimensions || []).slice(0, 5);

  if (!whyBullets.length && !profileRows.length && !usageItems.length && !performanceItems.length) {
    return null;
  }

  return (
    <section className="lazule-pdp-card lazule-pdp-card--understanding lazule-reveal">
      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Entenda a escolha</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist sm:text-4xl">Por que esta fragrância faz sentido</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">Intenção, perfil, performance e uso em um único contexto — sem transformar a decisão em relatório.</p>
          {whyBullets.length ? (
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-300 sm:grid-cols-2 lg:grid-cols-1">
              {whyBullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lazule-gold" aria-hidden="true" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-4">
          {profileRows.length ? (
            <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              {profileRows.map((row) => (
                <div key={row.label} className="border-b border-white/10 pb-3">
                  <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-400">{row.label}</dt>
                  <dd className="mt-1.5 text-sm font-semibold leading-5 text-lazule-mist">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {(usageItems.length || performanceItems.length) ? (
            <div className="grid gap-3 md:grid-cols-2">
              {usageItems.length ? (
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-lazule-gold">Uso ideal</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {usageItems.map((item) => (
                      <button
                        key={`${item.type}-${item.label}`}
                        type="button"
                        className="lazule-touch-card rounded-full border border-lazule-gold/22 bg-lazule-gold/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-lazule-gold"
                        onClick={() => trackExperienceEvent('ideal_usage_click', experience, { usage_type: item.type, usage_label: item.label })}
                      >
                        {normalizePdpChipLabel(item.label)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {performanceItems.length ? (
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-lazule-gold">Performance</p>
                  <div className="mt-2 space-y-2">
                    {performanceItems.map((item) => {
                      const signal = getPerformanceSignalStyle(item);
                      return (
                        <div key={item.id} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-xs" style={{ '--dna-width': `${Math.round(item.value * 100)}%` }}>
                          <span className="truncate font-semibold text-slate-300">{normalizePdpCopy(item.label).replace(' percebida', '')}</span>
                          <span className={signal.barClass} aria-hidden="true"><span className={signal.meterClass} /></span>
                          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-lazule-gold">{signal.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {dimensionItems.length ? (
            <details className="lazule-luxury-accordion rounded-[1.2rem] border border-lazule-gold/18 bg-lazule-night/28 p-3.5">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-lazule-gold">Ver DNA olfativo completo</summary>
              <div className="mt-3 grid gap-3">
                {experience?.signature?.text ? (
                  <p className="rounded-2xl border border-lazule-gold/15 bg-lazule-gold/[0.07] p-3 text-sm leading-6 text-lazule-mist">{experience.signature.text}</p>
                ) : null}
                {dimensionItems.map((dimension, index) => (
                  <button
                    key={dimension.id}
                    type="button"
                    className="lazule-dna-row lazule-reveal-item w-full rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-lazule-gold/30 hover:bg-white/[0.055]"
                    style={{ '--item-delay': `${index * 55}ms`, '--dna-width': `${Math.round(dimension.value * 100)}%` }}
                    onClick={() => trackExperienceEvent('dna_dimension_click', experience, { dimension: dimension.id, dimension_level: dimension.level })}
                  >
                    <span className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-lazule-mist">{normalizePdpCopy(dimension.label)}</span>
                      <span className="shrink-0 rounded-full border border-lazule-gold/20 bg-lazule-gold/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lazule-gold">{normalizePdpChipLabel(dimension.level)}</span>
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                      <span className="lazule-dna-meter block h-full rounded-full" />
                    </span>
                    <span className="mt-1.5 block text-xs leading-5 text-slate-400">{normalizePdpCopy(dimension.tone)}</span>
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function LazuleTrustLayer() {
  const items = [
    ['✓', 'Seleção curada', 'Escolhas revisadas por intenção, presença e acabamento.'],
    ['◆', 'Pagamento seguro', 'Checkout Mercado Pago com transição transparente.'],
    ['✦', 'Atendimento', 'Ajuda humana para comparar caminhos olfativos.'],
    ['✓', 'Processo claro', 'Preço, disponibilidade e próximos passos sem ruído.'],
  ];

  return (
    <section className="lazule-trust-compact lazule-reveal rounded-[1.8rem] border border-lazule-gold/15 bg-[linear-gradient(135deg,rgba(14,30,62,0.72),rgba(5,10,25,0.78))] p-4 shadow-mineral backdrop-blur sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-lazule-gold">Confiança LAZULE</p>
          <h2 className="mt-1 font-display text-2xl leading-tight text-lazule-mist sm:text-3xl">Compra segura, sem excesso.</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([icon, title, copy]) => (
            <div key={title} className="grid grid-cols-[1.35rem_1fr] gap-2 rounded-2xl border border-white/10 bg-lazule-night/32 px-3 py-2.5">
              <span className="text-sm text-lazule-gold" aria-hidden="true">{icon}</span>
              <span>
                <strong className="block text-xs font-semibold text-lazule-mist">{title}</strong>
                <span className="mt-0.5 block text-[0.68rem] leading-4 text-slate-400">{copy}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SemanticSearchEntry({ product }) {
  const suggestions = ['cheiro de rico', 'assinatura elegante', 'praia chique', 'luxo discreto', 'perfume executivo'];

  return (
    <section className="lazule-pdp-card lazule-pdp-card--compact lazule-reveal">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-lazule-gold">Explore</p>
          <h2 className="mt-1 font-display text-2xl text-lazule-mist sm:text-3xl">Busque por sensação</h2>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {suggestions.map((suggestion) => (
            <a
              key={suggestion}
              className="lazule-premium-button rounded-full border border-lazule-gold/25 bg-lazule-gold/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night"
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
      </div>
    </section>
  );
}


function buildReferenceLabel(product = {}) {
  const reference = String(product.olfactoryReference || product.reference || '').trim();
  const normalizedReference = normalizeProductClassifier(reference);

  if (normalizedReference.includes('imagination')) {
    return 'LV Imagination';
  }

  return reference || 'referência premium';
}

function OlfactiveQuickSummary({ product, conversionChips = [] }) {
  const referenceLabel = buildReferenceLabel(product);
  const featureItems = conversionChips.slice(0, 4);

  return (
    <div className="mt-2.5 rounded-[1.05rem] border border-lazule-gold/16 bg-gradient-to-br from-white/[0.055] via-white/[0.025] to-lazule-blue/20 p-3 shadow-[inset_0_1px_0_rgba(248,250,252,0.05)] lg:mt-4 lg:rounded-[1.25rem] lg:p-4">
      <div className="grid gap-1.5 text-[0.82rem] font-semibold leading-5 text-lazule-mist lg:text-sm">
        <p>🌊 Luxo clean e fresco</p>
        <p>🍋 Cítrico aromático</p>
        <p>☀️ Ideal para calor</p>
        <p>✨ Similar ao {referenceLabel}</p>
      </div>
      {featureItems.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5 lg:mt-3 lg:gap-2" aria-label="Características principais">
          {featureItems.map((chip, index) => (
            <span key={chip} className="lazule-semantic-chip rounded-full border border-lazule-gold/28 bg-lazule-gold/10 px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.11em] text-lazule-gold/90 lg:px-3 lg:text-[0.62rem] lg:tracking-[0.14em]" style={{ '--item-delay': `${120 + index * 90}ms` }}>
              {normalizePdpChipLabel(chip)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
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
    <div className="mt-3 space-y-2 lg:mt-5 lg:space-y-3">
      <button
        type="button"
        disabled={!directBuy || isCheckingOut}
        className="lazule-premium-button lazule-cta-shimmer inline-flex min-h-12 w-full items-center justify-center rounded-full bg-lazule-gold px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-lazule-night shadow-aureate transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 lg:text-base lg:normal-case lg:tracking-normal"
        onClick={handleCheckoutClick}
      >
        {isCheckingOut ? (<> <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-lazule-night/30 border-t-lazule-night" aria-hidden="true" />Iniciando pagamento...</>) : 'Comprar agora'}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="inline-flex min-h-9 w-full items-center justify-center rounded-full border border-lazule-gold/18 bg-white/[0.025] px-4 py-2 text-[0.72rem] font-semibold text-slate-300 transition hover:border-lazule-gold/35 hover:bg-lazule-gold/10 hover:text-lazule-gold lg:min-h-11 lg:px-6 lg:py-2.5 lg:text-sm"
          onClick={handleAddToSelection}
        >
          Guardar
        </button>
        <a
          className="inline-flex min-h-9 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.018] px-4 py-2 text-[0.72rem] font-semibold text-slate-400 transition hover:border-lazule-gold/30 hover:text-lazule-gold lg:min-h-11 lg:px-6 lg:py-2.5 lg:text-sm"
          href={whatsAppLink}
          target="_blank"
          rel="noreferrer"
          onClick={handleConsultationClick}
        >
          Tirar dúvida
        </a>
      </div>
      <div className="hidden flex-wrap items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-slate-300 lg:flex">
        <span>Pagamento via Mercado Pago</span>
        <span aria-hidden="true">·</span>
        <span>Atendimento especializado</span>
        <span aria-hidden="true">·</span>
        <span>Seleção curada pela LAZULE</span>
      </div>
      {checkoutError ? <p className="text-xs leading-5 text-red-200" role="alert">{checkoutError}</p> : null}
    </div>
  );
}

function FinalPurchaseSection({ product, whatsAppLink, referralContext }) {
  const directBuy = canDirectBuy(product);
  const statusMeta = getCommercialStatusMeta(product);

  return (
    <section className="lazule-pdp-card lazule-pdp-card--decision lazule-reveal overflow-hidden">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold">Decisão final</p>
          <h2 className="mt-2 font-display text-3xl text-lazule-mist sm:text-4xl">Pronto para escolher com segurança?</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">Perfil, alternativas e confiança já estão claros. Finalize a compra ou peça uma última orientação.</p>
        </div>
        <div className="rounded-[1.8rem] border border-white/10 bg-lazule-night/45 p-5 lg:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-lazule-gold">{getProductDisplayName(product)}</p>
              <strong className="mt-2 block text-3xl font-semibold text-lazule-mist">{directBuy ? formatBRL(product.salePrice) : statusMeta.badge}</strong>
            </div>
            <p className="max-w-xs text-xs leading-5 text-slate-400">{directBuy ? 'Checkout seguro via Mercado Pago. Suporte LAZULE se precisar.' : statusMeta.supportingCopy}</p>
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
  const conversionChips = buildMobileConversionChips(product, atmosphere, humanReading);

  return (
    <div className={`lazule-editorial-stage lazule-atmospheric-crossfade grid gap-3 px-0 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-8 lazule-mood-surface lazule-mood-${moodProfile} lazule-atmo-${atmosphere.profile}`} data-mood={moodProfile} data-compactness={cadence.compactness}>
      <span className="lazule-depth-layer lazule-depth-layer-3" aria-hidden="true" />
      <span className="lazule-depth-layer lazule-depth-layer-6" aria-hidden="true" />
      <span className="lazule-depth-layer lazule-depth-layer-fog" aria-hidden="true" />
      <DetailImage product={product} />
      <article className="lazule-hero-copy lazule-product-info-card lazule-mobile-conversion-card relative z-10 mx-3 -mt-4 overflow-hidden rounded-[1.45rem] border border-white/10 bg-lazule-night/90 text-lazule-mist shadow-mineral backdrop-blur sm:mx-0 sm:rounded-[2.35rem] lg:-ml-10 lg:mt-12 lg:rounded-[2.8rem] lg:bg-white/[0.06] lg:p-9">
        <a className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold transition hover:text-[#dfbd68] lg:text-xs lg:tracking-[0.34em]" href={createBrandPath(product.brand)} onClick={() => trackBrandClick(product.brand, { source_page: 'product_details' })}>
          {product.brand}
        </a>
        <h1 className="lazule-text-reveal mt-1.5 font-display text-[clamp(1.55rem,7vw,2.35rem)] leading-[0.98] text-lazule-mist lg:mt-2 lg:text-[clamp(2.4rem,5vw,3.7rem)]">{getProductDisplayName(product)}</h1>
        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.13em] text-slate-300 lg:mt-4 lg:gap-2 lg:text-[0.62rem] lg:tracking-[0.16em]">
          {[categoryLabel, concentration, volume].filter(Boolean).map((item) => (
            <span key={item} className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 lg:px-3 lg:py-1.5">{item}</span>
          ))}
        </div>
        <div className="mt-3 flex items-end justify-between gap-4 rounded-[1.1rem] border border-lazule-gold/20 bg-gradient-to-br from-lazule-blue/45 via-lazule-night/70 to-lazule-night/90 p-3 shadow-[inset_0_1px_0_rgba(248,250,252,0.07)] lg:mt-5 lg:rounded-[1.45rem] lg:p-4">
          <div>
            <span className="text-[0.6rem] uppercase tracking-[0.22em] text-lazule-gold">Preço</span>
            <strong className="mt-0.5 block text-2xl font-semibold text-[#f7f3e5] drop-shadow-[0_2px_10px_rgba(226,198,126,0.25)] lg:mt-1 lg:text-3xl">{directBuy ? formatBRL(product.salePrice) : 'Sob consulta'}</strong>
            <p className="mt-0.5 text-[0.68rem] text-slate-300 lg:mt-1 lg:text-xs">{directBuy ? 'checkout seguro · pronta entrega' : statusMeta.supportingCopy || 'consulta assistida pela curadoria'}</p>
          </div>
        </div>
        <OlfactiveQuickSummary product={product} conversionChips={[...conversionChips, ...chips, ...humanReading.discoveryTags]} />
        <ProductCheckoutActions product={product} whatsAppLink={whatsAppLink} directBuy={directBuy} />
        <div className="mt-3 hidden rounded-[1.2rem] border border-white/10 bg-white/[0.024] p-4 lg:block">
          <p className="font-display text-[1.38rem] leading-tight text-lazule-mist sm:text-[1.7rem]">{luxuryDescriptor}</p>
          <div className="mt-2 grid gap-2 text-sm leading-6 text-slate-300">
            <p>{atmosphericSignature}</p>
            <p>{olfactiveIdentitySummary}</p>
          </div>
        </div>
        <details className="mt-3 rounded-[1.1rem] border border-lazule-gold/16 bg-lazule-night/42 p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-lazule-gold">Cupom ou código de indicação</summary>
          <ManualReferralForm product={product} referralContext={referralContext} />
        </details>
        <details className="lazule-live-interpretation lazule-text-reveal mt-3 rounded-[1.2rem] border border-lazule-gold/18 bg-lazule-night/38 p-3.5 lg:p-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-lazule-gold">Abrir análise olfativa estendida</summary>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            <p>{tasteEvolution?.narrative || 'Esse perfume conversa com a direção recente da sua assinatura.'}</p>
            <p>{identityTensionState?.identityTension?.narrative || 'Seu gosto recente mantém contraste entre conforto e presença.'}</p>
            <p>Leitura social: {humanReading.socialImpression}</p>
            <p>Personalidade: {humanReading.personality}</p>
            <p>Ocasião humana: {humanReading.humanOccasion}</p>
            <p>Leitura editorial: {humanReading.commentary[0]}</p>
            <p>Opinião LAZULE: {editorialOpinion}</p>
          </div>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-lazule-gold/80">Presença da sessão · {sessionAtmosphere.profile}</p>
          <div className="mt-2 space-y-1.5">
            {storyFragments.map((fragment) => (
              <p key={fragment} className="text-sm leading-6 text-slate-300">{fragment}</p>
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
          <div className="mt-4 grid gap-2 rounded-2xl border border-lazule-gold/16 bg-white/[0.035] p-3 text-sm leading-6 text-slate-300">
            <p><strong className="text-lazule-mist">Quando funciona melhor:</strong> {presenceReading.whenItWorksBest.join(' ')}</p>
            <p><strong className="text-lazule-mist">Quando pode falhar:</strong> {presenceReading.whenItCanFail.join(' ')}</p>
            <p><strong className="text-lazule-mist">Leitura social:</strong> {presenceReading.socialReading}</p>
            <p><strong className="text-lazule-mist">Quem costuma usar:</strong> {presenceReading.whoUsuallyWearsThis.join(', ')}.</p>
            <p><strong className="text-lazule-mist">Percepção térmica:</strong> {presenceReading.temperaturePerception}</p>
            <p><strong className="text-lazule-mist">Distância de presença:</strong> {presenceReading.presenceDistance}</p>
            <p><strong className="text-lazule-mist">Fadiga/saturação:</strong> {presenceReading.fatigueSaturation}</p>
            {observationFragments.map((fragment) => <p key={fragment}>• {fragment}</p>)}
          </div>
        </details>
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
  const tasteStore = useMemo(() => loadTasteMemoryStore(), []);
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

    recordMobileDiagnostic('product_open', { productId: product.id, slug: product.productSlug || normalizedSlug, name: product.name });
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
    <section className="mx-auto max-w-7xl pb-24 lg:px-8 lg:py-10">
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

      <div className="mt-4 space-y-4 px-3 lg:mt-8 lg:space-y-7 lg:px-0">
        <ProductSectionErrorBoundary sectionName="trust_layer"><LazuleTrustLayer /></ProductSectionErrorBoundary>
        <ProductSectionErrorBoundary sectionName="understanding"><ProductUnderstandingSection product={product} experience={experience} /></ProductSectionErrorBoundary>
        {semanticRuntimeState === 'ready' && !experience ? (
          <SemanticEditorialFallback
            title="DNA em atualização editorial"
            copy="A assinatura olfativa detalhada deste perfume está sendo consolidada. Enquanto isso, mantemos a leitura de marca, categoria e contexto para orientar sua escolha."
          />
        ) : null}
        {safeRecommendations.length ? <ProductSectionErrorBoundary sectionName="recommendations"><ProductRecommendationsSection products={safeRecommendations} currentProduct={product} /></ProductSectionErrorBoundary> : null}
        <ProductSectionErrorBoundary sectionName="compare_entry"><ProductCompareEntry product={product} catalogProducts={catalogProducts} /></ProductSectionErrorBoundary>
        {similarGroupsCount ? <ProductSectionErrorBoundary sectionName="similar"><SimilarPerfumeSections groups={similarGroups} /></ProductSectionErrorBoundary> : null}
        {semanticRuntimeState === 'ready' && !safeRecommendations.length ? (
          <SemanticEditorialFallback
            title="Sugestões em curadoria ativa"
            copy="Nossas recomendações semânticas estão sendo refinadas para este item. Explore o catálogo por marca, assinatura e ocasião enquanto concluímos a seleção."
          />
        ) : null}
        <ProductSectionErrorBoundary sectionName="semantic_entry"><SemanticSearchEntry product={product} /></ProductSectionErrorBoundary>
        {getVibeItems(product).length ? <ProductSectionErrorBoundary sectionName="vibe_top"><VibeSection product={product} /></ProductSectionErrorBoundary> : null}
        {discoveryTermsCount ? <ProductSectionErrorBoundary sectionName="discovery_terms"><ProductDiscoveryTermsSection product={product} runtimeModules={runtimeModules} /></ProductSectionErrorBoundary> : null}
        {relationshipSectionsCount ? <ProductSectionErrorBoundary sectionName="relationships"><ProductRelationshipsSection sections={relationshipSections} currentProduct={product} experience={experience} /></ProductSectionErrorBoundary> : null}
        <ProductFooterBridge />
      </div>
      <StickyWhatsAppBar product={product} whatsAppLink={whatsAppLink} referralContext={referralContext} />
    </section>
  );
}
