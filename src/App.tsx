import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react'
import { SkipForward } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ChefCharacter } from './components/ChefCharacter'
import { ChefSpeechBubble } from './components/ChefSpeechBubble'
import { CelebrationEffect } from './components/CelebrationEffect'
import { Header } from './components/Header'
import { IngredientCard, type CardState } from './components/IngredientCard'
import { RatioBar } from './components/RatioBar'
import { RouletteDisplay } from './components/RouletteDisplay'
import { SettingsModal } from './components/SettingsModal'
import { DRINK_BY_ID, DRINK_CONFIG_ERROR, DRINKS } from './data/drinks'
import { NAME_BOOK_ERROR } from './data/names'
import { NamePlate } from './components/NamePlate'
import { sound } from './lib/sound'
import { TOTAL_ML } from './logic/fractions'
import { validateSettings, type MixSettings } from './logic/settings'
import { ORDINALS, type KitchenState } from './state/kitchen'
import { useKitchen } from './state/useKitchen'

export default function App() {
  const problems = [
    ...(DRINK_CONFIG_ERROR?.problems.map((p) => `drinks.yaml · ${p}`) ?? []),
    ...(NAME_BOOK_ERROR?.problems.map((p) => `names.yaml · ${p}`) ?? []),
  ]
  if (problems.length) return <ConfigErrorScreen problems={problems} />
  return (
    <MotionConfig reducedMotion="user">
      <Kitchen />
    </MotionConfig>
  )
}

function cardWidth(count: number, large: boolean) {
  if (count <= 3) return large ? '21rem' : '17rem'
  // 메인 영역 폭(약 83rem) 안에 5장까지 들어가도록
  if (count === 4) return large ? '18.5rem' : '16.5rem'
  return large ? '15.2rem' : '14.6rem'
}

function Kitchen() {
  const k = useKitchen()
  const { state } = k
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsKey, setSettingsKey] = useState(0)

  const openSettings = useCallback(() => {
    sound.unlock()
    sound.click()
    setSettingsKey((k) => k + 1)
    setSettingsOpen(true)
  }, [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const applySettings = useCallback(
    (s: MixSettings) => {
      k.applySettings(s)
      setSettingsOpen(false)
    },
    [k],
  )

  const settingsProblems = validateSettings({
    enabledCount: state.settings.enabledDrinkIds.length,
    minCount: state.settings.minCount,
    maxCount: state.settings.maxCount,
  })

  const completed = state.phase === 'completed'
  const recipe = state.recipe

  return (
    <div className="kitchen-bg flex h-full flex-col overflow-hidden" data-phase={state.phase}>
      <Header
        settings={state.settings}
        totalDrinks={DRINKS.length}
        soundOn={k.soundOn}
        onToggleSound={k.toggleSound}
        onOpenSettings={openSettings}
        settingsDisabled={k.isBusy}
      />

      <main className="flex min-h-0 flex-1 px-[2.5rem]">
        {/* 셰프 */}
        <aside className="flex w-[29rem] shrink-0 flex-col items-center justify-center pb-[1rem]">
          <ChefSpeechBubble speech={state.speech} />
          <motion.div
            key={`guest-${state.guestKey}`}
            className="mt-[2.4rem]"
            initial={state.guestKey > 0 ? { scale: 0.6, y: 40, opacity: 0 } : false}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          >
            <ChefCharacter mood={state.chefMood} height="25rem" />
          </motion.div>
        </aside>

        {/* 메인 무대 */}
        <section className="relative flex min-w-0 flex-1 flex-col items-center justify-center pl-[2rem]">
          <LayoutGroup>
            {!completed && (
              <>
                <StageHeading state={state} />
                <div className="mt-[1.6rem]">
                  <RouletteDisplay
                    mode={state.rouletteMode}
                    displayDrinkId={state.displayDrinkId}
                    tickStep={state.tickStep}
                    spinIndex={state.spinIndex}
                    count={recipe?.count ?? null}
                    layoutIdFor={(i) => `ing-${recipe?.id}-${i}`}
                    surprise={recipe?.items[state.spinIndex]?.surprise ?? false}
                  />
                </div>
              </>
            )}

            {completed && recipe && (
              <motion.h2
                key={`title-${recipe.id}`}
                className="font-display text-[3.4rem] leading-none text-ink"
                initial={{ scale: 2, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.05 }}
              >
                짜잔! 오늘의 <span className="text-primary">수상한 레시피</span> 완성!
              </motion.h2>
            )}

            {completed && recipe && state.drinkName && (
              <NamePlate key={`name-${recipe.id}`} name={state.drinkName} revealed={state.nameRevealed} />
            )}

            {state.phase === 'idle' ? (
              <InfoChips enabled={state.settings.enabledDrinkIds.length} min={state.settings.minCount} max={state.settings.maxCount} />
            ) : (
              recipe && (
                <motion.div
                  layout
                  className={`flex items-end justify-center ${completed ? 'mt-[1.5rem] gap-[1.2rem]' : 'mt-[2.6rem] gap-[1.1rem]'}`}
                  data-testid="collection"
                >
                  {recipe.items.map((it, i) => {
                    const drink = DRINK_BY_ID.get(it.drinkId)
                    const cs = cardStateFor(state, i)
                    return (
                      <IngredientCard
                        key={`${recipe.id}-${i}-${cs === 'placeholder' || cs === 'current' ? 'p' : 'c'}`}
                        index={i}
                        state={cs}
                        drink={drink}
                        ml={it.ml}
                        fraction={it.fraction}
                        large={completed}
                        width={cardWidth(recipe.count, completed)}
                        layoutId={`ing-${recipe.id}-${i}`}
                        surprise={it.surprise}
                      />
                    )
                  })}
                </motion.div>
              )
            )}

            {completed && recipe && (
              <motion.div
                className="mt-[1.8rem] w-full max-w-[86rem]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <RatioBar recipe={recipe} />
                <p className="mt-[0.8rem] text-center text-[1.2rem] font-semibold text-muted">
                  제조 기준은 카드의 <b className="text-ink">mL</b> 입니다 · 총 {TOTAL_ML}mL
                </p>
              </motion.div>
            )}
          </LayoutGroup>
        </section>
      </main>

      {/* 하단 버튼 */}
      <footer className="relative flex h-[9rem] shrink-0 items-center justify-center gap-[2rem] px-[2.5rem] pb-[1.2rem]">
        <AnimatePresence mode="popLayout" initial={false}>
          {completed ? (
            <motion.div
              key="done"
              className="flex items-center gap-[2rem]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.25 }}
            >
              <button
                type="button"
                onClick={() => k.draw()}
                className="btn-3d btn-primary rounded-[1.8rem] px-[3rem] py-[1.2rem] font-display text-[2.2rem]"
              >
                🔄 같은 설정으로 다시 뽑기
              </button>
              <button
                type="button"
                onClick={k.newGuest}
                className="btn-3d btn-soft rounded-[1.8rem] px-[3rem] py-[1.2rem] font-display text-[2.2rem]"
              >
                👋 새 손님 시작
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="draw"
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <button
                type="button"
                onClick={() => {
                  if (settingsProblems.length) {
                    openSettings()
                    return
                  }
                  k.draw()
                }}
                disabled={k.isBusy}
                className="btn-3d btn-primary rounded-[2rem] px-[4.5rem] py-[1.3rem] font-display text-[2.6rem]"
              >
                {k.isBusy ? '🎲 추첨 중…' : '🎲 레시피 뽑기!'}
              </button>
              {!k.isBusy && settingsProblems.length > 0 && (
                <p className="mt-[0.6rem] text-[1.2rem] font-bold text-danger" role="alert">
                  ⚠️ {settingsProblems[0].message} (버튼을 누르면 재료 설정이 열려요)
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {k.isBusy && (
            <motion.button
              type="button"
              onClick={k.skip}
              className="btn-3d btn-soft absolute bottom-[2.2rem] right-[2.5rem] flex items-center gap-[0.5rem] rounded-full px-[1.5rem] py-[0.7rem] text-[1.3rem] font-extrabold"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              건너뛰기 <SkipForward className="h-[1.3rem] w-[1.3rem]" strokeWidth={3} />
            </motion.button>
          )}
        </AnimatePresence>
      </footer>

      <AnimatePresence>
        {state.celebrating && recipe && (
          <CelebrationEffect key={recipe.id} colors={recipe.items.map((it) => DRINK_BY_ID.get(it.drinkId)?.color ?? '#E87343')} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal key={settingsKey} drinks={DRINKS} initial={state.settings} onApply={applySettings} onClose={closeSettings} />
        )}
      </AnimatePresence>
    </div>
  )
}

function cardStateFor(state: KitchenState, i: number): CardState {
  if (i < state.revealedIngredientCount) {
    if (i < state.revealedRatioCount) return 'revealed'
    if (state.scramblingIndex === i) return 'scrambling'
    return 'collected'
  }
  if (state.phase === 'spinningIngredients' && i === state.spinIndex) return 'current'
  return 'placeholder'
}

function StageHeading({ state }: { state: KitchenState }) {
  const recipe = state.recipe
  let text: string
  let total = 0
  let done = 0
  if (state.phase === 'spinningIngredients' && recipe) {
    text = `${ORDINALS[state.spinIndex] ?? ''} 재료 추첨 중…`
    total = recipe.count
    done = state.revealedIngredientCount
  } else if (state.phase === 'revealingRatios' && recipe) {
    text = '비밀의 비율 공개 중…'
    total = recipe.count
    done = state.revealedRatioCount
  } else {
    text = '오늘은 어떤 괴상한 음료가 탄생할까요?'
  }
  return (
    <div className="flex h-[3.6rem] items-center gap-[1.2rem]" aria-live="polite">
        <motion.p
          key={text}
          className="font-display text-[2.4rem] leading-none text-ink"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {text}
        </motion.p>
      {total > 0 && (
        <div className="flex items-center gap-[0.8rem] rounded-full bg-white px-[1rem] py-[0.45rem] shadow-[0_0.2rem_0_#f0e1cc]">
          <div className="flex gap-[0.4rem]" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <motion.span
                key={i}
                className="block h-[1rem] w-[1rem] rounded-full"
                animate={{
                  backgroundColor: i < done ? '#E87343' : '#efe2d0',
                  scale: i === done && state.phase !== 'idle' ? [1, 1.35, 1] : 1,
                }}
                transition={i === done ? { duration: 0.7, repeat: Infinity } : { duration: 0.2 }}
              />
            ))}
          </div>
          <span className="font-display text-[1.6rem] leading-none text-primary" data-testid="progress">
            {Math.min(done + (state.phase === 'spinningIngredients' ? 1 : 0), total)} / {total}
          </span>
        </div>
      )}
    </div>
  )
}

function InfoChips({ enabled, min, max }: { enabled: number; min: number; max: number }) {
  const chip = 'flex items-baseline gap-[0.5rem] rounded-full bg-white px-[1.5rem] py-[0.7rem] shadow-[0_0.3rem_0_#f0e1cc]'
  return (
    <motion.div
      className="mt-[3.6rem] flex gap-[1rem] text-[1.45rem] font-bold"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="info-chips"
    >
      <span className={chip}>
        🥤 사용 가능한 음료 <b className="font-display text-[1.9rem] text-primary">{enabled}</b>개
      </span>
      <span className={chip}>
        🔀 혼합 <b className="font-display text-[1.9rem] text-primary">{min === max ? min : `${min}~${max}`}</b>가지
      </span>
      <span className={chip}>
        🧪 총 <b className="font-display text-[1.9rem] text-primary">{TOTAL_ML}</b>mL
      </span>
    </motion.div>
  )
}

function ConfigErrorScreen({ problems }: { problems: string[] }) {
  return (
    <div className="kitchen-bg flex h-full items-center justify-center p-[3rem]">
      <div className="max-w-[70rem] rounded-[2rem] border-[0.3rem] border-danger bg-white p-[2.5rem]">
        <h1 className="font-display text-[2.6rem] text-danger">설정 파일을 확인해 주세요 🧐</h1>
        <p className="mt-[0.5rem] text-[1.4rem] font-semibold text-muted">아래 문제를 고친 뒤 저장하면 다시 실행됩니다.</p>
        <ul className="mt-[1.2rem] list-disc space-y-[0.4rem] pl-[2rem] text-[1.35rem] font-bold">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
