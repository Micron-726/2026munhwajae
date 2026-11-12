import { describe, expect, it } from 'vitest'
import { ALL_DRINK_IDS, EMBEDDINGS, FORBIDDEN_PAIRS, MAX_ML_BY_ID, MIXING, validateKitchenSettings } from '../data/drinks'
import { DrinkConfigError, parseForbiddenPairs } from '../data/drinkSchema'
import { findForbidden, maxCompatibleCount } from '../logic/compat'
import { DEFAULT_MIXING, harmonySetDistribution } from '../logic/harmony'
import { randomInt, seededRng, shuffle } from '../logic/random'
import { generateRecipe, RecipeError } from '../logic/recipeGenerator'

const IDS = [...ALL_DRINK_IDS]
const has = (ids: string[], a: string, b: string) => ids.includes(a) && ids.includes(b)

describe('drinks.yaml forbiddenPairs', () => {
  it('콜라 + 우유 가 등록되어 있다', () => {
    expect(FORBIDDEN_PAIRS).toEqual([['cola', 'milk']])
  })

  it('형식 검사: 모르는 id, 같은 음료 두 번, 잘못된 모양은 오류', () => {
    const drinks = [{ id: 'cola' }, { id: 'milk' }]
    expect(() => parseForbiddenPairs({ drinks, forbiddenPairs: [['cola', 'beer']] })).toThrow(DrinkConfigError)
    expect(() => parseForbiddenPairs({ drinks, forbiddenPairs: [['cola', 'cola']] })).toThrow(DrinkConfigError)
    expect(() => parseForbiddenPairs({ drinks, forbiddenPairs: [['cola']] })).toThrow(DrinkConfigError)
    expect(parseForbiddenPairs({ drinks })).toEqual([])
  })
})

describe('최대로 넣을 수 있는 음료 수', () => {
  it('콜라·우유가 둘 다 켜져 있으면 하나는 빠져야 한다', () => {
    expect(maxCompatibleCount(['cola', 'milk', 'cider', 'dejawa'], FORBIDDEN_PAIRS)).toBe(3)
    expect(maxCompatibleCount(['cola', 'cider', 'dejawa'], FORBIDDEN_PAIRS)).toBe(3)
    expect(maxCompatibleCount(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd']])).toBe(2)
  })

  it('설정 화면 검사: 4개만 켜고 최대 4개면 안내', () => {
    const p = validateKitchenSettings(['cola', 'milk', 'cider', 'dejawa'], 3, 4)
    expect(p.map((x) => x.message).join()).toContain('콜라 + 우유는 같이 나올 수 없어서')
    expect(validateKitchenSettings(['cola', 'milk', 'cider', 'dejawa'], 3, 3)).toEqual([])
    expect(validateKitchenSettings(IDS, 3, 4)).toEqual([])
  })
})

describe('추첨에서 콜라 + 우유 는 절대 같이 나오지 않는다', () => {
  for (const mode of ['harmony', 'random'] as const) {
    it(`${mode} 모드 10,000회`, () => {
      const rng = seededRng(mode === 'harmony' ? 11 : 12)
      let cola = 0
      let milk = 0
      for (let i = 0; i < 10000; i++) {
        const min = randomInt(2, 5, rng)
        const max = randomInt(min, 5, rng)
        let enabled = shuffle(IDS, rng).slice(0, randomInt(max, IDS.length, rng))
        // 둘 다 켜진 경우를 충분히 시험
        if (i % 2 === 0) enabled = Array.from(new Set([...enabled, 'cola', 'milk']))
        if (maxCompatibleCount(enabled, FORBIDDEN_PAIRS) < max) continue
        const r = generateRecipe(
          { enabledDrinkIds: enabled, minCount: min, maxCount: max, maxMl: MAX_ML_BY_ID, forbiddenPairs: FORBIDDEN_PAIRS },
          rng,
          Date.now,
          { config: { ...MIXING, mode }, embeddings: EMBEDDINGS },
        )
        const ids = r.items.map((x) => x.drinkId)
        expect(has(ids, 'cola', 'milk')).toBe(false)
        expect(r.items.reduce((a, b) => a + b.ml, 0)).toBe(180)
        if (ids.includes('cola')) cola++
        if (ids.includes('milk')) milk++
      }
      // 각자는 여전히 잘 나온다
      expect(cola).toBeGreaterThan(300)
      expect(milk).toBeGreaterThan(300)
    })
  }

  it('궁합 모드 확률은 금지 조합만 뺀 나머지로 정확히 다시 맞춰진다', () => {
    const exact = harmonySetDistribution(IDS, 2, EMBEDDINGS, DEFAULT_MIXING.harmony).filter(
      (d) => !findForbidden(d.set, FORBIDDEN_PAIRS),
    )
    const z = exact.reduce((s, d) => s + d.p, 0)
    const rng = seededRng(5)
    const runs = 30000
    const counts = new Map<string, number>()
    for (let i = 0; i < runs; i++) {
      const r = generateRecipe(
        { enabledDrinkIds: IDS, minCount: 2, maxCount: 2, forbiddenPairs: FORBIDDEN_PAIRS },
        rng,
        Date.now,
        { config: { ...DEFAULT_MIXING, surprise: 0 }, embeddings: EMBEDDINGS },
      )
      const key = r.items.map((x) => x.drinkId).sort().join('+')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(counts.has('cola+milk')).toBe(false)
    for (const { set, p } of exact) {
      const freq = (counts.get([...set].sort().join('+')) ?? 0) / runs
      expect(Math.abs(freq - p / z)).toBeLessThan(0.007)
    }
  })

  it('조건을 지킬 수 없으면 추첨을 막고 이유를 알려 준다', () => {
    expect(() =>
      generateRecipe({ enabledDrinkIds: ['cola', 'milk', 'cider', 'dejawa'], minCount: 4, maxCount: 4, forbiddenPairs: FORBIDDEN_PAIRS }),
    ).toThrow(RecipeError)
  })
})
