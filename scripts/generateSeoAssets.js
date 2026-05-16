import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getBrandBySlug, getCatalogProductsAsync } from '../src/utils/catalog.js';
import { createBrandPath, createBrandSlug, createProductPath } from '../src/utils/productRouting.js';
import {
  DEFAULT_ORIGIN,
  DEFAULT_SOCIAL_IMAGE_PATH,
  SITE_NAME,
  createAbsoluteAssetUrl,
  createBrandSeoData,
  createCatalogSeoData,
  createFaqSeoData,
  createHomeSeoData,
  createOrganizationJsonLd,
  createProductJsonLd,
  createProductSeoData,
  createWebSiteJsonLd,
} from '../src/utils/seo.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetDir = path.resolve(ROOT_DIR, process.argv[2] || 'public');
let products = [];
let uniqueBrands = [];

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteUrl(pathname) {
  return new URL(pathname, DEFAULT_ORIGIN).href;
}

function routePathname(pathname) {
  return pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
}

function titleWithSite(title) {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

function renderMetaTags(seoData, jsonLd = []) {
  const canonicalUrl = absoluteUrl(seoData.canonicalPath);
  const image = seoData.image || createAbsoluteAssetUrl(DEFAULT_SOCIAL_IMAGE_PATH);
  const title = titleWithSite(seoData.title);

  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(seoData.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seoData.description)}" />`,
    `<meta property="og:type" content="${escapeHtml(seoData.type || 'website')}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    '<meta property="og:locale" content="pt_BR" />',
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:alt" content="Preview premium ${escapeHtml(SITE_NAME)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seoData.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    ...jsonLd.map(({ id, payload }) => `<script id="${escapeHtml(id)}" type="application/ld+json">${JSON.stringify(payload)}</script>`),
  ].join('\n    ');
}

function replaceHeadSeo(html, seoData, jsonLd) {
  const renderedMeta = renderMetaTags(seoData, jsonLd);
  return html
    .replace(/<title>[\s\S]*?<\/title>/, '<!--LAZULE_SEO_START-->')
    .replace(/\s*<meta\s+name="description"[\s\S]*?\/?>/i, '')
    .replace(/\s*<link\s+rel="canonical"[\s\S]*?\/?>/i, '')
    .replace(/\s*<meta\s+property="og:[\s\S]*?\/?>/gi, '')
    .replace(/\s*<meta\s+name="twitter:[\s\S]*?\/?>/gi, '')
    .replace(/\s*<script\s+id="lazule-[\s\S]*?<\/script>/gi, '')
    .replace('<!--LAZULE_SEO_START-->', renderedMeta);
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeSitemap(baseDir) {
  const routes = [
    { loc: '/', priority: '1.0' },
    { loc: '/catalogo', priority: '0.9' },
    { loc: '/faq', priority: '0.7' },
    ...uniqueBrands.map((brand) => ({ loc: createBrandPath(brand), priority: '0.8' })),
    ...products.map((product) => ({ loc: createProductPath(product), priority: '0.75' })),
  ];

  const urls = routes
    .map(({ loc, priority }) => `  <url>\n    <loc>${escapeHtml(absoluteUrl(loc))}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`)
    .join('\n');

  writeText(path.join(baseDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}

function writeRobots(baseDir) {
  writeText(
    path.join(baseDir, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /promo/\nDisallow: /i/\nDisallow: /indica/\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`,
  );
}

function writeRouteHtmlFiles(baseDir) {
  const indexPath = path.join(baseDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    return;
  }

  const baseHtml = fs.readFileSync(indexPath, 'utf8');
  const routes = [
    {
      path: '/',
      seoData: createHomeSeoData(),
      jsonLd: [
        { id: 'lazule-organization-jsonld', payload: createOrganizationJsonLd() },
        { id: 'lazule-website-jsonld', payload: createWebSiteJsonLd() },
      ],
    },
    { path: '/catalogo', seoData: createCatalogSeoData(), jsonLd: [] },
    { path: '/faq', seoData: createFaqSeoData(), jsonLd: [] },
    ...uniqueBrands.map((brandName) => {
      const brand = getBrandBySlug(createBrandSlug(brandName), products);
      return { path: createBrandPath(brandName), seoData: createBrandSeoData(brand), jsonLd: [] };
    }),
    ...products.map((product) => ({
      path: createProductPath(product),
      seoData: createProductSeoData(product),
      jsonLd: [{ id: 'lazule-product-jsonld', payload: createProductJsonLd(product) }],
    })),
  ];

  routes.forEach((route) => {
    const html = replaceHeadSeo(baseHtml, route.seoData, route.jsonLd);
    const pathname = routePathname(route.path);
    const outputPath = pathname === '/' ? indexPath : path.join(baseDir, pathname, 'index.html');
    writeText(outputPath, html);
  });
}

async function main() {
  products = await getCatalogProductsAsync();
  uniqueBrands = [...new Map(products.map((product) => [product.brandSlug, product.brand])).values()].filter(Boolean);

  fs.mkdirSync(targetDir, { recursive: true });
  writeSitemap(targetDir);
  writeRobots(targetDir);
  writeRouteHtmlFiles(targetDir);
  console.log(`SEO assets generated in ${path.relative(ROOT_DIR, targetDir) || '.'}`);
}

await main();
