const labels: Record<string, string> = {
  '/qa/select': '返回选品结果',
  '/qa/usage': '返回本次查询结果',
  '/face-map/results': '返回地图推荐结果',
  '/saved': '返回我的护肤方案',
  '/compare': '返回产品对比',
  '/membership': '返回护理服务',
  '/products': '返回产品指南',
}

export function productReturn(state: unknown): { to: string; label: string } {
  const fallback = { to: '/products', label: '全部产品' }
  if (!state || typeof state !== 'object' || !('returnTo' in state)) return fallback
  const value = state.returnTo
  if (typeof value !== 'string' || value.length > 2048) return fallback
  const path = value.split('?')[0]
  if (!Object.hasOwn(labels, path) || value.includes('#')) return fallback
  return { to: value, label: labels[path] }
}
