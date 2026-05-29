const PUBLIC_PRODUCT_FIELDS = [
  'id','slug','sku','name','brand','category','type','gender','salePrice','stock','stockActive','image','badges','description','olfactoryReference',
  'available','featured','status','commercialStatus','concentration','notes','accords','family','similarTo','inspirations',
  'vibeTags','occasionTags','weatherTags','performanceLabel','projectionLabel','popularityTier','description_editorial',
  'ai_summary','dna_vector','dominantDNA','recommendationHints','catalogVisibility','isInternalTestProduct',
  'olfactiveProfile','narrative','signature','personality','occasion','temperature','projection','semanticFacets',
  'semanticConfidence','semanticReasons','semanticCluster','semanticRelated',
];

const PRIVATE_FIELD_PATTERNS = [
  /sourceurl/i,
  /supplier/i,
  /raw/i,
  /wholesale/i,
  /cost/i,
  /margin/i,
  /profit/i,
  /debug/i,
  /trace/i,
  /provenance/i,
  /metadata/i,
  /snapshot/i,
];

export function isPrivateProductFieldKey(key = '') {
  return PRIVATE_FIELD_PATTERNS.some((pattern) => pattern.test(String(key)));
}

export function sanitizePublicProduct(product = {}) {
  const sanitized = {};

  for (const field of PUBLIC_PRODUCT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(product, field) && !isPrivateProductFieldKey(field)) {
      sanitized[field] = product[field];
    }
  }

  return sanitized;
}

export function sanitizePublicProducts(products = []) {
  return products.map((product) => sanitizePublicProduct(product));
}
