import { describe, expect, it } from 'vitest'
import { ALL_DRINK_IDS, DRINK_CONFIG_ERROR, DRINK_IMAGE_WARNINGS, DRINKS } from '../data/drinks'
import { DrinkConfigError, parseDrinks } from '../data/drinkSchema'
import { formatFraction, gcd, mlToFraction, sumFractions, TOTAL_ML } from '../logic/fractions'
import { MAX_SUPPORTED_COUNT, MIN_SUPPORTED_COUNT, RATIO_TEMPLATES, validateTemplate } from '../logic/ratioTemplates'
import { chooseRatio, generateRecipe, RecipeError, type Recipe } from '../logic/recipeGenerator'
import { randomInt, seededRng, shuffle } from '../logic/random'
import { validateSettings } from '../logic/settings'
import { buildSpinSequence, buildTimeline } from '../lib/animation'

const IDS = [...ALL_DRINK_IDS]

function assertValidRecipe(r: Recipe, opts: { enabled: string[]; min: number; max: number }) {
  expect(r.count).toBeGreaterThanOrEqual(opts.min)
  expect(r.count).toBeLessThanOrEqual(opts.max)
  expect(r.items).toHaveLength(r.count)
  const ids = r.items.map((i) => i.drinkId)
  expect(new Set(ids).size).toBe(ids.length) // 중복 없음
  for (const id of ids) expect(opts.enabled).toContain(id) // 제외 음료 없음
  for (const it of r.items) {
    expect(Number.isInteger(it.ml)).toBe(true)
    expect(it.ml).toBeGreaterThan(0)
    expect(it.ml % 5).toBe(0)
    // 분수 = ml/180 를 약분한 것
    expect(it.fraction.num * TOTAL_ML).toBe(it.ml * it.fraction.den)
    expect(gcd(it.fraction.num, it.fraction.den)).toBe(1)
  }
  expect(r.items.reduce((a, b) => a + b.ml, 0)).toBe(TOTAL_ML)
  expect(r.totalMl).toBe(TOTAL_ML)
  expect(sumFractions(r.items.map((i) => i.fraction))).toEqual({ num: 1, den: 1 })
}

describe('drinks.yaml', () => {
  it('정상적으로 읽히고 물은 빠지고 아이스티·데자와·말차를 포함한다', () => {
    expect(DRINK_CONFIG_ERROR).toBeNull()
    expect(DRINKS.length).toBe(12)
    expect(DRINKS.map((d) => d.name)).toEqual([
      '아메리카노', '오렌지 주스', '밀키스', '사이다', '콜라', '포카리스웨트', '우유', '포도 주스', '사과 주스', '아이스티', '데자와', '말차 원액',
    ])
  })

  it('잘못된 항목을 알려 준다', () => {
    expect(() => parseDrinks({ drinks: [{ id: 'A b', name: '', icon: 'pot', color: 'red' }] })).toThrow(DrinkConfigError)
    try {
      parseDrinks({ drinks: [{ id: 'x', name: '가', icon: 'can', color: '#112233' }, { id: 'x', name: '나', icon: 'can', color: '#112233' }] })
    } catch (e) {
      expect((e as DrinkConfigError).problems.join()).toContain('중복')
    }
  })

  it('image: 로 지정한 사진이 빌드에 연결된다 (포카리스웨트)', () => {
    const pocari = DRINKS.find((d) => d.id === 'pocari')!
    expect(pocari.image).toBe('pocari.png')
    expect(pocari.imageUrl).toBeTruthy()
    expect(DRINK_IMAGE_WARNINGS).toEqual([])
  })

  it('image 에 경로를 넣으면 거부', () => {
    expect(() => parseDrinks({ drinks: [{ id: 'a', name: '가', icon: 'can', color: '#112233', image: '../x.png' }, { id: 'b', name: '나', icon: 'can', color: '#112233' }] })).toThrow(DrinkConfigError)
  })

  it('hidden: true 음료는 빠진다', () => {
    const list = parseDrinks({
      drinks: [
        { id: 'a', name: '가', icon: 'can', color: '#112233' },
        { id: 'b', name: '나', icon: 'glass', color: '#112233' },
        { id: 'c', name: '다', icon: 'glass', color: '#112233', hidden: true },
      ],
    })
    expect(list.map((d) => d.id)).toEqual(['a', 'b'])
    expect(list[1].liquid).toBe('#112233')
    expect(list[1].garnish).toBe('none')
  })
})

describe('fractions', () => {
  it('mL → 약분된 분수', () => {
    expect(formatFraction(mlToFraction(90))).toBe('1/2')
    expect(formatFraction(mlToFraction(60))).toBe('1/3')
    expect(formatFraction(mlToFraction(120))).toBe('2/3')
    expect(formatFraction(mlToFraction(45))).toBe('1/4')
    expect(formatFraction(mlToFraction(135))).toBe('3/4')
    expect(formatFraction(mlToFraction(30))).toBe('1/6')
    expect(formatFraction(mlToFraction(150))).toBe('5/6')
    expect(formatFraction(mlToFraction(15))).toBe('1/12')
    expect(formatFraction(mlToFraction(180))).toBe('1')
  })
  it('잘못된 값은 거부', () => {
    expect(() => mlToFraction(0)).toThrow()
    expect(() => mlToFraction(-30)).toThrow()
    expect(() => mlToFraction(12.5)).toThrow()
    expect(() => mlToFraction(200)).toThrow()
  })
  it('정수 연산으로 분수 합을 구한다', () => {
    expect(sumFractions([{ num: 1, den: 2 }, { num: 1, den: 3 }, { num: 1, den: 6 }])).toEqual({ num: 1, den: 1 })
  })
})

describe('ratio templates', () => {
  it('2~5개 모두 템플릿이 있다', () => {
    for (let n = MIN_SUPPORTED_COUNT; n <= MAX_SUPPORTED_COUNT; n++) expect(RATIO_TEMPLATES[n]?.length).toBeGreaterThan(0)
  })
  it('모든 템플릿은 개수 일치 · 양수 · 합계 180mL · 분수 합 1', () => {
    for (const [n, list] of Object.entries(RATIO_TEMPLATES)) {
      for (const t of list) {
        expect(validateTemplate(Number(n), t)).toBeNull()
        expect(sumFractions(t.map((m) => mlToFraction(m)))).toEqual({ num: 1, den: 1 })
      }
    }
  })
  it('셔플 후에도 총량 유지', () => {
    const rng = seededRng(7)
    for (let i = 0; i < 2000; i++) {
      const n = 2 + (i % 4)
      const r = chooseRatio(n, rng)
      expect(r).toHaveLength(n)
      expect(r.reduce((a, b) => a + b, 0)).toBe(180)
    }
  })
})

describe('random helpers', () => {
  it('randomInt 는 범위를 지키고 고르게 나온다', () => {
    const rng = seededRng(42)
    const counts = [0, 0, 0]
    for (let i = 0; i < 30000; i++) counts[randomInt(2, 4, rng) - 2]++
    for (const c of counts) expect(Math.abs(c - 10000)).toBeLessThan(600)
  })
  it('shuffle 은 원소를 보존한다', () => {
    const s = shuffle(IDS, seededRng(1))
    expect([...s].sort()).toEqual([...IDS].sort())
  })
})

describe('settings validation', () => {
  it('정상 설정', () => {
    expect(validateSettings({ enabledCount: 11, minCount: 2, maxCount: 4 })).toEqual([])
  })
  it('최소 > 최대', () => {
    expect(validateSettings({ enabledCount: 11, minCount: 5, maxCount: 3 }).map((p) => p.field)).toContain('min')
  })
  it('활성 음료가 최대 개수보다 적으면 안내 문구', () => {
    const p = validateSettings({ enabledCount: 3, minCount: 2, maxCount: 4 })
    expect(p.map((x) => x.message)).toContain('최대 4개의 음료를 뽑으려면 재료를 4개 이상 선택해 주세요!')
  })
  it('음료 0개', () => {
    expect(validateSettings({ enabledCount: 0, minCount: 2, maxCount: 4 }).some((p) => p.field === 'drinks')).toBe(true)
  })
})

describe('generateRecipe', () => {
  it('최소 2, 최대 4 → 2~4개만 (그리고 셋 다 나온다)', () => {
    const rng = seededRng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 3000; i++) {
      const r = generateRecipe({ enabledDrinkIds: IDS, minCount: 2, maxCount: 4 }, rng)
      assertValidRecipe(r, { enabled: IDS, min: 2, max: 4 })
      seen.add(r.count)
    }
    expect([...seen].sort()).toEqual([2, 3, 4])
  })
  it('최소 3, 최대 3 → 항상 3개', () => {
    for (let i = 0; i < 500; i++) expect(generateRecipe({ enabledDrinkIds: IDS, minCount: 3, maxCount: 3 }).count).toBe(3)
  })
  it('최대 5 → 5개 레시피 가능', () => {
    for (let i = 0; i < 500; i++) {
      const r = generateRecipe({ enabledDrinkIds: IDS, minCount: 5, maxCount: 5 })
      assertValidRecipe(r, { enabled: IDS, min: 5, max: 5 })
    }
  })
  it('시나리오 1: 아메리카노·우유 제외 시 절대 등장하지 않음', () => {
    const enabled = IDS.filter((id) => id !== 'americano' && id !== 'milk')
    for (let i = 0; i < 3000; i++) {
      const r = generateRecipe({ enabledDrinkIds: enabled, minCount: 2, maxCount: 4 })
      assertValidRecipe(r, { enabled, min: 2, max: 4 })
    }
  })
  it('음료를 모두 끄면 추첨 차단', () => {
    expect(() => generateRecipe({ enabledDrinkIds: [], minCount: 2, maxCount: 4 })).toThrow(RecipeError)
  })
  it('활성 음료 < 최대 개수면 추첨 차단 (최대값을 몰래 바꾸지 않음)', () => {
    expect(() => generateRecipe({ enabledDrinkIds: IDS.slice(0, 3), minCount: 2, maxCount: 4 })).toThrow(RecipeError)
  })
  it('딱 맞는 개수만 켜도 동작 (5개 켜고 최대 5)', () => {
    const enabled = IDS.slice(0, 5)
    for (let i = 0; i < 200; i++) {
      const r = generateRecipe({ enabledDrinkIds: enabled, minCount: 5, maxCount: 5 })
      expect([...r.items.map((x) => x.drinkId)].sort()).toEqual([...enabled].sort())
    }
  })

  it('반복 테스트: 랜덤 설정으로 10,000회 생성해도 모든 조건 만족', () => {
    const rng = seededRng(20261106)
    for (let i = 0; i < 10000; i++) {
      const min = randomInt(2, 5, rng)
      const max = randomInt(min, 5, rng)
      const enabledCount = randomInt(max, IDS.length, rng)
      const enabled = shuffle(IDS, rng).slice(0, enabledCount)
      const r = generateRecipe({ enabledDrinkIds: enabled, minCount: min, maxCount: max }, rng)
      assertValidRecipe(r, { enabled, min, max })
    }
  }, 60000)

  it('음료 선택이 대체로 균등하다', () => {
    const rng = seededRng(99)
    const hits = new Map<string, number>()
    const runs = 20000
    for (let i = 0; i < runs; i++) {
      const r = generateRecipe({ enabledDrinkIds: IDS, minCount: 3, maxCount: 3 }, rng)
      for (const it of r.items) hits.set(it.drinkId, (hits.get(it.drinkId) ?? 0) + 1)
    }
    const expected = (runs * 3) / IDS.length
    for (const id of IDS) expect(Math.abs((hits.get(id) ?? 0) - expected) / expected).toBeLessThan(0.06)
  })
})

describe('animation timeline', () => {
  it('스핀 시퀀스: 마지막은 최종 음료, 연속 중복 없음', () => {
    const rng = seededRng(5)
    for (let i = 0; i < 500; i++) {
      const target = IDS[i % IDS.length]
      const seq = buildSpinSequence(IDS, target, 13, rng)
      expect(seq).toHaveLength(13)
      expect(seq[12]).toBe(target)
      for (let k = 1; k < seq.length; k++) expect(seq[k]).not.toBe(seq[k - 1])
    }
  })

  it('타임라인은 레시피를 바꾸지 않고 순서대로 공개한다', () => {
    const r = generateRecipe({ enabledDrinkIds: IDS, minCount: 4, maxCount: 4 }, seededRng(11))
    const snapshot = JSON.stringify(r)
    const { events, duration } = buildTimeline(r, IDS, { rng: seededRng(1) })
    expect(JSON.stringify(r)).toBe(snapshot)
    const reveals = events.filter((e) => e.event.type === 'reveal').map((e) => (e.event as { index: number }).index)
    expect(reveals).toEqual([0, 1, 2, 3])
    // 각 음료의 마지막 틱 = 그 음료
    for (let i = 0; i < 4; i++) {
      const ticks = events.filter((e) => e.event.type === 'tick' && e.event.index === i)
      const last = ticks[ticks.length - 1].event as { drinkId: string }
      expect(last.drinkId).toBe(r.items[i].drinkId)
    }
    // 시간 순서 정렬 & 마지막은 settle
    for (let k = 1; k < events.length; k++) expect(events[k].at).toBeGreaterThanOrEqual(events[k - 1].at)
    expect(events[events.length - 1].event.type).toBe('settle')
    expect(events[events.length - 1].at).toBe(duration)
  })

  it('음료 하나당 연출은 약 1.8~2.0초', () => {
    const r = generateRecipe({ enabledDrinkIds: IDS, minCount: 2, maxCount: 2 }, seededRng(2))
    const { events } = buildTimeline(r, IDS)
    const s0 = events.find((e) => e.event.type === 'spinStart' && e.event.index === 0)!.at
    const s1 = events.find((e) => e.event.type === 'spinStart' && e.event.index === 1)!.at
    expect(s1 - s0).toBeGreaterThanOrEqual(1800)
    expect(s1 - s0).toBeLessThanOrEqual(2000)
  })
})
