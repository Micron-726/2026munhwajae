import type { Recipe } from '../logic/recipeGenerator'
import { defaultRng, pickOne, type Rng } from '../logic/random'

/**
 * 추첨 연출 타임라인.
 * 레시피는 이미 확정된 상태이며, 여기서는 "언제 무엇을 보여줄지"만 계산한다.
 */
export type TimelineEvent =
  | { type: 'spinStart'; index: number }
  | { type: 'tick'; index: number; drinkId: string; slow: boolean; step: number }
  | { type: 'reveal'; index: number }
  | { type: 'collect'; index: number }
  | { type: 'ratioPhase' }
  | { type: 'ratioStart'; index: number }
  | { type: 'ratioReveal'; index: number }
  | { type: 'complete' }
  | { type: 'settle' }

export interface TimedEvent {
  at: number
  event: TimelineEvent
}

/** 음료 1개당 연출 시간(ms) — 명세 6.2 기준, 합계 약 1.9초 */
export const TIMING = {
  start: 150, // Phase A
  fast: 600, // Phase B
  fastInterval: 65,
  slowSteps: [0, 110, 250, 430], // Phase C — 간격 110 → 140 → 180 (마지막 틱 = 최종 음료)
  revealAfterLastTick: 170,
  reveal: 350, // Phase D
  collect: 250, // Phase E
  ratioIntro: 750, // "재료 준비 완료!" 대사를 읽을 시간 (전환 300ms 포함)
  ratioScramble: 460,
  ratioGap: 180,
  completeDelay: 350,
  celebration: 1000,
} as const

export const REDUCED_TIMING = {
  perDrink: 450,
  reveal: 250,
  ratioIntro: 400,
  perRatio: 260,
  celebration: 300,
} as const

/**
 * 룰렛에 스쳐 지나갈 음료 순서를 만든다.
 * - 연속으로 같은 음료가 나오지 않음
 * - 마지막 칸은 반드시 최종 음료(target)
 */
export function buildSpinSequence(pool: readonly string[], target: string, length: number, rng: Rng = defaultRng): string[] {
  if (length <= 0) return []
  const options = Array.from(new Set([...pool, target]))
  const seq: string[] = []
  for (let i = 0; i < length - 1; i++) {
    const prev = seq[i - 1]
    const isBeforeLast = i === length - 2
    const candidates = options.filter((id) => id !== prev && !(isBeforeLast && id === target))
    seq.push(candidates.length ? pickOne(candidates, rng) : options[0])
  }
  seq.push(target)
  return seq
}

export function buildTimeline(
  recipe: Recipe,
  enabledDrinkIds: readonly string[],
  opts: { reducedMotion?: boolean; rng?: Rng } = {},
): { events: TimedEvent[]; duration: number } {
  const rng = opts.rng ?? defaultRng
  const events: TimedEvent[] = []
  const push = (at: number, event: TimelineEvent) => events.push({ at: Math.round(at), event })
  const ids = recipe.items.map((it) => it.drinkId)
  let t = 0

  if (opts.reducedMotion) {
    ids.forEach((_, index) => {
      push(t, { type: 'spinStart', index })
      push(t + 50, { type: 'reveal', index })
      push(t + 50 + REDUCED_TIMING.reveal, { type: 'collect', index })
      t += REDUCED_TIMING.perDrink
    })
    push(t, { type: 'ratioPhase' })
    t += REDUCED_TIMING.ratioIntro
    ids.forEach((_, index) => {
      push(t, { type: 'ratioReveal', index })
      t += REDUCED_TIMING.perRatio
    })
    push(t, { type: 'complete' })
    t += REDUCED_TIMING.celebration
    push(t, { type: 'settle' })
    return { events, duration: t }
  }

  const fastCount = Math.floor(TIMING.fast / TIMING.fastInterval)
  ids.forEach((target, index) => {
    // 이미 뽑힌 음료는 룰렛 화면에서 빼서 헷갈리지 않게 한다 (시각 효과일 뿐)
    const taken = new Set(ids.slice(0, index))
    let pool = enabledDrinkIds.filter((id) => !taken.has(id))
    if (pool.length < 3) pool = [...enabledDrinkIds]
    const seq = buildSpinSequence(pool, target, fastCount + TIMING.slowSteps.length, rng)

    push(t, { type: 'spinStart', index })
    const fastStart = t + TIMING.start
    for (let k = 0; k < fastCount; k++) {
      push(fastStart + k * TIMING.fastInterval, { type: 'tick', index, drinkId: seq[k], slow: false, step: k })
    }
    const slowStart = fastStart + TIMING.fast
    TIMING.slowSteps.forEach((offset, k) => {
      push(slowStart + offset, { type: 'tick', index, drinkId: seq[fastCount + k], slow: true, step: k })
    })
    const revealAt = slowStart + TIMING.slowSteps[TIMING.slowSteps.length - 1] + TIMING.revealAfterLastTick
    push(revealAt, { type: 'reveal', index })
    push(revealAt + TIMING.reveal, { type: 'collect', index })
    t = revealAt + TIMING.reveal + TIMING.collect
  })

  push(t, { type: 'ratioPhase' })
  t += TIMING.ratioIntro
  ids.forEach((_, index) => {
    push(t, { type: 'ratioStart', index })
    push(t + TIMING.ratioScramble, { type: 'ratioReveal', index })
    t += TIMING.ratioScramble + TIMING.ratioGap
  })
  t += TIMING.completeDelay - TIMING.ratioGap
  push(t, { type: 'complete' })
  t += TIMING.celebration
  push(t, { type: 'settle' })
  return { events, duration: t }
}

/** setTimeout 묶음 관리자. cancel() 한 번이면 남은 예약이 전부 사라진다. */
export class Timeline<E = TimelineEvent> {
  private timers = new Set<ReturnType<typeof setTimeout>>()

  play(events: readonly { at: number; event: E }[], onEvent: (e: E) => void) {
    this.cancel()
    for (const { at, event } of events) {
      const id = setTimeout(() => {
        this.timers.delete(id)
        try {
          onEvent(event)
        } catch (err) {
          console.error('[timeline]', err)
        }
      }, at)
      this.timers.add(id)
    }
  }

  cancel() {
    this.timers.forEach((id) => clearTimeout(id))
    this.timers.clear()
  }

  get pending() {
    return this.timers.size
  }
}
