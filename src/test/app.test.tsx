import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { generateRecipe } from '../logic/recipeGenerator'

vi.mock('../logic/recipeGenerator', async (orig) => {
  const m = await orig<typeof import('../logic/recipeGenerator')>()
  return { ...m, generateRecipe: vi.fn(m.generateRecipe) }
})

const LONGEST_SHOW_MS = 20000 // 5개 레시피 전체 연출보다 충분히 긴 시간

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const drawButton = () => screen.getByRole('button', { name: /레시피 뽑기|추첨 중/ })
const settingsButton = () => screen.getByRole('button', { name: /재료 설정/ })
const summary = () => screen.getByLabelText('현재 설정 요약').textContent ?? ''
const phase = (c: HTMLElement) => c.querySelector('[data-phase]')?.getAttribute('data-phase')

function cardNames() {
  return screen.queryAllByTestId('ingredient-card').map((el) => el.querySelector('h3')?.textContent)
}
function cardMls() {
  return screen.queryAllByTestId('ml').map((el) => Number(el.textContent?.replace('mL', '')))
}

function openSettings() {
  fireEvent.click(settingsButton())
  const all = screen.getAllByRole('dialog')
  return all[all.length - 1] // 닫히는 중인 이전 모달은 무시
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(generateRecipe).mockClear()
  localStorage.clear()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('설정 모달', () => {
  it('열고 닫을 수 있다 (X 버튼 / Esc)', async () => {
    render(<App />)
    openSettings()
    fireEvent.click(screen.getByRole('button', { name: /설정 닫기/ }))
    await advance(500)
    expect(screen.queryByRole('dialog')).toBeNull()

    openSettings()
    fireEvent.keyDown(window, { key: 'Escape' })
    await advance(500)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('카드를 눌러 체크를 바꾸고 선택 개수가 갱신된다', async () => {
    render(<App />)
    const dialog = openSettings()
    const americano = within(dialog).getByRole('checkbox', { name: '아메리카노' })
    expect(americano).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(americano)
    expect(americano).toHaveAttribute('aria-checked', 'false')
    expect(within(dialog).getByTestId('enabled-count')).toHaveTextContent('현재 10개의 음료가 선택되었습니다.')
  })

  it('음료가 최대 개수보다 적으면 안내하고 시작 버튼을 막는다 (최대값을 몰래 바꾸지 않음)', async () => {
    render(<App />)
    const dialog = openSettings()
    fireEvent.click(within(dialog).getByRole('button', { name: '모두 해제' }))
    for (const name of ['물', '콜라', '우유']) fireEvent.click(within(dialog).getByRole('checkbox', { name }))
    expect(within(dialog).getByText(/최대 4개의 음료를 뽑으려면 재료를 4개 이상 선택해 주세요!/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '이 설정으로 시작하기' })).toBeDisabled()
    expect(within(dialog).getByTestId('max-value')).toHaveTextContent('4')
  })

  it('최소 > 최대이면 오류 표시 및 해당 입력 강조', async () => {
    render(<App />)
    const dialog = openSettings()
    const inc = within(dialog).getByRole('button', { name: '최소 음료 개수 늘리기' })
    fireEvent.click(inc)
    fireEvent.click(inc)
    fireEvent.click(inc) // 최소 5, 최대 4
    expect(within(dialog).getByText(/최소 개수가 최대 개수보다 많아요/)).toBeInTheDocument()
    expect(within(dialog).getByTestId('stepper-min')).toHaveAttribute('data-invalid', 'true')
    expect(within(dialog).getByRole('button', { name: '이 설정으로 시작하기' })).toBeDisabled()
  })

  it('X 로 닫으면 변경 사항은 적용되지 않는다', async () => {
    render(<App />)
    const dialog = openSettings()
    fireEvent.click(within(dialog).getByRole('checkbox', { name: '콜라' }))
    fireEvent.click(within(dialog).getByRole('button', { name: /설정 닫기/ }))
    expect(summary()).toContain('11/11')
  })
})

describe('추첨 흐름', () => {
  it('시나리오 1·2·3: 제외 → 뽑기 → 다시 뽑기 → 새 손님', async () => {
    const { container } = render(<App />)

    // 시나리오 1 — 아메리카노와 우유 제외, 2~4개
    const dialog = openSettings()
    fireEvent.click(within(dialog).getByRole('checkbox', { name: '아메리카노' }))
    fireEvent.click(within(dialog).getByRole('checkbox', { name: '우유' }))
    fireEvent.click(within(dialog).getByRole('button', { name: '이 설정으로 시작하기' }))
    await advance(500)
    expect(summary()).toContain('9/11')

    fireEvent.click(drawButton())
    expect(phase(container)).toBe('spinningIngredients')
    expect(drawButton()).toBeDisabled()
    expect(settingsButton()).toBeDisabled()

    const recipe = vi.mocked(generateRecipe).mock.results[0].value
    const n = recipe.items.length
    expect(n).toBeGreaterThanOrEqual(2)
    expect(n).toBeLessThanOrEqual(4)

    // 재료가 하나씩 누적된다 (앞에서 뽑힌 카드가 사라지지 않음)
    await advance(2100)
    expect(screen.getAllByTestId('ingredient-card')).toHaveLength(1)
    await advance(1950)
    expect(screen.getAllByTestId('ingredient-card')).toHaveLength(2)

    await advance(LONGEST_SHOW_MS)
    expect(phase(container)).toBe('completed')
    expect(screen.getByRole('heading', { name: '짜잔! 오늘의 수상한 레시피 완성!' })).toBeInTheDocument()
    const names = cardNames()
    expect(names).toHaveLength(n)
    expect(names).not.toContain('아메리카노')
    expect(names).not.toContain('우유')
    expect(cardMls().reduce((a, b) => a + b, 0)).toBe(180)
    expect(screen.getByTestId('total-ml')).toHaveTextContent('180')
    // 막대 그래프 = 정확한 mL
    const bars = screen.getByTestId('ratio-bar').querySelectorAll('[data-ml]')
    expect([...bars].map((b) => Number(b.getAttribute('data-ml')))).toEqual(recipe.items.map((i: { ml: number }) => i.ml))

    // 시나리오 2 — 같은 설정으로 다시 뽑기
    fireEvent.click(screen.getByRole('button', { name: /같은 설정으로 다시 뽑기/ }))
    expect(phase(container)).toBe('spinningIngredients')
    expect(vi.mocked(generateRecipe)).toHaveBeenCalledTimes(2)
    const second = vi.mocked(generateRecipe).mock.calls[1][0]
    expect(second.enabledDrinkIds).not.toContain('americano')
    expect(second.enabledDrinkIds).not.toContain('milk')
    expect(second.minCount).toBe(2)
    expect(second.maxCount).toBe(4)
    await advance(LONGEST_SHOW_MS)
    expect(phase(container)).toBe('completed')
    expect(summary()).toContain('9/11')

    // 시나리오 3 — 새 손님 시작
    fireEvent.click(screen.getByRole('button', { name: /새 손님 시작/ }))
    expect(phase(container)).toBe('idle')
    expect(summary()).toContain('11/11')
    expect(summary()).toContain('2~4가지')
    await advance(300)
    expect(screen.getByText('새 손님 어서 오세요!')).toBeInTheDocument()
    const d2 = openSettings()
    for (const cb of within(d2).getAllByRole('checkbox')) expect(cb).toHaveAttribute('aria-checked', 'true')
  })

  it('추첨 중 연속 클릭해도 레시피는 한 번만 만들어진다', async () => {
    render(<App />)
    const btn = drawButton()
    fireEvent.click(btn)
    fireEvent.click(btn)
    fireEvent.click(btn)
    fireEvent.keyDown(btn, { key: 'Enter' })
    expect(vi.mocked(generateRecipe)).toHaveBeenCalledTimes(1)
  })

  it('건너뛰기: 이미 정해진 결과를 그대로 즉시 보여준다', async () => {
    const { container } = render(<App />)
    fireEvent.click(drawButton())
    const recipe = vi.mocked(generateRecipe).mock.results[0].value
    await advance(700)
    fireEvent.click(screen.getByRole('button', { name: /건너뛰기/ }))
    expect(phase(container)).toBe('completed')
    expect(vi.mocked(generateRecipe)).toHaveBeenCalledTimes(1)
    expect(cardMls()).toEqual(recipe.items.map((i: { ml: number }) => i.ml))
    await advance(LONGEST_SHOW_MS)
    expect(phase(container)).toBe('completed')
    expect(cardMls()).toEqual(recipe.items.map((i: { ml: number }) => i.ml))
  })

  it('완성 후 음료 이름이 공개되고, 말풍선에도 나온다', async () => {
    render(<App />)
    fireEvent.click(drawButton())
    await advance(700)
    fireEvent.click(screen.getByRole('button', { name: /건너뛰기/ }))
    expect(screen.getByTestId('name-plate')).toHaveAttribute('data-revealed', 'false')
    expect(screen.getByTestId('name-plate')).toHaveTextContent('이 음료의 이름은')
    await advance(1000)
    expect(screen.getByTestId('name-plate')).toHaveAttribute('data-revealed', 'true')
    const name = screen.getByTestId('drink-name').textContent!
    expect(name.length).toBeGreaterThan(1)
    expect(document.querySelector('[aria-live=polite]')?.textContent).toContain(`「${name}」`)
  })

  it('최종 화면에서는 예약된 타이머가 남지 않는다', async () => {
    render(<App />)
    fireEvent.click(drawButton())
    await advance(LONGEST_SHOW_MS)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('비율 공개 단계로 넘어간다', async () => {
    const { container } = render(<App />)
    fireEvent.click(drawButton())
    const n = vi.mocked(generateRecipe).mock.results[0].value.items.length
    // 마지막 재료 수집 직후
    await advance(1950 * n + 50)
    expect(phase(container)).toBe('revealingRatios')
    await advance(300)
    expect(screen.getByText('재료 준비 완료!')).toBeInTheDocument()
  })
})

describe('효과음 토글', () => {
  it('ON/OFF 가 바뀌고 저장된다', async () => {
    render(<App />)
    const btn = screen.getByRole('button', { name: /효과음 끄기/ })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(btn)
    expect(screen.getByRole('button', { name: /효과음 켜기/ })).toHaveAttribute('aria-pressed', 'false')
    expect(localStorage.getItem('mystery-kitchen:sound')).toBe('off')
    fireEvent.click(screen.getByRole('button', { name: /효과음 켜기/ }))
    expect(localStorage.getItem('mystery-kitchen:sound')).toBe('on')
  })
})
