import { describe, expect, it } from 'vitest'
import { ALL_DRINK_IDS, DRINK_BY_ID, EMBEDDINGS, MIXING } from '../data/drinks'
import { NAME_BOOK, NAME_BOOK_ERROR } from '../data/names'
import { applyJosa, nameDrink, NameBookError, nicknameOf, parseNameBook } from '../logic/drinkName'
import { mlToFraction } from '../logic/fractions'
import { generateRecipe, type Recipe } from '../logic/recipeGenerator'
import { seededRng } from '../logic/random'

const IDS = [...ALL_DRINK_IDS]
const ctx = () => ({ drinks: DRINK_BY_ID, embeddings: EMBEDDINGS, book: NAME_BOOK! })

function recipe(id: string, parts: [string, number, boolean?][]): Recipe {
  return {
    id,
    createdAt: 0,
    count: parts.length,
    totalMl: 180,
    mode: 'harmony',
    items: parts.map(([drinkId, ml, surprise]) => ({ drinkId, ml, fraction: mlToFraction(ml), surprise: !!surprise })),
  }
}

describe('조사 자동 맞춤', () => {
  it('받침 유무에 맞게 바뀐다', () => {
    expect(applyJosa('콜라{이/가}')).toBe('콜라가')
    expect(applyJosa('물{이/가}')).toBe('물이')
    expect(applyJosa('우유{을/를}')).toBe('우유를')
    expect(applyJosa('사이다{와/과} 콜라')).toBe('사이다와 콜라')
    expect(applyJosa('포카리{은/는}')).toBe('포카리는')
    expect(applyJosa('밀키스{와/과}')).toBe('밀키스와')
    expect(applyJosa('아아{와/과}')).toBe('아아와')
    expect(applyJosa('우유{와/과}')).toBe('우유와')
    expect(applyJosa('물{으로/로}')).toBe('물로') // ㄹ 받침
    expect(applyJosa('밥{으로/로}')).toBe('밥으로')
  })
})

describe('names.yaml', () => {
  it('정상적으로 읽힌다', () => {
    expect(NAME_BOOK_ERROR).toBeNull()
    expect(NAME_BOOK!.templates.normal.length).toBeGreaterThan(0)
    expect(NAME_BOOK!.templates.surprise.length).toBeGreaterThan(0)
  })
  it('모르는 빈칸이나 잘못된 위치의 {surprise} 는 오류', () => {
    const base = { ...NAME_BOOK! }
    expect(() => parseNameBook({ ...base, templates: { normal: ['{yummy} 포션'], surprise: ['x'] } })).toThrow(NameBookError)
    expect(() => parseNameBook({ ...base, templates: { normal: ['{surprise} 포션'], surprise: ['x'] } })).toThrow(NameBookError)
    expect(() => parseNameBook({ ...base, adjectives: { sweet: ['달콤한'] } })).toThrow(NameBookError) // default 없음
  })
})

describe('이름 짓기', () => {
  it('별명: nickname 우선, 없으면 " 주스" 를 뗀다', () => {
    expect(nicknameOf(DRINK_BY_ID.get('pocari'))).toBe('포카리')
    expect(nicknameOf(DRINK_BY_ID.get('americano'))).toBe('아아')
    expect(nicknameOf(DRINK_BY_ID.get('orange-juice'))).toBe('오렌지')
    expect(nicknameOf(DRINK_BY_ID.get('cola'))).toBe('콜라')
  })

  it('같은 레시피에는 항상 같은 이름', () => {
    const r = recipe('r-fixed-1', [['cola', 90], ['cider', 60], ['milk', 30]])
    expect(nameDrink(r, ctx())).toEqual(nameDrink(r, ctx()))
  })

  it('맛 특징을 읽는다: 탄산 위주 → fizzy, 과일주스끼리 → harmony', () => {
    const fizzy = nameDrink(recipe('r-a', [['cola', 120], ['cider', 60]]), ctx())
    expect(fizzy.traits.topFlavor).toBe('fizzy')
    expect(fizzy.traits.vibe).toBe('harmony')
    const juice = nameDrink(recipe('r-b', [['orange-juice', 90], ['apple-juice', 45], ['grape-juice', 45]]), ctx())
    expect(juice.traits.topFlavor).toBe('fruity')
    expect(juice.traits.vibe).toBe('harmony')
    const chaos = nameDrink(recipe('r-c', [['americano', 90], ['grape-juice', 90]]), ctx())
    expect(chaos.traits.vibe).toBe('chaos')
  })

  it('서프라이즈 레시피는 서프라이즈 템플릿/한마디를 쓴다', () => {
    let mentioned = 0
    for (let i = 0; i < 200; i++) {
      const n = nameDrink(recipe(`r-s-${i}`, [['milk', 120], ['orange-juice', 60, true]]), ctx())
      expect(n.traits.surprise).toBe(true)
      expect(n.tagline).toContain('⚡')
      if (n.name.includes('오렌지') || n.tagline.includes('오렌지')) mentioned++
    }
    expect(mentioned).toBe(200) // 한마디에 항상 서프라이즈 재료가 언급됨
  })

  it('랜덤 레시피 5,000개: 빈칸이 남지 않고, 비어 있지 않고, 너무 길지 않다', () => {
    const rng = seededRng(42)
    const names = new Set<string>()
    for (let i = 0; i < 5000; i++) {
      const r = generateRecipe({ enabledDrinkIds: IDS, minCount: 2, maxCount: 5 }, rng, () => i, {
        config: MIXING,
        embeddings: EMBEDDINGS,
      })
      const n = nameDrink(r, ctx())
      for (const text of [n.name, n.tagline]) {
        expect(text).not.toMatch(/[{}]/)
        expect(text.trim().length).toBeGreaterThan(0)
        expect(text).not.toContain('undefined')
      }
      expect(n.name.length).toBeLessThanOrEqual(22)
      names.add(n.name)
    }
    expect(names.size).toBeGreaterThan(500) // 다양한 이름이 나온다
  })
})
