import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const assistant = fs.readFileSync(new URL('../src/components/OlfactiveAssistant.jsx', import.meta.url), 'utf8');

test('responsive semantic rendering keeps AI chips stable on narrow screens', () => {
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*\.lazule-ai-chips button/);
  assert.match(css, /max-width:\s*100%/);
});

test('reduced motion behavior disables atmospheric animations', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.lazule-atmosphere__nebula/);
  assert.match(css, /animation:\s*none !important/);
});

test('no-overflow and chip wrapping stability are explicitly enforced', () => {
  assert.match(css, /\.lazule-ai-chips button\s*\{[\s\S]*text-wrap:\s*balance/);
  assert.match(css, /white-space:\s*normal/);
});

test('wardrobe and continuity language remains premium and calm', () => {
  assert.match(assistant, /Continuando sua curadoria/);
  assert.match(assistant, /Curadoria com presença\./);
});

test('loading-state choreography uses calm editorial pacing copy', () => {
  assert.match(assistant, /Lendo sua atmosfera…/);
  assert.match(assistant, /Finalizando sua curadoria…/);
});
