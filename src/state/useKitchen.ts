import { useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ALL_DRINK_IDS, DRINK_BY_ID, EMBEDDINGS, MAX_ML_BY_ID, MIXING } from '../data/drinks'
import { buildTimeline, Timeline } from '../lib/animation'
import { sound } from '../lib/sound'
import { pickOne } from '../logic/random'
import { nameDrink, type DrinkName } from '../logic/drinkName'
import { generateRecipe, RecipeError, type Recipe } from '../logic/recipeGenerator'
import { NAME_BOOK } from '../data/names'
import { defaultSettings, validateSettings, type MixSettings } from '../logic/settings'
import { initialKitchenState, kitchenReducer, ORDINALS, type KitchenEvent, type Speech } from './kitchen'

const EXCLAIMS = [
  '오, 이게 나오네요!',
  '좋아요, 바로 투입!',
  '흥미로운 선택이에요…',
  '벌써부터 수상해요!',
  '이건 예상 못 했죠?',
  '셰프의 촉이 왔어요!',
]

const FINALES = [
  '용기 있는 자만이 마실 수 있어요!',
  '맛은… 셰프도 장담 못 해요!',
  '오늘의 역작이 탄생했어요!',
  '한 모금이면 충분할지도?',
  '이 조합, 특허 내야겠어요!',
]

const NAMING_SUB = '이 음료의 이름은…'

function makeName(recipe: Recipe): DrinkName | null {
  if (!NAME_BOOK) return null
  try {
    return nameDrink(recipe, { drinks: DRINK_BY_ID, embeddings: EMBEDDINGS, book: NAME_BOOK })
  } catch (err) {
    console.error('[이름 짓기]', err)
    return null
  }
}

function speechFor(e: KitchenEvent, recipe: Recipe | null, name: DrinkName | null): Speech | undefined {
  if (!recipe) return undefined
  switch (e.type) {
    case 'settle':
      return name ? { main: `「${name.name}」`, sub: name.tagline } : undefined
    case 'spinStart':
      if (recipe.items[e.index]?.surprise)
        return { main: '어라, 수상한 기운이…?!', sub: `${ORDINALS[e.index]} 재료는 뭔가 이상해요!` }
      return e.index === 0
        ? { main: `이번엔 ${recipe.count}가지 재료를 섞어요!`, sub: '첫 번째 재료는 과연…?' }
        : { main: `${ORDINALS[e.index]} 재료는…?`, sub: '두근두근…' }
    case 'reveal': {
      const item = recipe.items[e.index]
      const d = DRINK_BY_ID.get(item.drinkId)
      if (item.surprise) return { main: `⚡ ${d?.name ?? '???'}?!`, sub: '서프라이즈 재료 등장! 셰프도 예상 못 했어요' }
      return { main: `${d?.name ?? '???'}!`, sub: pickOne(EXCLAIMS) }
    }
    case 'ratioPhase':
      return { main: '재료 준비 완료!', sub: '이제 비밀의 비율을 정해볼까요?' }
    case 'complete':
      return { main: '짜잔! 오늘의 수상한 음료 완성!', sub: name ? NAMING_SUB : pickOne(FINALES) }
    default:
      return undefined
  }
}

export function useKitchen() {
  const [state, dispatch] = useReducer(kitchenReducer, defaultSettings(ALL_DRINK_IDS), initialKitchenState)
  const [soundOn, setSoundOn] = useState(() => sound.isEnabled())
  const reducedMotion = useReducedMotion() ?? false

  const timelineRef = useRef<Timeline<KitchenEvent> | null>(null)
  if (!timelineRef.current) timelineRef.current = new Timeline<KitchenEvent>()
  /** 렌더링 전에 연속 클릭이 들어와도 막기 위한 동기 잠금 */
  const busyRef = useRef(false)
  const recipeRef = useRef<Recipe | null>(null)
  const nameRef = useRef<DrinkName | null>(null)

  const handleEvent = useCallback((e: KitchenEvent) => {
    switch (e.type) {
      case 'tick':
        if (e.slow) sound.slowTick(e.step)
        else sound.tick(e.step)
        break
      case 'reveal':
        sound.ding()
        break
      case 'ratioReveal':
        sound.tok()
        break
      case 'complete':
        sound.fanfare()
        busyRef.current = false
        break
      case 'settle':
        if (nameRef.current) sound.nameReveal()
        break
    }
    dispatch({ type: 'event', event: e, speech: speechFor(e, recipeRef.current, nameRef.current) })
  }, [])

  const stopEverything = useCallback(() => {
    timelineRef.current?.cancel()
    sound.stopAll()
  }, [])

  const draw = useCallback(() => {
    if (busyRef.current) return
    const { settings } = state
    const problems = validateSettings({
      enabledCount: settings.enabledDrinkIds.length,
      minCount: settings.minCount,
      maxCount: settings.maxCount,
    })
    if (problems.length) {
      dispatch({ type: 'warn', speech: { main: '앗, 재료가 부족해요!', sub: problems[0].message, tone: 'warn' } })
      return false
    }
    let recipe: Recipe
    try {
      recipe = generateRecipe({ ...settings, maxMl: MAX_ML_BY_ID }, undefined, undefined, {
        config: MIXING,
        embeddings: EMBEDDINGS,
      })
    } catch (err) {
      const msg = err instanceof RecipeError ? err.message : '레시피를 만들 수 없어요.'
      dispatch({ type: 'warn', speech: { main: '앗, 문제가 생겼어요!', sub: msg, tone: 'warn' } })
      return false
    }
    busyRef.current = true
    stopEverything()
    sound.unlock()
    sound.click()
    recipeRef.current = recipe
    // 이름도 레시피와 함께 미리 확정 (건너뛰기해도 같은 이름)
    const drinkName = makeName(recipe)
    nameRef.current = drinkName
    const { events } = buildTimeline(recipe, settings.enabledDrinkIds, { reducedMotion })
    dispatch({ type: 'start', recipe, drinkName, speech: { main: '좋아요, 시작합니다!', sub: '룰렛을 돌려 볼게요!' } })
    try {
      timelineRef.current!.play(events, handleEvent)
    } catch {
      // 애니메이션이 실패해도 결과는 보여준다
      busyRef.current = false
      dispatch({ type: 'skip', speech: { main: '짜잔! 오늘의 수상한 음료 완성!' } })
    }
    return true
  }, [state, reducedMotion, handleEvent, stopEverything])

  const skip = useCallback(() => {
    if (!recipeRef.current || !busyRef.current) return
    stopEverything()
    busyRef.current = false
    dispatch({
      type: 'skip',
      speech: { main: '짜잔! 오늘의 수상한 음료 완성!', sub: nameRef.current ? NAMING_SUB : pickOne(FINALES) },
    })
    timelineRef.current!.play([{ at: 900, event: { type: 'settle' } }], handleEvent)
  }, [stopEverything, handleEvent])

  const newGuest = useCallback(() => {
    stopEverything()
    busyRef.current = false
    recipeRef.current = null
    sound.unlock()
    sound.welcome()
    dispatch({
      type: 'newGuest',
      settings: defaultSettings(ALL_DRINK_IDS),
      speech: { main: '새 손님 어서 오세요!', sub: '오늘의 수상한 레시피를 만들어 볼까요?' },
    })
    timelineRef.current!.play([{ at: 1100, event: { type: 'welcomeDone' } }], handleEvent)
  }, [stopEverything, handleEvent])

  const applySettings = useCallback((settings: MixSettings) => {
    if (busyRef.current) return
    dispatch({ type: 'applySettings', settings })
  }, [])

  const toggleSound = useCallback(() => {
    const next = !sound.isEnabled()
    sound.setEnabled(next)
    setSoundOn(next)
    if (next) {
      sound.unlock()
      sound.click()
    }
  }, [])

  // 언마운트 / 페이지 종료 시 정리
  useEffect(() => {
    const onHide = () => stopEverything()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      stopEverything()
    }
  }, [stopEverything])

  const isBusy = state.phase === 'spinningIngredients' || state.phase === 'revealingRatios'

  return useMemo(
    () => ({ state, isBusy, soundOn, reducedMotion, draw, skip, newGuest, applySettings, toggleSound, timelineRef }),
    [state, isBusy, soundOn, reducedMotion, draw, skip, newGuest, applySettings, toggleSound],
  )
}
