import assert from 'node:assert/strict';
import test from 'node:test';

import { formatBRL } from '../src/utils/currency.js';
import { createProductPath, createProductSlug, getProductSlugFromPath, normalizeSpaPath } from '../src/utils/productRouting.js';
import { createProductWhatsAppLink, createProductWhatsAppMessage, createWhatsAppLink } from '../src/utils/whatsapp.js';
import {
  captureReferralParams,
  clearReferralContext,
  enrichPayloadWithReferral,
  formatReferralForWhatsapp,
  getReferralContext,
  referralConfig,
} from '../src/utils/referral.js';
import { applyPromoReferralRoute, buildPromoReferralSearch, getPromoRouteMatch } from '../src/utils/promoRoutes.js';
import { canAccessAdmin, canAccessInfluencerArea, getProfileRole, isAdminRole, isInfluencerRole } from '../src/auth/roles.js';
import { createSupabaseAuthClient, getSupabaseAuthConfig } from '../src/services/supabaseAuthClient.js';

import {
  createProductAnalyticsPayload,
  createSearchAnalyticsPayload,
  getAnalyticsSnapshot,
  normalizeAnalyticsPayload,
  resetAnalyticsForTests,
  shouldTrackEvent,
  trackInfluencerRouteVisit,
  trackPageView,
  trackProductView,
  trackPromoRouteVisit,
  trackReferralApplied,
  trackWhatsappClick,
} from '../src/utils/analytics.js';

test('formatBRL formats valid prices and falls back safely', () => {
  assert.equal(formatBRL(320), 'R$ 320,00');
  assert.equal(formatBRL(undefined), 'Consulte');
});

test('product routing normalizes accents, spaces and trailing slashes', () => {
  assert.equal(createProductSlug('Âmbar Oud Gold 100ml'), 'ambar-oud-gold-100ml');
  assert.equal(createProductPath({ name: 'Âmbar Oud Gold 100ml' }), '/produto/ambar-oud-gold-100ml');
  assert.equal(normalizeSpaPath('/catalogo/'), '/catalogo');
  assert.equal(getProductSlugFromPath('/produto/%E0%A4%A'), 'e0-a4-a');
});

test('WhatsApp product message includes premium checkout details with safe fallbacks', () => {
  const message = createProductWhatsAppMessage(
    { name: 'Afnan Turathi EDP', brand: 'AFNAN', salePrice: 350, size: '90ml' },
    undefined,
    'https://lazulefragrances.com.br/produto/afnan-turathi-edp-90ml',
    { quantity: 2 },
  );

  assert.match(message, /Produto: Afnan Turathi EDP/);
  assert.match(message, /Marca: AFNAN/);
  assert.match(message, /Preço: R\$\s*350,00/);
  assert.match(message, /Variação\/tamanho: 90ml/);
  assert.match(message, /Quantidade: 2/);
  assert.match(message, /Link: https:\/\/lazulefragrances\.com\.br\/produto\/afnan-turathi-edp-90ml/);
});

test('WhatsApp links encode messages exactly once and never break on missing product data', () => {
  const genericLink = createWhatsAppLink('Olá & LAZULE?');
  assert.equal(decodeURIComponent(new URL(genericLink).searchParams.get('text')), 'Olá & LAZULE?');

  const productLink = createProductWhatsAppLink({});
  const decodedMessage = decodeURIComponent(new URL(productLink).searchParams.get('text'));
  assert.match(decodedMessage, /fragrância da curadoria LAZULE/);
  assert.match(decodedMessage, /Preço: sob consulta/);
});


test('analytics normalizes product payloads and handles incomplete products safely', () => {
  const payload = createProductAnalyticsPayload({ id: 'abc-123', name: 'Âmbar Oud', brand: 'LAZULE', salePrice: '420', catalogType: 'Árabe' });

  assert.equal(payload.product_id, 'abc-123');
  assert.equal(payload.product_name, 'Âmbar Oud');
  assert.equal(payload.brand, 'LAZULE');
  assert.equal(payload.price, 420);
  assert.equal(payload.category, 'Árabe');
  assert.equal(payload.page_path, '/');

  const incompletePayload = createProductAnalyticsPayload({});
  assert.equal(incompletePayload.page_path, '/');
  assert.ok(!Object.hasOwn(incompletePayload, 'product_name'));
});

test('analytics creates search payloads with consistent fields', () => {
  const payload = createSearchAnalyticsPayload({ searchTerm: 'sauvage', resultCount: 3, sourcePage: 'catalog' });

  assert.equal(payload.search_term, 'sauvage');
  assert.equal(payload.result_count, 3);
  assert.equal(payload.source_page, 'catalog');
});

test('analytics deduplicates events and falls back safely without configured pixels', () => {
  resetAnalyticsForTests();
  const payload = normalizeAnalyticsPayload('search', { searchTerm: 'asad', resultCount: 1 });

  assert.equal(shouldTrackEvent('search', payload, { dedupeKey: 'test-search', dedupeMs: 5000 }), true);
  assert.equal(shouldTrackEvent('search', payload, { dedupeKey: 'test-search', dedupeMs: 5000 }), false);

  resetAnalyticsForTests();
  const event = trackProductView({ name: 'Produto incompleto' });
  assert.equal(event.name, 'product_view');
  assert.equal(event.gaEventName, 'view_item');
  assert.equal(event.metaStandardName, 'ViewContent');
});

test('analytics ignores admin routes in public tracking', () => {
  resetAnalyticsForTests();

  assert.equal(trackPageView({ path: '/admin/analytics', routeName: 'admin_analytics' }), null);
  assert.equal(getAnalyticsSnapshot().events.length, 0);
});

import catalogRepository, { getAllProducts, getAllProductsAsync, getProductBySlug, getProductsByBrand, searchProducts } from '../src/data/catalogRepository.js';
import { normalizeProduct } from '../src/domain/product.js';
import { createProductJsonLd, createProductSeoData } from '../src/utils/seo.js';

test('catalog repository keeps named and default exports compatible', async () => {
  const sourceProducts = [
    { id: 'compat', name: 'Compat EDP 100ml', brand: 'LAZULE', category: 'Nicho', gender: 'Unissex', salePrice: 320, image: '', badges: [], description: '', olfactoryReference: '', available: true, featured: false },
  ];

  assert.equal(catalogRepository.getAllProducts, getAllProducts);
  assert.equal(catalogRepository.getAllProductsAsync, getAllProductsAsync);
  assert.equal((await getAllProductsAsync({ sourceProducts }))[0].id, 'compat');
});

test('catalog repository normalizes local products and resolves by canonical slug', () => {
  const sourceProducts = [
    { id: 'arab-oud', name: 'Âmbar Oud EDP 100ml', brand: 'LAZULE', category: 'Árabe', gender: 'Unissex', salePrice: 320, image: '', badges: [], description: '', olfactoryReference: '', available: true, featured: false },
  ];
  const [product] = getAllProducts({ sourceProducts });

  assert.equal(product.productSlug, 'ambar-oud-edp-100ml');
  assert.equal(product.productPath, '/produto/ambar-oud-edp-100ml');
  assert.equal(getProductBySlug('/produto/%C3%A2mbar-oud-edp-100ml', [product])?.id, 'arab-oud');
});

test('product normalization protects UI from incomplete public catalog data', () => {
  const product = normalizeProduct({ id: 'incomplete', name: '', brand: '', salePrice: 'not-a-price', image: null, badges: null });

  assert.equal(product.name, 'Fragrância LAZULE');
  assert.equal(product.salePrice, 0);
  assert.deepEqual(product.badges, []);
  assert.equal(product.productSlug, 'fragrancia-lazule');
  assert.equal(product.image, '');
});

test('catalog repository isolates brand and search queries for future data adapters', () => {
  const products = getAllProducts({ sourceProducts: [
    { id: 'a', name: 'Dior | Sauvage EDP 100ml', brand: 'Dior', category: 'Masculinos', gender: 'Masculino', salePrice: 600, image: '', badges: [], description: '', olfactoryReference: 'Sauvage', available: true, featured: true },
    { id: 'b', name: 'Lattafa | Asad EDP 100ml', brand: 'Lattafa', category: 'Árabe', gender: 'Masculino', salePrice: 220, image: '', badges: [], description: '', olfactoryReference: 'Sauvage Elixir', available: true, featured: false },
  ] });

  assert.deepEqual(getProductsByBrand('dior', products).map((product) => product.id), ['a']);
  assert.deepEqual(searchProducts('sauvage', products, { sortBy: 'featured' }).map((product) => product.id), ['a', 'b']);
});

test('SEO and WhatsApp helpers consume normalized product fallbacks safely', () => {
  const product = normalizeProduct({ id: 'safe', name: 'Teste Seguro', brand: 'LAZULE', category: 'Nicho', gender: 'Unissex', salePrice: undefined, image: '', badges: [] });
  const seo = createProductSeoData(product);
  const jsonLd = createProductJsonLd(product);
  const whatsapp = createProductWhatsAppMessage(product);

  assert.match(seo.canonicalPath, /^\/produto\/teste-seguro$/);
  assert.equal(jsonLd.offers.availability, 'https://schema.org/InStock');
  assert.match(whatsapp, /Preço: R\$\s*0,00/);
  assert.match(whatsapp, /Link: https:\/\/lazulefragrances\.com\.br\/produto\/teste-seguro/);
});


function createMemoryLocalStorage() {
  const store = new Map();

  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

function installBrowserGlobals(search = '', pathname = '/') {
  const localStorage = createMemoryLocalStorage();
  const listeners = new Map();

  global.window = {
    localStorage,
    location: {
      pathname,
      search,
      hash: '',
      origin: 'https://lazulefragrances.com.br',
      href: `https://lazulefragrances.com.br${pathname}${search}`,
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) {
        listener(event);
      }
      return true;
    },
    addEventListener(type, listener) {
      const entries = listeners.get(type) || [];
      listeners.set(type, [...entries, listener]);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) || []).filter((entry) => entry !== listener));
    },
    CustomEvent: class CustomEvent extends Event {
      constructor(type, options = {}) {
        super(type);
        this.detail = options.detail;
      }
    },
  };
  global.document = { title: 'LAZULE', head: { appendChild() {} }, getElementById: () => null };

  return localStorage;
}

function uninstallBrowserGlobals() {
  clearReferralContext();
  delete global.window;
  delete global.document;
}


test('promo route applies coupon from the short URL', () => {
  installBrowserGlobals('', '/promo/CRIA10');

  const result = applyPromoReferralRoute({ pathname: '/promo/CRIA10', now: 1_000 });
  const context = getReferralContext({ now: 1_000 });

  assert.equal(result.routeType, 'promo');
  assert.equal(result.redirectTo, '/catalogo');
  assert.equal(result.payload.coupon, 'CRIA10');
  assert.equal(context.coupon, 'CRIA10');

  uninstallBrowserGlobals();
});

test('influencer route applies ref from /i/:ref and /indica/:ref', () => {
  installBrowserGlobals('', '/i/lucas');

  const result = applyPromoReferralRoute({ pathname: '/i/lucas', now: 1_000 });

  assert.equal(result.routeType, 'influencer');
  assert.equal(result.payload.ref, 'lucas');
  assert.equal(getReferralContext({ now: 1_000 }).ref, 'lucas');
  assert.deepEqual(getPromoRouteMatch('/indica/maria'), { routeType: 'influencer', ref: 'maria', source_page: 'influencer_route' });

  uninstallBrowserGlobals();
});

test('promo referral routes combine URL segments and query params', () => {
  installBrowserGlobals('?coupon=cria10&utm_source=instagram&utm_campaign=maio', '/i/lucas');

  const result = applyPromoReferralRoute({ pathname: '/i/lucas', search: '?coupon=cria10&utm_source=instagram&utm_campaign=maio', now: 1_000 });

  assert.equal(buildPromoReferralSearch({ pathname: '/i/lucas', search: '?coupon=cria10&utm_source=instagram&utm_campaign=maio' }), '?coupon=cria10&utm_source=instagram&utm_campaign=maio&ref=lucas');
  assert.equal(result.payload.ref, 'lucas');
  assert.equal(result.payload.coupon, 'CRIA10');
  assert.equal(result.payload.utm_source, 'instagram');
  assert.equal(result.payload.utm_campaign, 'maio');

  uninstallBrowserGlobals();
});

test('promo referral routes sanitize values and fall back safely for invalid codes', () => {
  installBrowserGlobals('', '/promo/%40cria%2010!!');

  const sanitizedResult = applyPromoReferralRoute({ pathname: '/promo/%40cria%2010!!', now: 1_000 });
  assert.equal(sanitizedResult.payload.coupon, 'CRIA10');
  assert.equal(getReferralContext({ now: 1_000 }).coupon, 'CRIA10');

  uninstallBrowserGlobals();
  installBrowserGlobals('', '/promo/%21%21%21');

  const invalidResult = applyPromoReferralRoute({ pathname: '/promo/%21%21%21', now: 1_000 });
  assert.equal(invalidResult.redirectTo, '/catalogo');
  assert.ok(!invalidResult.payload.coupon);
  assert.deepEqual(getReferralContext({ now: 1_000 }), {});

  uninstallBrowserGlobals();
});

test('promo and influencer routes emit analytics payloads with referral context', () => {
  installBrowserGlobals('?utm_source=instagram&utm_campaign=maio', '/promo/CRIA10');
  resetAnalyticsForTests();

  const promoResult = applyPromoReferralRoute({ pathname: '/promo/CRIA10', search: '?utm_source=instagram&utm_campaign=maio', now: 1_000 });
  const promoVisit = trackPromoRouteVisit(promoResult.payload);
  const promoApplied = trackReferralApplied(promoResult.payload);

  assert.equal(promoVisit.name, 'promo_route_visit');
  assert.equal(promoApplied.name, 'referral_applied');
  assert.equal(promoVisit.payload.coupon, 'CRIA10');
  assert.equal(promoVisit.payload.utm_source, 'instagram');
  assert.equal(promoVisit.payload.utm_campaign, 'maio');
  assert.equal(promoVisit.payload.source_page, 'promo_route');

  uninstallBrowserGlobals();
  installBrowserGlobals('?coupon=cria10&utm_source=instagram&utm_campaign=maio', '/i/lucas');
  resetAnalyticsForTests();

  const influencerResult = applyPromoReferralRoute({ pathname: '/i/lucas', search: '?coupon=cria10&utm_source=instagram&utm_campaign=maio', now: 1_000 });
  const influencerVisit = trackInfluencerRouteVisit(influencerResult.payload);
  trackReferralApplied(influencerResult.payload);
  const snapshot = getAnalyticsSnapshot();

  assert.equal(influencerVisit.name, 'influencer_route_visit');
  assert.equal(influencerVisit.payload.ref, 'lucas');
  assert.equal(influencerVisit.payload.coupon, 'CRIA10');
  assert.equal(influencerVisit.payload.utm_source, 'instagram');
  assert.equal(influencerVisit.payload.utm_campaign, 'maio');
  assert.equal(influencerVisit.payload.source_page, 'influencer_route');
  assert.ok(snapshot.events.some((event) => event.name === 'referral_applied' && event.payload.ref === 'lucas'));

  uninstallBrowserGlobals();
});

test('referral captures ref/coupon/utm with first-touch persistence', () => {
  installBrowserGlobals('?ref=@criadora&coupon=cria10&utm_source=instagram&utm_campaign=maio');

  const context = captureReferralParams({ now: 1_000 });

  assert.equal(context.ref, 'criadora');
  assert.equal(context.coupon, 'CRIA10');
  assert.equal(context.utm_source, 'instagram');
  assert.equal(context.utm_campaign, 'maio');
  assert.equal(context.attributionRule, referralConfig.attributionRule);

  const preservedContext = captureReferralParams({ search: '?ref=outra&coupon=novo20', now: 2_000 });
  assert.equal(preservedContext.ref, 'criadora');
  assert.equal(preservedContext.coupon, 'CRIA10');

  uninstallBrowserGlobals();
});

test('referral context expires after configurable window', () => {
  installBrowserGlobals('?ref=influencer&coupon=VIP10');

  captureReferralParams({ expirationDays: 1, now: 10_000 });
  assert.equal(getReferralContext({ now: 10_000 + 23 * 60 * 60 * 1000 }).coupon, 'VIP10');
  assert.deepEqual(getReferralContext({ now: 10_000 + 25 * 60 * 60 * 1000 }), {});

  uninstallBrowserGlobals();
});

test('referral sanitizes values and limits dangerous characters', () => {
  installBrowserGlobals('?ref=@ana<script>alert(1)</script>&coupon=cria 10!!&utm_source=insta/gr.am&utm_campaign='.concat('x'.repeat(120)));

  const context = captureReferralParams({ now: 1_000 });

  assert.equal(context.ref, 'anascriptalert1script');
  assert.equal(context.coupon, 'CRIA10');
  assert.equal(context.utm_source, 'instagr.am');
  assert.equal(context.utm_campaign.length, 80);

  uninstallBrowserGlobals();
});

test('referral enriches analytics payloads without collecting personal data', () => {
  installBrowserGlobals('?ref=criadora&coupon=cria10&utm_source=instagram&utm_campaign=drop');
  captureReferralParams({ now: Date.now() });
  resetAnalyticsForTests();

  const payload = enrichPayloadWithReferral({ event: 'manual_check' });
  assert.deepEqual(payload, {
    event: 'manual_check',
    ref: 'criadora',
    coupon: 'CRIA10',
    utm_source: 'instagram',
    utm_campaign: 'drop',
  });

  const event = trackWhatsappClick({ source_page: 'product', cta_location: 'test' });
  assert.equal(event.payload.ref, 'criadora');
  assert.equal(event.payload.coupon, 'CRIA10');
  assert.equal(event.payload.utm_source, 'instagram');
  assert.ok(!Object.hasOwn(event.payload, 'phone'));
  assert.ok(!Object.hasOwn(event.payload, 'customer_name'));

  uninstallBrowserGlobals();
});

test('WhatsApp product message includes active coupon and referral', () => {
  installBrowserGlobals('?ref=criadora&coupon=cria10');
  const referralContext = captureReferralParams({ now: 1_000 });
  const message = createProductWhatsAppMessage(
    { name: 'Perfume X', brand: 'LAZULE', salePrice: 199 },
    undefined,
    'https://lazulefragrances.com.br/produto/perfume-x',
    { referralContext },
  );

  assert.match(message, /Produto: Perfume X/);
  assert.match(message, /Preço: R\$\s*199,00/);
  assert.match(message, /Link: https:\/\/lazulefragrances\.com\.br\/produto\/perfume-x/);
  assert.match(message, /Cupom: CRIA10/);
  assert.match(message, /Indicação: @criadora/);
  assert.equal(formatReferralForWhatsapp(referralContext), 'Cupom: CRIA10\nIndicação: @criadora');

  uninstallBrowserGlobals();
});


test('auth role helpers normalize roles and require active admin profiles', () => {
  assert.equal(isAdminRole(' ADMIN '), true);
  assert.equal(isInfluencerRole('influencer'), true);
  assert.equal(getProfileRole({ role: 'Admin' }), 'admin');
  assert.equal(canAccessAdmin({ role: 'admin', is_active: true }), true);
  assert.equal(canAccessAdmin({ role: 'admin', is_active: false }), false);
  assert.equal(canAccessInfluencerArea({ role: 'influencer', is_active: true }), true);
  assert.equal(canAccessInfluencerArea({ role: 'admin', is_active: true }), true);
});

test('Supabase auth client falls back safely when env is missing', async () => {
  const previousUrl = process.env.VITE_SUPABASE_URL;
  const previousAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;

  try {
    const config = getSupabaseAuthConfig();
    const client = createSupabaseAuthClient(config);
    const { data, error } = await client.auth.getSession();

    assert.equal(config.enabled, false);
    assert.equal(client.isConfigured, false);
    assert.equal(data.session, null);
    assert.match(error.message, /Supabase Auth não está configurado/);
  } finally {
    if (previousUrl === undefined) {
      delete process.env.VITE_SUPABASE_URL;
    } else {
      process.env.VITE_SUPABASE_URL = previousUrl;
    }

    if (previousAnonKey === undefined) {
      delete process.env.VITE_SUPABASE_ANON_KEY;
    } else {
      process.env.VITE_SUPABASE_ANON_KEY = previousAnonKey;
    }
  }
});
