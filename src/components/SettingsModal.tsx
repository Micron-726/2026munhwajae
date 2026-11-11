import { Check, Lock, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Drink } from '../data/drinkSchema'
import { withAlpha } from '../lib/color'
import { sound } from '../lib/sound'
import { TOTAL_ML } from '../logic/fractions'
import { MAX_SUPPORTED_COUNT, MIN_SUPPORTED_COUNT } from '../logic/ratioTemplates'
import { DEFAULT_MAX_COUNT, DEFAULT_MIN_COUNT, validateSettings, type MixSettings } from '../logic/settings'
import { DrinkIcon } from './icons/DrinkIcon'
import { DRINK_IMAGE_WARNINGS } from '../data/drinks'

interface Props {
  drinks: readonly Drink[]
  initial: MixSettings
  onApply: (s: MixSettings) => void
  onClose: () => void
}

export function SettingsModal({ drinks, initial, onApply, onClose }: Props) {
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(initial.enabledDrinkIds))
  const [minCount, setMin] = useState(initial.minCount)
  const [maxCount, setMax] = useState(initial.maxCount)
  const dialogRef = useRef<HTMLDivElement>(null)

  const problems = useMemo(
    () => validateSettings({ enabledCount: enabled.size, minCount, maxCount }),
    [enabled.size, minCount, maxCount],
  )
  const bad = (f: 'min' | 'max' | 'drinks') => problems.some((p) => p.field === f)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (id: string) => {
    sound.click()
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const setAll = (on: boolean) => {
    sound.click()
    setEnabled(on ? new Set(drinks.map((d) => d.id)) : new Set())
  }
  const restoreDefaults = () => {
    sound.click()
    setEnabled(new Set(drinks.map((d) => d.id)))
    setMin(DEFAULT_MIN_COUNT)
    setMax(DEFAULT_MAX_COUNT)
  }
  const excludeWhere = (pred: (d: Drink) => boolean) => {
    sound.click()
    setEnabled((prev) => new Set([...prev].filter((id) => !pred(drinks.find((d) => d.id === id)!))))
  }

  const apply = () => {
    if (problems.length) return
    sound.click()
    // 원래 목록 순서 유지
    onApply({ enabledDrinkIds: drinks.filter((d) => enabled.has(d.id)).map((d) => d.id), minCount, maxCount })
  }

  const cols = drinks.length <= 10 ? 5 : 6

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(56,43,40,0.45)] p-[2rem] backdrop-blur-[3px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        className="relative flex max-h-full w-[92rem] flex-col overflow-hidden rounded-[2.5rem] border-[0.3rem] border-ink bg-cream shadow-[0_1rem_0_#B9461F,0_2rem_4rem_rgba(0,0,0,0.25)] outline-none"
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      >
        {/* 제목 */}
        <div className="flex items-start gap-[1rem] border-b-[0.2rem] border-[#f0e1cc] bg-white px-[2.5rem] pb-[1.2rem] pt-[1.6rem]">
          <div>
            <h2 id="settings-title" className="font-display text-[2.6rem] leading-none text-ink">
              ⚙️ 오늘의 재료 설정
            </h2>
            <p className="mt-[0.6rem] text-[1.35rem] font-semibold text-muted">
              먹기 싫거나 마실 수 없는 음료는 체크를 해제해 주세요!
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-3d btn-soft ml-auto flex h-[3.4rem] w-[3.4rem] items-center justify-center rounded-full"
            aria-label="설정 닫기 (변경 취소)"
          >
            <X className="h-[1.8rem] w-[1.8rem]" strokeWidth={3} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-[2.5rem] py-[1.5rem]">
          {/* 영역 A — 음료 선택 */}
          <section aria-labelledby="sec-drinks">
            <div className="mb-[0.9rem] flex flex-wrap items-center gap-[0.6rem]">
              <h3 id="sec-drinks" className="mr-auto text-[1.5rem] font-extrabold">
                🥤 음료 고르기
              </h3>
              <SmallButton onClick={() => setAll(true)}>모두 선택</SmallButton>
              <SmallButton onClick={() => setAll(false)}>모두 해제</SmallButton>
              <SmallButton onClick={() => excludeWhere((d) => d.containsCaffeine)}>☕ 카페인 빼기</SmallButton>
              <SmallButton onClick={() => excludeWhere((d) => d.containsMilk)}>🥛 우유 성분 빼기</SmallButton>
              <SmallButton onClick={restoreDefaults}>
                <RotateCcw className="h-[1.1rem] w-[1.1rem]" strokeWidth={3} /> 기본값 복원
              </SmallButton>
            </div>

            <div
              className="grid gap-[1rem]"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              role="group"
              aria-label="음료 선택"
            >
              {drinks.map((d) => (
                <DrinkToggle key={d.id} drink={d} checked={enabled.has(d.id)} onToggle={() => toggle(d.id)} />
              ))}
            </div>

            <p
              className={`mt-[1rem] text-center text-[1.4rem] font-bold ${bad('drinks') ? 'text-danger' : 'text-ink'}`}
              data-testid="enabled-count"
            >
              현재 <span className="font-display text-[1.8rem] text-primary">{enabled.size}</span>개의 음료가 선택되었습니다.
            </p>
            {DRINK_IMAGE_WARNINGS.map((w) => (
              <p key={w} className="mt-[0.3rem] text-center text-[1.1rem] font-semibold text-muted">
                🖼️ {w}
              </p>
            ))}
          </section>

          <div className="mt-[1.4rem] grid grid-cols-[1fr_1fr_0.9fr] gap-[1rem]">
            {/* 영역 B — 혼합 개수 */}
            <Stepper
              label="최소 음료 개수"
              value={minCount}
              onChange={setMin}
              invalid={bad('min')}
              testId="min"
            />
            <Stepper
              label="최대 음료 개수"
              value={maxCount}
              onChange={setMax}
              invalid={bad('max') || (bad('drinks') && enabled.size > 0)}
              testId="max"
            />
            {/* 영역 C — 기본 정보 */}
            <div className="flex flex-col justify-center rounded-[1.6rem] border-[0.2rem] border-[#f0e1cc] bg-white px-[1.5rem] py-[1rem]">
              <span className="flex items-center gap-[0.4rem] text-[1.2rem] font-bold text-muted">
                <Lock className="h-[1.1rem] w-[1.1rem]" strokeWidth={3} /> 고정
              </span>
              <span className="text-[1.5rem] font-extrabold">
                한 잔의 총량: <span className="font-display text-[2.2rem] text-primary">{TOTAL_ML}mL</span>
              </span>
            </div>
          </div>
        </div>

        {/* 영역 D — 완료 */}
        <div className="flex items-center gap-[1.5rem] border-t-[0.2rem] border-[#f0e1cc] bg-white px-[2.5rem] py-[1.2rem]">
          <div className="min-h-[2.2rem] flex-1" role="alert" aria-live="assertive">
            {problems.map((p) => (
              <p key={p.message} className="text-[1.35rem] font-extrabold text-danger">
                ⚠️ {p.message}
              </p>
            ))}
            {problems.length === 0 && (
              <p className="text-[1.3rem] font-semibold text-muted">
                추첨 때 {minCount === maxCount ? `${minCount}가지` : `${minCount}~${maxCount}가지`} 음료를 섞어요.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={apply}
            disabled={problems.length > 0}
            className="btn-3d btn-primary rounded-[1.5rem] px-[2.6rem] py-[1rem] font-display text-[1.9rem]"
          >
            이 설정으로 시작하기
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SmallButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-3d btn-soft flex items-center gap-[0.3rem] rounded-full px-[1.1rem] py-[0.45rem] text-[1.15rem] font-bold"
    >
      {children}
    </button>
  )
}

function DrinkToggle({ drink, checked, onToggle }: { drink: Drink; checked: boolean; onToggle: () => void }) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={drink.name}
      onClick={onToggle}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="relative flex flex-col items-center rounded-[1.5rem] px-[0.5rem] pb-[0.8rem] pt-[0.9rem] transition-[background,border-color,box-shadow] duration-150"
      style={{
        background: checked ? `linear-gradient(180deg, ${withAlpha(drink.color, 0.18)}, #fff 70%)` : '#f3ece2',
        border: `0.22rem solid ${checked ? drink.color : '#e3d6c4'}`,
        boxShadow: checked ? `0 0.35rem 0 ${withAlpha(drink.color, 0.45)}` : 'none',
      }}
    >
      <span
        className="absolute right-[0.6rem] top-[0.6rem] flex h-[2rem] w-[2rem] items-center justify-center rounded-[0.6rem] border-[0.2rem]"
        style={{
          background: checked ? drink.color : '#fff',
          borderColor: checked ? drink.color : '#cdbda8',
        }}
        aria-hidden
      >
        {checked && <Check className="h-[1.3rem] w-[1.3rem] text-white" strokeWidth={4} />}
      </span>
      {drink.maxMl !== undefined && (
        <span
          className="absolute left-[0.6rem] top-[0.65rem] rounded-full bg-ink px-[0.6rem] py-[0.1rem] text-[0.95rem] font-extrabold text-white"
          title={`한 잔에 최대 ${drink.maxMl}mL 까지만 들어가요`}
        >
          최대 {drink.maxMl}mL
        </span>
      )}
      <span style={{ filter: checked ? 'none' : 'grayscale(1)', opacity: checked ? 1 : 0.45 }} className="transition">
        <DrinkIcon drink={drink} size="5.6rem" />
      </span>
      <span className={`mt-[0.3rem] text-[1.35rem] font-extrabold ${checked ? 'text-ink' : 'text-muted line-through'}`}>
        {drink.name}
      </span>
      <span className={`text-[1rem] font-bold ${checked ? 'text-primary' : 'text-muted'}`}>{checked ? '선택됨' : '제외'}</span>
    </motion.button>
  )
}

function Stepper({
  label,
  value,
  onChange,
  invalid,
  testId,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  invalid: boolean
  testId: string
}) {
  const dec = () => {
    sound.click()
    onChange(Math.max(MIN_SUPPORTED_COUNT, value - 1))
  }
  const inc = () => {
    sound.click()
    onChange(Math.min(MAX_SUPPORTED_COUNT, value + 1))
  }
  return (
    <div
      className="flex items-center justify-between rounded-[1.6rem] border-[0.2rem] bg-white px-[1.5rem] py-[0.9rem] transition-colors"
      style={{ borderColor: invalid ? '#d9473b' : '#f0e1cc', boxShadow: invalid ? '0 0 0 0.25rem rgba(217,71,59,0.18)' : 'none' }}
      data-invalid={invalid || undefined}
      data-testid={`stepper-${testId}`}
    >
      <div>
        <div className={`text-[1.4rem] font-extrabold ${invalid ? 'text-danger' : 'text-ink'}`}>{label}</div>
        <div className="text-[1.05rem] font-semibold text-muted">
          {MIN_SUPPORTED_COUNT}~{MAX_SUPPORTED_COUNT}개
        </div>
      </div>
      <div className="flex items-center gap-[0.8rem]">
        <button
          type="button"
          onClick={dec}
          disabled={value <= MIN_SUPPORTED_COUNT}
          className="btn-3d btn-soft flex h-[3.2rem] w-[3.2rem] items-center justify-center rounded-full"
          aria-label={`${label} 줄이기`}
        >
          <Minus className="h-[1.5rem] w-[1.5rem]" strokeWidth={3.5} />
        </button>
        <span
          className={`w-[2.6rem] text-center font-display text-[2.8rem] leading-none ${invalid ? 'text-danger' : 'text-ink'}`}
          aria-live="polite"
          aria-label={`${label} ${value}개`}
          data-testid={`${testId}-value`}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={value >= MAX_SUPPORTED_COUNT}
          className="btn-3d btn-soft flex h-[3.2rem] w-[3.2rem] items-center justify-center rounded-full"
          aria-label={`${label} 늘리기`}
        >
          <Plus className="h-[1.5rem] w-[1.5rem]" strokeWidth={3.5} />
        </button>
      </div>
    </div>
  )
}
