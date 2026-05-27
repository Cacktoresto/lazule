import { sanitizeEditorialLanguage } from './editorialIntelligenceSystem.js';

export function createEditorialOpinion(product = {}) {
  const pool = String([product?.name, product?.olfactoryReference, ...(product?.vibes || [])].join(' ')).toLowerCase();

  if (/(sweet|doce|amber|oud)/.test(pool)) {
    return sanitizeEditorialLanguage('Bonito e envolvente, mas no calor pode passar do ponto rápido.');
  }
  if (/(fresh|blue|marine|clean)/.test(pool)) {
    return sanitizeEditorialLanguage('Cheiro limpo que funciona fácil, só não espere explosão de projeção.');
  }
  return sanitizeEditorialLanguage('Mais interessante no uso real do que no hype de primeira impressão.');
}
