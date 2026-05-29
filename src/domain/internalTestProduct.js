export function isInternalTestProduct(product = {}) {
  return product?.isInternalTestProduct === true;
}

export function excludeInternalTestProducts(products = []) {
  return (Array.isArray(products) ? products : []).filter((product) => !isInternalTestProduct(product));
}
