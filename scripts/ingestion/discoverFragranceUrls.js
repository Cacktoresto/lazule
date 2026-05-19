import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { generateFragrancePatternCandidates } from './discoveryAdapters/fragrancePatternAdapter.js';
import { generateGenericSearchCandidates } from './discoveryAdapters/genericSearchAdapter.js';

const DEFAULT_INPUT = 'data/imports/raw/fragrance-seeds-designer_masculine.txt';
const OUTPUT_PATH = 'data/imports/raw/discovered-fragrance-urls.json';
const SNAPSHOT_PATH = 'data/imports/raw/discovery-snapshots.json';
const DEFAULT_TIMEOUT_MS = Number(process.env.LAZULE_DISCOVERY_TIMEOUT_MS ?? 6000);
const DEFAULT_DELAY_MS = Number(process.env.LAZULE_DISCOVERY_DELAY_MS ?? 250);
const USER_AGENT = 'LAZULE-FragranceDiscoverySeeder/7.7 (+https://lazulefragrances.com.br; low-impact discovery)';
const REPUTATION_WEIGHTS = Object.freeze({ trusted: 0.35, acceptable: 0.2, weak: 0.05, noisy: -0.1 });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (value = '') => String(value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const safeNow = () => new Date().toISOString();

export function parseSeedInput(filePath = DEFAULT_INPUT) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  if (filePath.endsWith('.json')) {
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : data.seeds ?? [];
    return [...new Set(list.map((v) => normalize(v)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }
  return [...new Set(raw.split(/\r?\n/).map((line) => normalize(line)).filter((line) => line && !line.startsWith('#')))].sort((a, b) => a.localeCompare(b));
}

function scoreCandidate(query, candidate, validated) {
  const queryNorm = normalize(query).toLowerCase();
  const urlNorm = String(candidate.url).toLowerCase();
  const queryTokens = queryNorm.split(' ').filter(Boolean);
  const tokenHits = queryTokens.filter((token) => urlNorm.includes(token)).length;
  const proximity = queryTokens.length ? tokenHits / queryTokens.length : 0;
  const cleanliness = /\?.*=/.test(urlNorm) ? 0.1 : 0.25;
  const rep = REPUTATION_WEIGHTS[candidate.reputation] ?? 0;
  const validation = validated.ok ? 0.25 : validated.blocked ? -0.15 : -0.05;
  const score = Math.max(0, Math.min(1, (proximity * 0.4) + cleanliness + rep + validation));
  return score >= 0.7 ? 'high' : score >= 0.45 ? 'medium' : 'low';
}

async function validateCandidate(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'user-agent': USER_AGENT }, signal: controller.signal });
    if ([401, 403, 429].includes(res.status)) return { ok: false, blocked: true, reason: `HTTP ${res.status}` };
    return { ok: res.ok, blocked: false, reason: res.ok ? 'ok' : `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, blocked: false, reason: error.name === 'AbortError' ? 'timeout' : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

export function rankGraphPriority(query, graphSignals = {}) {
  const hints = graphSignals[query] ?? {};
  const score = (hints.lowDensity ? 2 : 0) + (hints.lowConfidence ? 2 : 0) + (hints.missingWardrobe ? 1 : 0) + (hints.underrepresentedAccord ? 1 : 0);
  return score;
}

export async function discoverFragranceUrls({ inputPath = DEFAULT_INPUT, runNextStep = false } = {}) {
  const seeds = parseSeedInput(inputPath);
  const attempts = [];
  const rows = [];
  const blockedCandidates = [];
  const rejectedCandidates = [];
  for (const query of seeds) {
    const generated = [...generateFragrancePatternCandidates(query), ...generateGenericSearchCandidates(query)];
    const seen = new Set();
    const candidates = [];
    for (const candidate of generated) {
      if (seen.has(candidate.url)) continue;
      seen.add(candidate.url);
      const validated = await validateCandidate(candidate.url);
      const confidence = scoreCandidate(query, candidate, validated);
      const normalized = {
        url: candidate.url,
        source: candidate.source,
        sourceType: candidate.sourceType,
        sourceReputation: candidate.reputation,
        confidence,
        status: 'candidate_only',
        curationState: 'needs_review',
        discoveredAt: safeNow(),
      };
      attempts.push({ query, candidate: normalized, validation: validated });
      if (validated.blocked) blockedCandidates.push({ query, ...normalized, reason: validated.reason });
      if (!validated.ok && !validated.blocked) rejectedCandidates.push({ query, ...normalized, reason: validated.reason });
      if (validated.ok) candidates.push(normalized);
      await sleep(DEFAULT_DELAY_MS);
    }
    const finalCandidates = candidates.sort((a, b) => `${b.confidence}:${b.source}`.localeCompare(`${a.confidence}:${a.source}`)).slice(0, 5);
    rows.push(finalCandidates.length > 0 ? { query, candidates: finalCandidates, status: 'needs_review' } : {
      query,
      candidates: [],
      status: 'needs_review',
      no_url_found: true,
      fallbackRecord: {
        name: query,
        status: 'semantic_only',
        curationState: 'needs_review',
        knowledgeConfidence: 'incomplete',
        factualFieldsMissing: true,
      },
    });
  }

  const snapshot = {
    generatedAt: safeNow(),
    internalOnly: true,
    summary: {
      seeds: seeds.length,
      successfulDiscoveries: rows.filter((r) => r.candidates.length > 0).length,
      blockedSources: blockedCandidates.length,
      lowConfidenceCandidates: attempts.filter((a) => a.candidate.confidence === 'low').length,
      graphGapCoverageImprovements: rows.filter((r) => r.candidates.length > 0).length,
    },
    rawDiscoveryAttempts: attempts,
    rejectedCandidates,
    blockedCandidates,
    normalizedCandidates: rows,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rows, null, 2));
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  if (runNextStep) execSync(`npm run extract:facts -- ${OUTPUT_PATH}`, { stdio: 'inherit' });
  return { rows, snapshot };
}

function parseArgs(argv = process.argv.slice(2)) {
  const runNextStep = argv.includes('--run-next-step');
  const inputPath = argv.find((arg) => !arg.startsWith('--')) ?? DEFAULT_INPUT;
  return { inputPath, runNextStep };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { inputPath, runNextStep } = parseArgs();
  discoverFragranceUrls({ inputPath, runNextStep }).then(({ rows }) => {
    console.log(`Discovery completed. ${rows.length} queries processed.`);
    console.log(`Output: ${OUTPUT_PATH}`);
  });
}
