const productImages: Record<string, string> = {
  'local-01': '/product-images/local-01.png',
  'local-02': '/product-images/local-02.png',
  'local-03': '/product-images/local-03.png',
  'local-04': '/product-images/local-04.png',
  'local-05': '/product-images/local-05.png',
  'local-06': '/product-images/local-06.png',
  'local-07': '/product-images/local-07.png',
  'local-08': '/product-images/local-08.png',
  'local-09': '/product-images/local-09.png',
  'local-10': '/product-images/local-10.png',
  'local-11': '/product-images/local-11.png',
}

export function productImageSrc(productId: string) {
  return productImages[productId] ?? null
}

export function listedProductImageIds() {
  return Object.keys(productImages)
}
