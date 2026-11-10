import rawFile from '../../data/products.public.json' with { type: 'json' }

type PublicProduct = {
  id: string
  displayName: string
  fullName: string | null
  pageNames: string[]
  spec: string | null
  rsp: number | null
  rspLabel: string
  page: number
  ingredientNames: string[]
  audience: string | string[] | null
  hasFullFormula: boolean
}

type PublicFile = {
  products: PublicProduct[]
}

export type CatalogProduct = {
  id: string
  displayName: string
  spec: string | null
  rsp: number | null
  rspLabel: string
  page: number
  sourceFile: string
  verification: string
  names: string[]
  ingredientNames: string[]
  skinText: string | null
  audienceText: string | null
  hasFullFormula: boolean
}

export type Catalog = {
  dataVersion: string
  products: CatalogProduct[]
  fullNames: { productId: string; key: string }[]
  fragments: Map<string, string[]>
  uniqueSpecs: { spec: string; productId: string }[]
}

const file = rawFile as PublicFile

export function normalizeText(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/宝拉珍选/g, '')
    .replace(/[()（）[\]【】「」『』"'“”‘’、，,。.;；:：/／|｜+＋·•]/g, '')
}

function audienceText(value: string | string[] | null) {
  if (typeof value === 'string') return value.trim() || null
  if (Array.isArray(value)) {
    const text = value.map((item) => item.trim()).filter(Boolean).join('；')
    return text || null
  }
  return null
}

export function loadCatalog(): Catalog {
  const products: CatalogProduct[] = file.products.map((product) => {
    const names = [product.displayName, product.fullName ?? '', ...product.pageNames].filter(
      (item) => item.trim().length > 0,
    )
    return {
      id: product.id,
      displayName: product.displayName,
      spec: product.spec,
      rsp: product.rsp,
      rspLabel: product.rspLabel,
      page: product.page,
      sourceFile: '',
      verification: '',
      names,
      ingredientNames: product.ingredientNames,
      skinText: null,
      audienceText: audienceText(product.audience),
      hasFullFormula: product.hasFullFormula,
    }
  })

  const fullNames = products.flatMap((product) =>
    [...new Set(product.names.map((name) => normalizeText(name)).filter((key) => key.length >= 2))].map((key) => ({
      productId: product.id,
      key,
    })),
  )

  const fragmentOwners = new Map<string, Set<string>>()
  for (const item of fullNames) {
    for (let size = 2; size <= item.key.length; size += 1) {
      for (let start = 0; start <= item.key.length - size; start += 1) {
        const fragment = item.key.slice(start, start + size)
        const owners = fragmentOwners.get(fragment) ?? new Set<string>()
        owners.add(item.productId)
        fragmentOwners.set(fragment, owners)
      }
    }
  }
  const fragments = new Map<string, string[]>()
  for (const [fragment, owners] of fragmentOwners) {
    fragments.set(fragment, [...owners].sort())
  }

  const specOwners = new Map<string, string[]>()
  for (const product of products) {
    if (!product.spec) continue
    const spec = normalizeText(product.spec)
    if (spec.length < 2) continue
    specOwners.set(spec, [...(specOwners.get(spec) ?? []), product.id])
  }
  const uniqueSpecs = [...specOwners.entries()]
    .filter(([, owners]) => owners.length === 1)
    .map(([spec, owners]) => ({ spec, productId: owners[0] }))

  const signature = products
    .map((product) => `${product.id}:${product.rsp ?? 'null'}:${product.page}:${product.displayName}`)
    .join('|')
  return {
    dataVersion: `${products.length}|${signature}`,
    products,
    fullNames,
    fragments,
    uniqueSpecs,
  }
}

export function findProduct(catalog: Catalog, productId: string) {
  return catalog.products.find((product) => product.id === productId) ?? null
}

export function identifyProduct(catalog: Catalog, name: string, detail: string) {
  const text = normalizeText(`${name}${detail}`)
  const fullHits = [
    ...new Set(catalog.fullNames.filter((item) => text.includes(item.key)).map((item) => item.productId)),
  ]
  let ids = fullHits
  if (ids.length === 0) {
    let longest = 0
    const found: string[] = []
    for (const [fragment, owners] of catalog.fragments) {
      if (!text.includes(fragment)) continue
      if (fragment.length > longest) {
        longest = fragment.length
        found.length = 0
        found.push(...owners)
      } else if (fragment.length === longest) {
        found.push(...owners)
      }
    }
    ids = [...new Set(found)]
  }
  if (ids.length > 1) {
    const specHits = catalog.uniqueSpecs.filter((item) => text.includes(item.spec)).map((item) => item.productId)
    const narrowed = ids.filter((id) => specHits.includes(id))
    if (narrowed.length === 1) ids = narrowed
  }
  const order = new Map(catalog.products.map((product, index) => [product.id, index]))
  ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
  if (ids.length === 1) return { kind: 'unique' as const, ids }
  if (ids.length > 1) return { kind: 'ambiguous' as const, ids }
  return { kind: 'none' as const, ids }
}
