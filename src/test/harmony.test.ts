import { describe, expect, it } from 'vitest'
import { ALL_DRINK_IDS, DRINKS, EMBEDDINGS, MIXING } from '../data/drinks'
import { DrinkConfigError, parseMixing } from '../data/drinkSchema'
import { TOTAL_ML } from '../logic/fractions'
import {
  buildEmbeddings,
  chooseDrinksHarmony,
  cosine,
  DEFAULT_MIXING,
  ENUM_LIMIT,
  binomial,
  harmonySetDistribution,
  meanPairSimilarity,
  sampleHarmonySet,
  type MixingConfig,
} from '../logic/harmony'
import { generateRecipe } from '../logic/recipeGenerator'
import { randomInt, seededRng, shuffle } from '../logic/random'

const IDS = [...ALL_DRINK_IDS]
const sim = (a: string, b: string) => cosine(EMBEDDINGS.get(a), EMBEDDINGS.get(b))
const NO_SURPRISE: MixingConfig = { ...DEFAULT_MIXING, surprise: 0 }

describe('맛 임베딩', () => {
  it('모든 음료가 길이 1 벡터를 가진다', () => {
    for (const id of IDS) {
      const v = EMBEDDINGS.get(id)!
      expect(Math.hypot(...v)).toBeCloseTo(1, 6)
    }
  })

  it('직관적으로 비슷한 음료가 더 가깝다', () => {
    expect(sim('orange-juice', 'apple-juice')).toBeGreaterThan(0.7)
    expect(sim('cider', 'cola')).toBeGreaterThan(sim('cider', 'milk'))
    expect(sim('milk', 'milkis')).toBeGreaterThan(sim('milk', 'orange-juice'))
    expect(sim('americano', 'grape-juice')).toBeLessThan(0)
  })

  it('flavor 가 없으면 중립(유사도 0)으로 취급', () => {
    const { vectors } = buildEmbeddings([{ id: 'a' }, { id: 'b', flavor: { sweet: 1 } }, { id: 'c', flavor: { sour: 1 } }])
    expect(cosine(vectors.get('a'), vectors.get('b'))).toBeLessThanOrEqual(0)
    const empty = buildEmbeddings([{ id: 'a' }, { id: 'b' }])
    expect(cosine(empty.vectors.get('a'), empty.vectors.get('b'))).toBe(0)
  })
})

describe('조인트 덴시티 p(S) ∝ exp(β · 평균 유사도)', () => {
  it('확률 합 = 1, 유사도가 높은 묶음일수록 확률이 높다', () => {
    const dist = harmonySetDistribution(IDS, 3, EMBEDDINGS, 4)
    expect(dist).toHaveLength(binomial(IDS.length, 3))
    expect(dist.reduce((s, d) => s + d.p, 0)).toBeCloseTo(1, 9)
    const sorted = [...dist].sort((a, b) => meanPairSimilarity(a.set, EMBEDDINGS) - meanPairSimilarity(b.set, EMBEDDINGS))
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].p).toBeGreaterThanOrEqual(sorted[i - 1].p - 1e-12)
    // 이상한 조합도 확률 0 이 아니다
    expect(Math.min(...dist.map((d) => d.p))).toBeGreaterThan(0)
  })

  it('β = 0 이면 완전 균등', () => {
    const dist = harmonySetDistribution(IDS, 2, EMBEDDINGS, 0)
    for (const d of dist) expect(d.p).toBeCloseTo(1 / dist.length, 12)
  })

  it('샘플러가 정확한 분포를 따른다 (경험 빈도 ≈ 이론 확률)', () => {
    const exact = harmonySetDistribution(IDS, 2, EMBEDDINGS, 4)
    const rng = seededRng(123)
    const runs = 40000
    const counts = new Map<string, number>()
    for (let i = 0; i < runs; i++) {
      const key = [...sampleHarmonySet(IDS, 2, EMBEDDINGS, 4, rng)].sort().join('+')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    for (const { set, p } of exact) {
      const freq = (counts.get([...set].sort().join('+')) ?? 0) / runs
      expect(Math.abs(freq - p)).toBeLessThan(0.006)
    }
  })

  it('레시피에서 비슷한 쌍이 실제로 더 자주 함께 나온다', () => {
    const rng = seededRng(7)
    const co = new Map<string, number>()
    for (let i = 0; i < 15000; i++) {
      const r = generateRecipe({ enabledDrinkIds: IDS, minCount: 2, maxCount: 4 }, rng, Date.now, {
        config: NO_SURPRISE,
        embeddings: EMBEDDINGS,
      })
      const ids = r.items.map((x) => x.drinkId).sort()
      for (let a = 0; a < ids.length; a++)
        for (let b = a + 1; b < ids.length; b++) co.set(`${ids[a]}+${ids[b]}`, (co.get(`${ids[a]}+${ids[b]}`) ?? 0) + 1)
    }
    const pairs = [...co.entries()].map(([k, n]) => {
      const [a, b] = k.split('+')
      return { s: sim(a, b), n }
    })
    // 유사도와 동시 등장 횟수의 상관계수
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const ms = mean(pairs.map((p) => p.s))
    const mn = mean(pairs.map((p) => p.n))
    const cov = mean(pairs.map((p) => (p.s - ms) * (p.n - mn)))
    const sd = (xs: number[], m: number) => Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
    const corr = cov / (sd(pairs.map((p) => p.s), ms) * sd(pairs.map((p) => p.n), mn))
    expect(corr).toBeGreaterThan(0.7)
    expect(co.get('apple-juice+orange-juice')!).toBeGreaterThan(1.5 * (co.get('americano+grape-juice') ?? 0))
  })

  it('음료가 아주 많을 때(조합 수 > 한도)도 근사 샘플링으로 동작', () => {
    const rng = seededRng(9)
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: `d${i}`,
      flavor: { sweet: rng(), sour: rng(), fizzy: rng(), bitter: rng() },
    }))
    expect(binomial(40, 5)).toBeGreaterThan(ENUM_LIMIT)
    const { vectors } = buildEmbeddings(many)
    for (let i = 0; i < 200; i++) {
      const s = sampleHarmonySet(many.map((d) => d.id), 5, vectors, 4, rng)
      expect(new Set(s).size).toBe(5)
    }
  })
})

describe('서프라이즈 벡터', () => {
  it('확률 ε 로 등장하고, 항상 마지막 재료로 들어간다', () => {
    const rng = seededRng(2026)
    const cfg: MixingConfig = { ...DEFAULT_MIXING, surprise: 0.25 }
    let hits = 0
    const runs = 12000
    for (let i = 0; i < runs; i++) {
      const pick = chooseDrinksHarmony(IDS, 3, EMBEDDINGS, cfg, rng)
      expect(new Set(pick.ids).size).toBe(3)
      if (pick.surpriseIndex !== null) {
        hits++
        expect(pick.surpriseIndex).toBe(2)
      }
    }
    expect(Math.abs(hits / runs - 0.25)).toBeLessThan(0.02)
  })

  it('서프라이즈 재료는 코어와 맛이 덜 비슷하다 (평균적으로)', () => {
    const rng = seededRng(5)
    const surpriseSims: number[] = []
    const normalSims: number[] = []
    for (let i = 0; i < 6000; i++) {
      const always = chooseDrinksHarmony(IDS, 3, EMBEDDINGS, { ...DEFAULT_MIXING, surprise: 1 }, rng)
      const never = chooseDrinksHarmony(IDS, 3, EMBEDDINGS, NO_SURPRISE, rng)
      const lastSim = (ids: string[]) => (sim(ids[2], ids[0]) + sim(ids[2], ids[1])) / 2
      surpriseSims.push(lastSim(always.ids))
      normalSims.push(lastSim(never.ids))
    }
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    expect(avg(surpriseSims)).toBeLessThan(avg(normalSims) - 0.4)
  })

  it('맛 정보가 없어도(영벡터) 서프라이즈가 동작한다', () => {
    const { vectors } = buildEmbeddings([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    const rng = seededRng(1)
    for (let i = 0; i < 100; i++) {
      const p = chooseDrinksHarmony(['a', 'b', 'c'], 3, vectors, { ...DEFAULT_MIXING, surprise: 1 }, rng)
      expect([...p.ids].sort()).toEqual(['a', 'b', 'c'])
    }
  })
})

describe('궁합 모드에서도 기존 규칙 유지', () => {
  it('10,000회: 개수 범위 · 중복 없음 · 제외 음료 없음 · 180mL', () => {
    const rng = seededRng(77)
    for (let i = 0; i < 10000; i++) {
      const min = randomInt(2, 5, rng)
      const max = randomInt(min, 5, rng)
      const enabled = shuffle(IDS, rng).slice(0, randomInt(max, IDS.length, rng))
      const r = generateRecipe({ enabledDrinkIds: enabled, minCount: min, maxCount: max }, rng, Date.now, {
        config: MIXING,
        embeddings: EMBEDDINGS,
      })
      expect(r.count).toBeGreaterThanOrEqual(min)
      expect(r.count).toBeLessThanOrEqual(max)
      const ids = r.items.map((x) => x.drinkId)
      expect(new Set(ids).size).toBe(ids.length)
      for (const id of ids) expect(enabled).toContain(id)
      expect(r.items.reduce((a, b) => a + b.ml, 0)).toBe(TOTAL_ML)
      expect(r.items.filter((x) => x.surprise).length).toBeLessThanOrEqual(1)
    }
  }, 60000)

  it('음료 개수 N 은 여전히 균등 (궁합은 N 이 정해진 뒤 음료 선택에만 영향)', () => {
    const rng = seededRng(4)
    const counts = [0, 0, 0]
    for (let i = 0; i < 9000; i++)
      counts[
        generateRecipe({ enabledDrinkIds: IDS, minCount: 2, maxCount: 4 }, rng, Date.now, {
          config: MIXING,
          embeddings: EMBEDDINGS,
        }).count - 2
      ]++
    for (const c of counts) expect(Math.abs(c - 3000)).toBeLessThan(250)
  }, 30000)
})

describe('drinks.yaml mixing 설정', () => {
  it('현재 설정: harmony 모드, 모든 음료에 flavor 있음', () => {
    expect(MIXING.mode).toBe('harmony')
    expect(DRINKS.every((d) => d.flavor && Object.keys(d.flavor).length > 0)).toBe(true)
  })
  it('없으면 기본값, 잘못되면 오류', () => {
    expect(parseMixing({ drinks: [] })).toEqual(DEFAULT_MIXING)
    expect(parseMixing({ mixing: { mode: 'random' } }).mode).toBe('random')
    expect(() => parseMixing({ mixing: { mode: 'yummy' } })).toThrow(DrinkConfigError)
    expect(() => parseMixing({ mixing: { surprise: 1.5 } })).toThrow(DrinkConfigError)
  })
})
