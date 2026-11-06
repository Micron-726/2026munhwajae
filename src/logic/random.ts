/** [0, 1) 범위의 난수를 돌려주는 함수. 테스트에서 시드 고정용으로 교체할 수 있다. */
export type Rng = () => number

/** crypto.getRandomValues 기반 난수 (가능한 경우), 아니면 Math.random */
export const defaultRng: Rng = (() => {
  const c = globalThis.crypto
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(1)
    return () => {
      c.getRandomValues(buf)
      return buf[0] / 4294967296
    }
  }
  return Math.random
})()

/** min 이상 max 이하의 정수를 균등하게 뽑는다. */
export function randomInt(min: number, max: number, rng: Rng = defaultRng): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new RangeError(`잘못된 범위: ${min}~${max}`)
  }
  return min + Math.floor(rng() * (max - min + 1))
}

/** Fisher–Yates 셔플. 원본을 바꾸지 않고 새 배열을 돌려준다. */
export function shuffle<T>(items: readonly T[], rng: Rng = defaultRng): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i, rng)
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

/** 배열에서 하나를 균등하게 고른다. */
export function pickOne<T>(items: readonly T[], rng: Rng = defaultRng): T {
  if (items.length === 0) throw new RangeError('빈 배열에서는 고를 수 없습니다.')
  return items[randomInt(0, items.length - 1, rng)]
}

/** 시드 고정 난수 (mulberry32) — 테스트 재현용 */
export function seededRng(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
