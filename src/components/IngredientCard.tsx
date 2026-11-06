import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { Drink } from '../data/drinkSchema'
import { darken, withAlpha } from '../lib/color'
import { formatFraction, type Fraction } from '../logic/fractions'
import { DrinkIcon } from './icons/DrinkIcon'

export type CardState = 'placeholder' | 'current' | 'collected' | 'scrambling' | 'revealed'

interface Props {
  index: number
  state: CardState
  drink?: Drink
  ml?: number
  fraction?: Fraction
  large?: boolean
  width: string
  layoutId?: string
  /** 서프라이즈 재료 표시 */
  surprise?: boolean
}

const FAKE_FRACTIONS: Fraction[] = [
  { num: 1, den: 2 },
  { num: 1, den: 3 },
  { num: 2, den: 3 },
  { num: 1, den: 4 },
  { num: 3, den: 4 },
  { num: 1, den: 6 },
  { num: 5, den: 6 },
  { num: 1, den: 12 },
]

export function IngredientCard({ index, state, drink, ml, fraction, large = false, width, layoutId, surprise = false }: Props) {
  if (state === 'placeholder' || state === 'current' || !drink) {
    const current = state === 'current'
    return (
      <motion.div
        layout
        className="flex flex-col items-center justify-center rounded-[1.9rem] border-[0.22rem] border-dashed"
        style={{
          width,
          height: large ? '27rem' : '19.5rem',
          borderColor: current ? '#E87343' : '#e6d3ba',
          background: current ? 'rgba(255,213,106,0.18)' : 'rgba(255,255,255,0.45)',
        }}
        animate={current ? { scale: [1, 1.03, 1] } : { scale: 1 }}
        transition={current ? { duration: 0.8, repeat: Infinity } : undefined}
        data-testid="ingredient-placeholder"
      >
        <span className={`font-display text-[4.5rem] leading-none ${current ? 'text-primary' : 'text-[#e6d3ba]'}`}>?</span>
        <span className={`mt-[0.6rem] text-[1.25rem] font-bold ${current ? 'text-primary' : 'text-[#cdb79c]'}`}>
          {current ? '추첨 중…' : `재료 ${index + 1}`}
        </span>
      </motion.div>
    )
  }

  const tint = withAlpha(drink.color, 0.16)
  const showRatio = state === 'revealed'

  return (
    <motion.article
      layout
      className="relative flex flex-col items-center rounded-[1.9rem] bg-white"
      style={{
        width,
        height: large ? '27rem' : '19.5rem',
        border: `0.22rem solid ${withAlpha(drink.color, 0.6)}`,
        background: `linear-gradient(180deg, ${tint} 0%, #ffffff 58%)`,
        boxShadow: `0 0.5rem 0 ${withAlpha(darken(drink.color, 0.25), 0.35)}, 0 1rem 1.6rem rgba(56,43,40,0.08)`,
        padding: large ? '1.4rem 1rem 1.2rem' : '1rem 0.8rem 0.9rem',
      }}
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      data-testid="ingredient-card"
      aria-label={`${index + 1}번 재료 ${drink.name}${showRatio && fraction && ml ? `, 비율 ${formatFraction(fraction)}, ${ml}mL` : ''}`}
    >
      <span
        className="absolute left-[0.9rem] top-[0.8rem] flex h-[2.3rem] w-[2.3rem] items-center justify-center rounded-full font-display text-[1.3rem] text-white"
        style={{ background: drink.color }}
        aria-hidden
      >
        {index + 1}
      </span>

      {surprise && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 6 }}
          transition={{ type: "spring", stiffness: 500, damping: 14 }}
          className="absolute -right-[0.7rem] -top-[0.9rem] z-10 rounded-full border-[0.18rem] border-ink bg-[#7E57C2] px-[0.7rem] py-[0.15rem] text-[1.05rem] font-extrabold text-white shadow-[0_0.2rem_0_#382B28]"
          data-testid="surprise-badge"
        >
          ⚡ 서프라이즈
        </motion.span>
      )}

      <motion.div layoutId={layoutId} layout transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
        <DrinkIcon drink={drink} size={large ? '8.5rem' : '6.4rem'} />
      </motion.div>

      <motion.h3
        layout="position"
        className={`mt-[0.3rem] text-center font-extrabold leading-tight text-ink ${large ? 'text-[2rem]' : 'text-[1.65rem]'}`}
      >
        {drink.name}
      </motion.h3>

      <motion.div layout="position" className="mt-auto flex w-full flex-col items-center">
        <RatioSlot state={state} fraction={fraction} color={drink.color} large={large} />
        <div className={`flex items-center justify-center ${large ? 'mt-[0.7rem] h-[4.6rem]' : 'mt-[0.45rem] h-[3.2rem]'}`}>
          <AnimatePresence>
            {showRatio && ml !== undefined && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="flex items-baseline rounded-[1.1rem] px-[1rem] font-black text-ink"
                style={{ background: withAlpha(drink.color, 0.18) }}
                data-testid="ml"
              >
                <span className={large ? 'text-[3.6rem] leading-[1.2]' : 'text-[2.4rem] leading-[1.25]'}>{ml}</span>
                <span className={`ml-[0.2rem] ${large ? 'text-[1.8rem]' : 'text-[1.3rem]'}`}>mL</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.article>
  )
}

function RatioSlot({ state, fraction, color, large }: { state: CardState; fraction?: Fraction; color: string; large: boolean }) {
  const scrambling = state === 'scrambling'
  const [fake, setFake] = useState(0)

  useEffect(() => {
    if (!scrambling) return
    const id = setInterval(() => setFake((f) => (f + 1 + Math.floor(Math.random() * 3)) % FAKE_FRACTIONS.length), 55)
    return () => clearInterval(id)
  }, [scrambling])

  const shown = state === 'revealed' ? fraction : scrambling ? FAKE_FRACTIONS[fake] : undefined
  const ink = darken(color, 0.25)
  const numSize = large ? 'text-[2.7rem]' : 'text-[2.05rem]'

  return (
    <div className={`flex items-center justify-center ${large ? 'h-[6.4rem]' : 'h-[4.9rem]'}`} data-testid="ratio">
      {!shown ? (
        <span className={`font-display ${large ? 'text-[3rem]' : 'text-[2.3rem]'} text-[#d8c4a8]`}>? / ?</span>
      ) : (
        <motion.div
          key={state === 'revealed' ? 'final' : 'scramble'}
          initial={state === 'revealed' ? { scale: 1.5 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 15 }}
          className="flex flex-col items-center font-display leading-none"
          style={{ color: scrambling ? '#b8a48b' : ink }}
          aria-label={state === 'revealed' && fraction ? `${fraction.num}/${fraction.den}` : '비율 추첨 중'}
        >
          {shown.den === 1 ? (
            <span className={numSize}>{shown.num}</span>
          ) : (
            <>
              <span className={numSize}>{shown.num}</span>
              <span className="my-[0.25rem] h-[0.28rem] w-[3.2rem] rounded-full" style={{ background: scrambling ? '#d8c4a8' : ink }} />
              <span className={numSize}>{shown.den}</span>
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}
