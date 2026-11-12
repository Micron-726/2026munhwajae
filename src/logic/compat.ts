/**
 * 함께 나오면 안 되는 음료 조합 (drinks.yaml 의 forbiddenPairs)
 */
export type ForbiddenPair = readonly [string, string]

/** 묶음 안에 금지 조합이 있으면 그 쌍을, 없으면 null */
export function findForbidden(ids: readonly string[], pairs: readonly ForbiddenPair[]): ForbiddenPair | null {
  const set = new Set(ids)
  return pairs.find(([a, b]) => set.has(a) && set.has(b)) ?? null
}

/** 켜진 음료 중 금지 조합에 해당하는 쌍만 */
export function activePairs(enabledIds: readonly string[], pairs: readonly ForbiddenPair[]): ForbiddenPair[] {
  const set = new Set(enabledIds)
  return pairs.filter(([a, b]) => set.has(a) && set.has(b))
}

/**
 * 금지 조합을 피하면서 한 레시피에 넣을 수 있는 최대 음료 수.
 * (금지 쌍에 걸린 음료들만 대상으로 가장 큰 "서로 문제없는" 부분집합을 완전 탐색 — 금지 쌍은 몇 개뿐이라 충분히 빠름)
 */
export function maxCompatibleCount(enabledIds: readonly string[], pairs: readonly ForbiddenPair[]): number {
  const enabled = Array.from(new Set(enabledIds))
  const active = activePairs(enabled, pairs)
  if (active.length === 0) return enabled.length
  const involved = Array.from(new Set(active.flat()))
  if (involved.length > 20) throw new RangeError('금지 조합이 너무 많습니다.')
  let best = 0
  for (let mask = 0; mask < 1 << involved.length; mask++) {
    const chosen = involved.filter((_, i) => mask & (1 << i))
    if (chosen.length > best && !findForbidden(chosen, active)) best = chosen.length
  }
  return enabled.length - involved.length + best
}
