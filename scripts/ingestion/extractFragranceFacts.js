import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const OUTPUT_PATH = 'data/imports/raw/fragrance-facts.json';
const DEFAULT_DELAY_MS = Number(process.env.LAZULE_FACT_DELAY_MS ?? 1200);
const DEFAULT_TIMEOUT_MS = Number(process.env.LAZULE_FACT_TIMEOUT_MS ?? 10000);
const USER_AGENT = 'LAZULE-FactSeedExtractor/7.6 (+https://lazulefragrances.com.br; factual extraction only)';

const BLOCK_HINTS = ['cloudflare', 'attention required', 'captcha', 'access denied', 'forbidden', 'temporarily blocked', 'verify you are human'];

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function clean(v = '') { return String(v).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function splitList(v = '') { return [...new Set(clean(v).split(/[,;|]+/).map((x) => x.trim()).filter(Boolean).slice(0, 30))]; }
function normalizeYear(value) {
  const match = String(value ?? '').match(/\b(19\d{2}|20\d{2})\b/);
  return match ? match[1] : '';
}

export function parseInputTargets(arg) {
  if (!arg) throw new Error('Forneça uma URL ou arquivo .txt/.json com URLs.');
  if (/^https?:\/\//i.test(arg)) return [arg];
  const content = fs.readFileSync(arg, 'utf8').trim();
  if (arg.endsWith('.json')) {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.every((v) => /^https?:\/\//i.test(String(v)))) return parsed.filter((v) => /^https?:\/\//i.test(String(v)));
    if (Array.isArray(parsed.urls)) return parsed.urls.filter((v) => /^https?:\/\//i.test(String(v)));
    if (Array.isArray(parsed) && parsed.every((v) => v && typeof v === 'object' && 'query' in v)) {
      return parsed.flatMap((entry) => (entry.candidates ?? []).map((c) => c?.url).filter((u) => /^https?:\/\//i.test(String(u))));
    }
    throw new Error('JSON inválido: use array de URLs, {"urls": []} ou saída discover:fragrances.');
  }
  return content.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^https?:\/\//i.test(line));
}

export function extractFactsFromHtml(html, sourceUrl) {
  const text = clean(html);
  const lower = text.toLowerCase();
  if (BLOCK_HINTS.some((hint) => lower.includes(hint))) return { blocked: true };

  const record = {
    sourceUrl,
    sourceType: 'fact_seed',
    name: '', brand: '', notes: [], accords: [], family: '', concentration: '', gender: '', releaseYear: '', perfumer: '',
    extractionConfidence: 'incomplete',
    requiresReview: true,
    status: 'semantic_only',
    curationState: 'needs_review',
    knowledgeVisibility: 'internal',
  };

  const jsonLdBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]);

  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block.trim());
      const nodes = Array.isArray(data) ? data : [data, ...(Array.isArray(data['@graph']) ? data['@graph'] : [])];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        record.name ||= clean(node.name ?? node.headline ?? '');
        record.brand ||= clean(node.brand?.name ?? node.brand ?? '');
      }
    } catch {}
  }

  record.name ||= clean((html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || [])[1] || '');
  record.brand ||= clean((html.match(/\bbrand\b[:\s-]*([A-Za-zÀ-ÿ0-9'\- ]{2,40})/i) || [])[1] || '');
  record.perfumer = clean((html.match(/\b(perfumer|perfumista)\b[:\s-]*([A-Za-zÀ-ÿ'\- ]{3,60})/i) || [])[2] || '');
  record.family = clean((html.match(/\b(family|fam[ií]lia olfativa)\b[:\s-]*([A-Za-zÀ-ÿ'\- ]{3,60})/i) || [])[2] || '');
  record.concentration = clean((html.match(/\b(edp|edt|parfum|eau de parfum|eau de toilette|extrait)\b/i) || [])[1] || '').toLowerCase();
  record.gender = clean((html.match(/\b(gender|g[eê]nero|for men|for women|unisex)\b[:\s-]*([A-Za-zÀ-ÿ'\- ]{2,40})/i) || [])[2] || '');
  record.releaseYear = normalizeYear((html.match(/\b(release|lan[cç]amento|year|ano)\b[:\s-]*([^<\n]{2,30})/i) || [])[2] || '');

  const notesMatch = html.match(/\b(notes|notas)\b[^:]*:\s*([^<\n]{3,250})/i);
  if (notesMatch) record.notes = splitList(notesMatch[2]);
  const accordsMatch = html.match(/\b(accords|acordes)\b[^:]*:\s*([^<\n]{3,200})/i);
  if (accordsMatch) record.accords = splitList(accordsMatch[2]);

  const filled = [record.name, record.brand, record.notes.length, record.accords.length, record.releaseYear, record.perfumer, record.family].filter(Boolean).length;
  record.extractionConfidence = filled >= 6 ? 'inferred' : filled >= 4 ? 'incomplete' : 'incomplete';
  if (record.name && record.brand && record.notes.length && record.accords.length && record.releaseYear) record.extractionConfidence = 'highly_validated';

  return { blocked: false, record };
}

async function fetchHtml(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'text/html' }, signal: controller.signal });
    if ([401, 403, 429].includes(res.status)) return { blocked: true, reason: `HTTP ${res.status}` };
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { html: await res.text() };
  } catch (error) {
    if (error?.name === 'AbortError') return { error: 'Timeout ao buscar página.' };
    return { error: `Falha de rede: ${error.message}` };
  } finally { clearTimeout(timeout); }
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Uso: npm run extract:facts -- <URL|arquivo.txt|arquivo.json> [--run-pipeline]');
    process.exit(1);
  }
  const runPipeline = process.argv.includes('--run-pipeline');
  const urls = parseInputTargets(arg);
  const seen = new Set();
  const records = [];
  const report = { total: urls.length, success: 0, blockedOrFailed: 0, incomplete: 0, duplicates: 0, sentToNeedsReview: 0 };

  for (const url of urls) {
    if (seen.has(url)) { report.duplicates += 1; continue; }
    seen.add(url);
    const fetched = await fetchHtml(url);
    if (fetched.blocked || fetched.error) {
      report.blockedOrFailed += 1;
      console.warn(`⚠️ Não foi possível processar ${url}: ${fetched.reason ?? fetched.error}. Sem tentativas de bypass.`);
      await sleep(DEFAULT_DELAY_MS);
      continue;
    }
    const parsed = extractFactsFromHtml(fetched.html, url);
    if (parsed.blocked || !parsed.record) {
      report.blockedOrFailed += 1;
      console.warn(`⚠️ Bloqueio detectado em ${url}. Interrompendo extração desse alvo.`);
      await sleep(DEFAULT_DELAY_MS);
      continue;
    }
    records.push(parsed.record);
    report.success += 1;
    if (parsed.record.extractionConfidence === 'incomplete') report.incomplete += 1;
    if (parsed.record.curationState === 'needs_review') report.sentToNeedsReview += 1;
    await sleep(DEFAULT_DELAY_MS);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(records, null, 2));
  console.log(`Relatório: total=${report.total}, sucesso=${report.success}, bloqueadas/falharam=${report.blockedOrFailed}, incompletas=${report.incomplete}, duplicadas=${report.duplicates}, needs_review=${report.sentToNeedsReview}`);
  console.log(`Arquivo salvo em ${OUTPUT_PATH}`);

  if (runPipeline) {
    execSync(`npm run ingest:knowledge -- ${OUTPUT_PATH} json`, { stdio: 'inherit' });
    execSync(`npm run normalize:knowledge -- ${OUTPUT_PATH} json`, { stdio: 'inherit' });
    execSync('npm run enrich:knowledge', { stdio: 'inherit' });
    execSync('npm run validate:knowledge', { stdio: 'inherit' });
    execSync('npm run build:knowledge-graph', { stdio: 'inherit' });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
