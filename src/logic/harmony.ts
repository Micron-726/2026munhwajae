/**
 * 궁합 샘플링 — 맛 임베딩 기반
 *
 * 1) 임베딩: drinks.yaml 의 flavor(단맛·신맛·탄산…)를 벡터로 만들고
 *    전체 음료 평균을 빼서(중심화) 길이 1로 정규화한다 → 코사인 유사도 ∈ [-1, 1]
 *
 * 2) 조인트 덴시티: 음료 N 개 묶음 S 에 대해
 *        p(S | N) ∝ exp( β · 평균_{i<j} cos(e_i, e_j) )
 *    비슷한 맛끼리 뭉친 묶음일수록 확률이 지수적으로 커진다.
 *    모든 묶음의 확률이 0보다 크므로 이상한 조합도 (드물게) 나온다.
 *    음료 수가 적으면(조합 수 ≤ ENUM_LIMIT) 모든 묶음을 나열해 "정확하게" 샘플링한다.
 *
 * 3) 서프라이즈 벡터: 확률 ε 로
 *      - 먼저 N-1 개의 "궁합 코어"를 위 분포로 뽑고
 *      - 서프라이즈 벡터 s = normalize( -centroid(코어) + σ·z ),  z ~ N(0, I)
 *        (코어 맛의 반대 방향 + 약간의 무작위성)
 *      - 남은 음료 d 를 p(d) ∝ exp( κ · cos(e_d, s) ) 로 1개 뽑아 마지막 재료로 넣는다 (κ = SURPRISE_SHARPNESS).
 */
import { defaultRng, shuffle, type Rng } from './random'

export type MixingMode = 'random' | 'harmony'

export interface MixingConfig {
  mode: MixingMode
  /** β — 클수록 비슷한 맛끼리 강하게 뭉침 (0 이면 완전 랜덤과 같음) */
  harmony: number
  /** ε — 서프라이즈 재료가 끼어들 확률 (0~1) */
  surprise: number
  /** σ — 서프라이즈 벡터에 섞는 무작위성 */
  surpriseNoise: number
}

export const DEFAULT_MIXING: MixingConfig = { mode: 'harmony', harmony: 2, surprise: 0.2, surpriseNoise: 0.35 }

export type Embeddings = ReadonlyMap<string, readonly number[]>

/** 서프라이즈 선택의 날카로움 — β 와 분리해서 궁합을 약하게 해도 서프라이즈는 확실히 "이상하게" */
export const SURPRISE_SHARPNESS = 6

/** 이 개수 이하의 조합이면 전부 나열해서 정확히 샘플링 */
export const ENUM_LIMIT = 60000

// ─────────────────────────── 임베딩 ───────────────────────────

/** flavor 맵들을 중심화 + 정규화된 벡터로 바꾼다. 축 = 모든 flavor 키의 합집합 */
export function buildEmbeddings(drinks: readonly { id: string; flavor?: Readonly<Record<string, number>> }[]): {
  axes: string[]
  vectors: Map<string, number[]>
} {
  const axes = Array.from(new Set(drinks.flatMap((d) => Object.keys(d.flavor ?? {})))).sort()
  const vectors = new Map<string, number[]>()
  if (axes.length === 0) {
    for (const d of drinks) vectors.set(d.id, [])
    return { axes, vectors }
  }
  const raw = drinks.map((d) => axes.map((a) => d.flavor?.[a] ?? 0))
  const mean = axes.map((_, k) => raw.reduce((s, v) => s + v[k], 0) / raw.length)
  drinks.forEach((d, i) => vectors.set(d.id, normalize(raw[i].map((v, k) => v - mean[k]))))
  return { axes, vectors }
}

export function normalize(v: readonly number[]): number[] {
  const len = Math.hypot(...v)
  return len < 1e-9 ? v.map(() => 0) : v.map((x) => x / len)
}

export function cosine(a: readonly number[] | undefined, b: readonly number[] | undefined): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na < 1e-12 || nb < 1e-12 ? 0 : dot / Math.sqrt(na * nb)
}

/** 묶음의 평균 쌍별 유사도 (1개 이하면 0) */
export function meanPairSimilarity(ids: readonly string[], emb: Embeddings): number {
  if (ids.length < 2) return 0
  let sum = 0
  let pairs = 0
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      sum += cosine(emb.get(ids[i]), emb.get(ids[j]))
      pairs++
    }
  return sum / pairs
}

// ─────────────────────────── 조합 유틸 ───────────────────────────

export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  k = Math.min(k, n - k)
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}

function* combinations<T>(items: readonly T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) {
    yield acc.slice()
    return
  }
  for (let i = start; i <= items.length - (k - acc.length); i++) {
    acc.push(items[i])
    yield* combinations(items, k, i + 1, acc)
    acc.pop()
  }
}

/** log-weight 들에서 하나를 안정적으로(log-sum-exp) 샘플링 */
function sampleIndexFromLogWeights(logW: readonly number[], rng: Rng): number {
  const max = Math.max(...logW)
  const w = logW.map((l) => Math.exp(l - max))
  const total = w.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < w.length; i++) {
    r -= w[i]
    if (r < 0) return i
  }
  return w.length - 1
}

// ─────────────────────────── 궁합 분포 ───────────────────────────

/** 테스트·검증용: 크기 n 묶음 전체와 정확한 확률 */
export function harmonySetDistribution(
  ids: readonly string[],
  n: number,
  emb: Embeddings,
  beta: number,
): { set: string[]; p: number }[] {
  const sets = [...combinations(ids, n)]
  const logW = sets.map((s) => beta * meanPairSimilarity(s, emb))
  const max = Math.max(...logW)
  const w = logW.map((l) => Math.exp(l - max))
  const total = w.reduce((a, b) => a + b, 0)
  return sets.map((set, i) => ({ set, p: w[i] / total }))
}

/** p(S|n) ∝ exp(β · 평균 쌍별 유사도) 에서 서로 다른 음료 n 개를 뽑는다. */
export function sampleHarmonySet(
  ids: readonly string[],
  n: number,
  emb: Embeddings,
  beta: number,
  rng: Rng = defaultRng,
): string[] {
  const pool = Array.from(new Set(ids))
  if (n <= 0) return []
  if (n > pool.length) throw new RangeError(`음료가 ${n}개 필요하지만 ${pool.length}개뿐입니다.`)
  if (n === 1 || beta === 0) return shuffle(pool, rng).slice(0, n)

  if (binomial(pool.length, n) <= ENUM_LIMIT) {
    // 정확한 샘플링: 모든 묶음 나열
    const sets = [...combinations(pool, n)]
    const idx = sampleIndexFromLogWeights(
      sets.map((s) => beta * meanPairSimilarity(s, emb)),
      rng,
    )
    return sets[idx]
  }

  // 음료가 아주 많을 때의 근사: 하나씩, 이미 고른 것들과의 평균 유사도에 비례해서 추가
  const chosen = [pool[Math.floor(rng() * pool.length)]]
  while (chosen.length < n) {
    const rest = pool.filter((id) => !chosen.includes(id))
    const logW = rest.map(
      (id) => (beta * chosen.reduce((s, c) => s + cosine(emb.get(id), emb.get(c)), 0)) / chosen.length,
    )
    chosen.push(rest[sampleIndexFromLogWeights(logW, rng)])
  }
  return chosen
}

// ─────────────────────────── 서프라이즈 벡터 ───────────────────────────

function gaussian(rng: Rng): number {
  // Box–Muller
  const u = Math.max(rng(), 1e-12)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** s = normalize(-centroid(core) + σ·z) */
export function surpriseVector(core: readonly string[], emb: Embeddings, noise: number, rng: Rng = defaultRng): number[] {
  const dim = emb.get(core[0])?.length ?? 0
  if (dim === 0) return []
  const centroid = Array.from({ length: dim }, (_, k) => core.reduce((s, id) => s + (emb.get(id)?.[k] ?? 0), 0) / core.length)
  const c = normalize(centroid)
  const z = normalize(Array.from({ length: dim }, () => gaussian(rng)))
  const allZero = c.every((x) => x === 0)
  return normalize(c.map((x, k) => (allZero ? z[k] : -x + noise * z[k])))
}

/** 서프라이즈 벡터 방향에 가까운 음료일수록 잘 뽑힌다. */
export function sampleSurprise(
  core: readonly string[],
  candidates: readonly string[],
  emb: Embeddings,
  cfg: Pick<MixingConfig, "surpriseNoise">,
  rng: Rng = defaultRng,
): string {
  if (candidates.length === 0) throw new RangeError('서프라이즈 후보가 없습니다.')
  const s = surpriseVector(core, emb, cfg.surpriseNoise, rng)
  const logW = candidates.map((id) => SURPRISE_SHARPNESS * cosine(emb.get(id), s))
  return candidates[sampleIndexFromLogWeights(logW, rng)]
}

// ─────────────────────────── 최종 선택 ───────────────────────────

export interface HarmonyPick {
  ids: string[]
  /** 서프라이즈 재료의 위치 (항상 마지막), 없으면 null */
  surpriseIndex: number | null
}

/**
 * 크기 n 의 음료 목록을 고른다.
 *   확률 1-ε : 궁합 분포에서 n 개 → 순서는 무작위
 *   확률 ε   : 궁합 코어 n-1 개 (무작위 순서) + 서프라이즈 1 개 (마지막)
 */
export function chooseDrinksHarmony(
  enabledIds: readonly string[],
  n: number,
  emb: Embeddings,
  cfg: MixingConfig,
  rng: Rng = defaultRng,
): HarmonyPick {
  const pool = Array.from(new Set(enabledIds))
  if (pool.length < n) throw new RangeError(`음료가 ${n}개 필요하지만 ${pool.length}개뿐입니다.`)

  const withSurprise = cfg.surprise > 0 && n >= 2 && rng() < cfg.surprise
  if (!withSurprise) {
    return { ids: shuffle(sampleHarmonySet(pool, n, emb, cfg.harmony, rng), rng), surpriseIndex: null }
  }
  const core = shuffle(sampleHarmonySet(pool, n - 1, emb, cfg.harmony, rng), rng)
  const rest = pool.filter((id) => !core.includes(id))
  const surprise = sampleSurprise(core, rest, emb, cfg, rng)
  return { ids: [...core, surprise], surpriseIndex: n - 1 }
}
