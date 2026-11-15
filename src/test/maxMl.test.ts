import { describe, expect, it } from 'vitest'
import { ALL_DRINK_IDS, DRINK_BY_ID, EMBEDDINGS, MAX_ML_BY_ID, MIXING } from '../data/drinks'
import { DrinkConfigError, parseDrinks } from '../data/drinkSchema'
import { TOTAL_ML } from '../logic/fractions'
import { randomInt, seededRng, shuffle } from '../logic/random'
import { chooseRatioWithCaps, generateRecipe } from '../logic/recipeGenerator'

const IDS = [...ALL_DRINK_IDS]

describe('물·말차는 메뉴에서 삭제됨', () => {
  it('목록에 없다', () => {
    for (const id of ['water', 'matcha']) expect(DRINK_BY_ID.has(id)).toBe(false)
  })
})

// 지금 drinks.yaml 에는 maxMl 음료가 없으므로, 기능 검증용으로 데자와에 30mL 제한을 걸어서 시험한다
const CAPS = { dejawa: 30 }

describe('음료별 최대 mL (maxMl)', () => {
  it('지금 drinks.yaml 에는 제한 음료가 없다', () => {
    expect(MAX_ML_BY_ID).toEqual({})
  })

  it('maxMl 형식 검사', () => {
    const base = { id: 'a', name: '가', icon: 'can', color: '#112233' }
    const ok = { id: 'b', name: '나', icon: 'can', color: '#112233' }
    expect(() => parseDrinks({ drinks: [{ ...base, maxMl: 0 }, ok] })).toThrow(DrinkConfigError)
    expect(() => parseDrinks({ drinks: [{ ...base, maxMl: 12.5 }, ok] })).toThrow(DrinkConfigError)
    expect(parseDrinks({ drinks: [{ ...base, maxMl: 45 }, ok] })[0].maxMl).toBe(45)
  })

  it('2가지 섞을 때: 데자와(시험용 30mL 제한)는 항상 30mL, 나머지는 150mL', () => {
    const rng = seededRng(1)
    for (let i = 0; i < 500; i++) {
      const order = rng() < 0.5 ? ['dejawa', 'cola'] : ['cola', 'dejawa']
      const mls = chooseRatioWithCaps(order, CAPS, rng)!
      expect(mls[order.indexOf('dejawa')]).toBe(30)
      expect(mls[order.indexOf('cola')]).toBe(150)
    }
  })

  it('3가지 섞을 때: 데자와(시험용 30mL 제한)는 15mL 또는 30mL 만, 다른 음료는 제한 없음', () => {
    const rng = seededRng(2)
    const seen = new Set<number>()
    const others = new Set<number>()
    for (let i = 0; i < 3000; i++) {
      const ids = shuffle(['dejawa', 'milk', 'cider'], rng)
      const mls = chooseRatioWithCaps(ids, CAPS, rng)!
      seen.add(mls[ids.indexOf('dejawa')])
      ids.forEach((id, k) => id !== 'dejawa' && others.add(mls[k]))
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
    for (let i = 0; i < 2000; i++) firsts.add(chooseRatioWithCaps(['cola', 'milk'], CAPS, rng)![0])
    expect([...firsts].sort((a, b) => a - b)).toEqual([30, 45, 60, 90, 120, 135, 150])
  })

  it('실제 뽑기 10,000회: 데자와(시험용 30mL 제한)는 절대 30mL 를 넘지 않고, 다른 규칙도 그대로', () => {
    const rng = seededRng(2026)
    let cappedCount = 0
    for (let i = 0; i < 10000; i++) {
      const min = randomInt(2, 5, rng)
      const max = randomInt(min, 5, rng)
      const enabled = shuffle(IDS, rng).slice(0, randomInt(max, IDS.length, rng))
      const r = generateRecipe({ enabledDrinkIds: enabled, minCount: min, maxCount: max, maxMl: CAPS }, rng, Date.now, {
        config: MIXING,
        embeddings: EMBEDDINGS,
      })
      const m = r.items.find((x) => x.drinkId === 'dejawa')
      if (m) {
        cappedCount++
        expect(m.ml).toBeLessThanOrEqual(30)
      }
      expect(r.count).toBeGreaterThanOrEqual(min)
      expect(r.count).toBeLessThanOrEqual(max)
      expect(new Set(r.items.map((x) => x.drinkId)).size).toBe(r.count)
      for (const it of r.items) expect(enabled).toContain(it.drinkId)
      expect(r.items.reduce((a, b) => a + b.ml, 0)).toBe(TOTAL_ML)
    }
    expect(cappedCount).toBeGreaterThan(500) // 데자와(시험용 30mL 제한)도 충분히 등장한다
  })
})
