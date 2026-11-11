import { describe, expect, it } from 'vitest'
import { ALL_DRINK_IDS, DRINK_BY_ID, EMBEDDINGS, MAX_ML_BY_ID, MIXING } from '../data/drinks'
import { DrinkConfigError, parseDrinks } from '../data/drinkSchema'
import { TOTAL_ML } from '../logic/fractions'
import { randomInt, seededRng, shuffle } from '../logic/random'
import { chooseRatioWithCaps, generateRecipe } from '../logic/recipeGenerator'

const IDS = [...ALL_DRINK_IDS]

describe('물은 메뉴에서 빠짐', () => {
  it('water 는 hidden 이라 목록에 없다', () => {
    expect(DRINK_BY_ID.has('water')).toBe(false)
    expect(IDS).not.toContain('water')
  })
})

describe('말차 원액 최대 30mL', () => {
  it('drinks.yaml 에서 maxMl 30 으로 읽힌다', () => {
    expect(MAX_ML_BY_ID).toEqual({ matcha: 30 })
  })

  it('maxMl 형식 검사', () => {
    const base = { id: 'a', name: '가', icon: 'can', color: '#112233' }
    const ok = { id: 'b', name: '나', icon: 'can', color: '#112233' }
    expect(() => parseDrinks({ drinks: [{ ...base, maxMl: 0 }, ok] })).toThrow(DrinkConfigError)
    expect(() => parseDrinks({ drinks: [{ ...base, maxMl: 12.5 }, ok] })).toThrow(DrinkConfigError)
    expect(parseDrinks({ drinks: [{ ...base, maxMl: 45 }, ok] })[0].maxMl).toBe(45)
  })

  it('2가지 섞을 때: 말차는 항상 30mL, 나머지는 150mL', () => {
    const rng = seededRng(1)
    for (let i = 0; i < 500; i++) {
      const order = rng() < 0.5 ? ['matcha', 'cola'] : ['cola', 'matcha']
      const mls = chooseRatioWithCaps(order, MAX_ML_BY_ID, rng)!
      expect(mls[order.indexOf('matcha')]).toBe(30)
      expect(mls[order.indexOf('cola')]).toBe(150)
    }
  })

  it('3가지 섞을 때: 말차는 15mL 또는 30mL 만, 다른 음료는 제한 없음', () => {
    const rng = seededRng(2)
    const seen = new Set<number>()
    const others = new Set<number>()
    for (let i = 0; i < 3000; i++) {
      const ids = shuffle(['matcha', 'milk', 'dejawa'], rng)
      const mls = chooseRatioWithCaps(ids, MAX_ML_BY_ID, rng)!
      seen.add(mls[ids.indexOf('matcha')])
      ids.forEach((id, k) => id !== 'matcha' && others.add(mls[k]))
      expect(mls.reduce((a, b) => a + b, 0)).toBe(TOTAL_ML)
    }
    expect([...seen].every((v) => v <= 30)).toBe(true)
    expect(Math.max(...others)).toBeGreaterThan(30) // 다른 음료는 큰 비율도 받는다
  })

  it('제한을 지킬 수 없는 조합이면 null (예: 30mL 제한 음료 2개를 2가지로)', () => {
    expect(chooseRatioWithCaps(['a', 'b'], { a: 30, b: 30 }, seededRng(3))).toBeNull()
  })

  it('제한 음료가 없으면 기존 방식과 같은 분포 (모든 템플릿 사용)', () => {
    const rng = seededRng(4)
    const firsts = new Set<number>()
    for (let i = 0; i < 2000; i++) firsts.add(chooseRatioWithCaps(['cola', 'milk'], MAX_ML_BY_ID, rng)![0])
    expect([...firsts].sort((a, b) => a - b)).toEqual([30, 45, 60, 90, 120, 135, 150])
  })

  it('실제 뽑기 10,000회: 말차는 절대 30mL 를 넘지 않고, 다른 규칙도 그대로', () => {
    const rng = seededRng(2026)
    let matchaCount = 0
    for (let i = 0; i < 10000; i++) {
      const min = randomInt(2, 5, rng)
      const max = randomInt(min, 5, rng)
      const enabled = shuffle(IDS, rng).slice(0, randomInt(max, IDS.length, rng))
      const r = generateRecipe({ enabledDrinkIds: enabled, minCount: min, maxCount: max, maxMl: MAX_ML_BY_ID }, rng, Date.now, {
        config: MIXING,
        embeddings: EMBEDDINGS,
      })
      const m = r.items.find((x) => x.drinkId === 'matcha')
      if (m) {
        matchaCount++
        expect(m.ml).toBeLessThanOrEqual(30)
      }
      expect(r.count).toBeGreaterThanOrEqual(min)
      expect(r.count).toBeLessThanOrEqual(max)
      expect(new Set(r.items.map((x) => x.drinkId)).size).toBe(r.count)
      for (const it of r.items) expect(enabled).toContain(it.drinkId)
      expect(r.items.reduce((a, b) => a + b.ml, 0)).toBe(TOTAL_ML)
    }
    expect(matchaCount).toBeGreaterThan(500) // 말차도 충분히 등장한다
  })
})
