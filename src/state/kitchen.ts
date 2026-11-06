import type { ChefMood } from '../components/ChefCharacter'
import type { TimelineEvent } from '../lib/animation'
import type { DrinkName } from '../logic/drinkName'
import type { Recipe } from '../logic/recipeGenerator'
import type { MixSettings } from '../logic/settings'

export type Phase = 'idle' | 'spinningIngredients' | 'revealingRatios' | 'completed'
export type RouletteMode = 'mystery' | 'start' | 'fast' | 'slow' | 'reveal' | 'collected'

export interface Speech {
  main: string
  sub?: string
  tone?: 'normal' | 'warn'
}

export interface KitchenState {
  phase: Phase
  settings: MixSettings
  recipe: Recipe | null
  /** 지금 룰렛에서 추첨 중인 재료 순번 (0부터) */
  spinIndex: number
  displayDrinkId: string | null
  rouletteMode: RouletteMode
  tickStep: number
  revealedIngredientCount: number
  revealedRatioCount: number
  scramblingIndex: number | null
  celebrating: boolean
  chefMood: ChefMood
  speech: Speech
  /** 이번 레시피의 이름 (뽑기 시작 때 확정) */
  drinkName: DrinkName | null
  /** 이름이 공개되었는지 */
  nameRevealed: boolean
  /** 새 손님마다 증가 — 환영 연출 키 */
  guestKey: number
}

export type KitchenEvent = TimelineEvent | { type: 'welcomeDone' }

export type KitchenAction =
  | { type: 'start'; recipe: Recipe; drinkName: DrinkName | null; speech: Speech }
  | { type: 'event'; event: KitchenEvent; speech?: Speech }
  | { type: 'skip'; speech: Speech }
  | { type: 'newGuest'; settings: MixSettings; speech: Speech }
  | { type: 'applySettings'; settings: MixSettings }
  | { type: 'warn'; speech: Speech }

export const ORDINALS = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째']

export const IDLE_SPEECH: Speech = { main: '어서 오세요!', sub: '오늘의 수상한 레시피를 만들어 볼까요?' }

export function initialKitchenState(settings: MixSettings): KitchenState {
  return {
    phase: 'idle',
    settings,
    recipe: null,
    spinIndex: 0,
    displayDrinkId: null,
    rouletteMode: 'mystery',
    tickStep: 0,
    revealedIngredientCount: 0,
    revealedRatioCount: 0,
    scramblingIndex: null,
    celebrating: false,
    chefMood: 'idle',
    speech: IDLE_SPEECH,
    guestKey: 0,
    drinkName: null,
    nameRevealed: false,
  }
}

export function kitchenReducer(state: KitchenState, action: KitchenAction): KitchenState {
  switch (action.type) {
    case 'start':
      return {
        ...state,
        phase: 'spinningIngredients',
        recipe: action.recipe,
        drinkName: action.drinkName,
        nameRevealed: false,
        spinIndex: 0,
        displayDrinkId: null,
        rouletteMode: 'start',
        tickStep: 0,
        revealedIngredientCount: 0,
        revealedRatioCount: 0,
        scramblingIndex: null,
        celebrating: false,
        chefMood: 'thinking',
        speech: action.speech,
      }

    case 'skip': {
      if (!state.recipe) return state
      const n = state.recipe.items.length
      return {
        ...state,
        phase: 'completed',
        spinIndex: n - 1,
        rouletteMode: 'collected',
        revealedIngredientCount: n,
        revealedRatioCount: n,
        scramblingIndex: null,
        celebrating: false,
        nameRevealed: false,
        chefMood: 'celebrating',
        speech: action.speech,
      }
    }

    case 'newGuest':
      return {
        ...initialKitchenState(action.settings),
        chefMood: 'celebrating',
        speech: action.speech,
        guestKey: state.guestKey + 1,
      }

    case 'applySettings':
      return { ...state, settings: action.settings }

    case 'warn':
      return { ...state, speech: action.speech, chefMood: 'surprised' }

    case 'event':
      return applyEvent(state, action.event, action.speech)
  }
}

function applyEvent(state: KitchenState, e: KitchenEvent, speech?: Speech): KitchenState {
  const s = speech ? { ...state, speech } : state
  const recipe = state.recipe
  switch (e.type) {
    case 'welcomeDone':
      return state.phase === 'idle' ? { ...s, chefMood: 'idle' } : s
    case 'spinStart':
      return {
        ...s,
        phase: 'spinningIngredients',
        spinIndex: e.index,
        rouletteMode: 'start',
        displayDrinkId: null,
        chefMood: 'thinking',
      }
    case 'tick':
      return { ...s, rouletteMode: e.slow ? 'slow' : 'fast', displayDrinkId: e.drinkId, tickStep: e.step }
    case 'reveal':
      return {
        ...s,
        rouletteMode: 'reveal',
        displayDrinkId: recipe?.items[e.index]?.drinkId ?? s.displayDrinkId,
        chefMood: 'surprised',
      }
    case 'collect':
      return {
        ...s,
        rouletteMode: 'collected',
        revealedIngredientCount: Math.max(s.revealedIngredientCount, e.index + 1),
        chefMood: 'thinking',
      }
    case 'ratioPhase':
      return { ...s, phase: 'revealingRatios', chefMood: 'idle', rouletteMode: 'collected' }
    case 'ratioStart':
      return { ...s, scramblingIndex: e.index, chefMood: 'thinking' }
    case 'ratioReveal':
      return {
        ...s,
        scramblingIndex: null,
        revealedRatioCount: Math.max(s.revealedRatioCount, e.index + 1),
        chefMood: 'surprised',
      }
    case 'complete':
      return {
        ...s,
        phase: 'completed',
        revealedIngredientCount: recipe?.items.length ?? 0,
        revealedRatioCount: recipe?.items.length ?? 0,
        scramblingIndex: null,
        celebrating: true,
        chefMood: 'celebrating',
      }
    case 'settle':
      return { ...s, celebrating: false, nameRevealed: true, chefMood: 'idle' }
  }
}
