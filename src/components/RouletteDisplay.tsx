import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import { DRINK_BY_ID, DRINKS } from '../data/drinks'
import type { RouletteMode } from '../state/kitchen'
import { DrinkIcon } from './icons/DrinkIcon'

interface Props {
  mode: RouletteMode
  displayDrinkId: string | null
  tickStep: number
  spinIndex: number
  count: number | null
  /** 확정된 음료 아이콘이 카드로 날아가도록 공유하는 layoutId */
  layoutIdFor: (index: number) => string
  /** 지금 뽑는 재료가 서프라이즈인지 (확정 순간에만 공개) */
  surprise?: boolean
}

export function RouletteDisplay({ mode, displayDrinkId, tickStep, spinIndex, count, layoutIdFor, surprise = false }: Props) {
  const drink = displayDrinkId ? DRINK_BY_ID.get(displayDrinkId) : undefined
  const spinning = mode === 'fast' || mode === 'slow' || mode === 'start'
  const revealed = mode === 'reveal'

  return (
    <div className="relative flex h-[22rem] w-[22rem] items-center justify-center" data-testid="roulette" data-mode={mode}>
      {/* 빛나는 원형 배경 */}
      <motion.div
        className="absolute inset-[-5rem] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,213,106,0.75) 0%, rgba(255,213,106,0.25) 45%, rgba(255,213,106,0) 70%)' }}
        animate={{ scale: revealed ? 1.15 : spinning ? 1.05 : 1, opacity: revealed ? 1 : spinning ? 0.95 : 0.75 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      />
      <div
        className={`rays absolute inset-[-4.5rem] rounded-full ${spinning ? 'animate-spin-fast' : 'animate-spin-slow'}`}
        aria-hidden
      />

      {/* 아이템 박스 */}
      <motion.div
        key={`box-${spinIndex}-${revealed}`}
        className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[3.5rem] border-[0.55rem] border-lemon bg-white"
        style={{
          boxShadow:
            '0 0 0 0.35rem #E87343, 0 0.9rem 0 0.35rem #B9461F, 0 1.6rem 2.6rem rgba(185,70,31,0.28), inset 0 -1.2rem 2rem rgba(255,213,106,0.25)',
        }}
        initial={false}
        animate={
          revealed
            ? { scale: [1, 1.1, 0.97, 1.02, 1], rotate: [0, -3, 3, -1.5, 0] }
            : mode === 'start'
              ? { scale: 1.04 }
              : { scale: 1, rotate: 0 }
        }
        transition={revealed ? { duration: 0.42, ease: 'easeOut' } : { type: 'spring', stiffness: 400, damping: 20 }}
      >
        {count !== null && mode !== 'mystery' && (
          <span className="absolute left-[1.1rem] top-[1rem] z-10 rounded-full bg-primary px-[0.9rem] py-[0.2rem] font-display text-[1.35rem] text-white">
            {Math.min(spinIndex + 1, count)} / {count}
          </span>
        )}

        {revealed && surprise && (
          <motion.span
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 8 }}
            transition={{ type: 'spring', stiffness: 520, damping: 12 }}
            className="absolute right-[0.9rem] top-[0.9rem] z-10 rounded-full border-[0.2rem] border-ink bg-[#7E57C2] px-[0.9rem] py-[0.2rem] font-display text-[1.45rem] text-white"
          >
            ⚡ 서프라이즈!
          </motion.span>
        )}

        {mode === 'mystery' && <MysteryBox />}

        {mode === 'collected' && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.35, scale: 1 }}
            className="font-display text-[9rem] leading-none text-[#e6d3ba]"
            aria-hidden
          >
            ?
          </motion.span>
        )}

        {mode === 'start' && (
          <motion.span
            initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            className="font-display text-[9rem] leading-none text-primary"
            aria-hidden
          >
            ?
          </motion.span>
        )}

        {(mode === 'fast' || mode === 'slow') && drink && (
          <motion.div
            key={`${drink.id}-${tickStep}-${mode}`}
            className="flex flex-col items-center"
            initial={{ y: mode === 'fast' ? '-45%' : '-25%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: mode === 'fast' ? 0.055 : 0.12, ease: 'easeOut' }}
            style={{ filter: mode === 'fast' ? 'blur(1.2px)' : undefined }}
          >
            <DrinkIcon drink={drink} size="12.5rem" />
            <span className="mt-[0.2rem] text-[1.9rem] font-extrabold text-muted">{drink.name}</span>
          </motion.div>
        )}

        {revealed && drink && (
          <div className="flex flex-col items-center">
            <motion.div layoutId={layoutIdFor(spinIndex)} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
              <motion.div
                initial={{ scale: 0.7 }}
                animate={{ scale: [0.7, 1.28, 1] }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <DrinkIcon drink={drink} size="12.5rem" title />
              </motion.div>
            </motion.div>
            <motion.span
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-[0.2rem] font-display text-[2.3rem] leading-none"
              style={{ color: drink.color }}
            >
              {drink.name}
            </motion.span>
          </div>
        )}
      </motion.div>

      <AnimatePresence>{revealed && <Burst key={`burst-${spinIndex}`} color={surprise ? '#7E57C2' : (drink?.color ?? '#FFD56A')} />}</AnimatePresence>
    </div>
  )
}

function MysteryBox() {
  const samples = useMemo(() => DRINKS.slice(0, 4), [])
  const spots = [
    { left: '0.9rem', top: '2.6rem', r: -14 },
    { left: '15.3rem', top: '2.6rem', r: 12 },
    { left: '0.9rem', top: '14.6rem', r: 10 },
    { left: '15.3rem', top: '14.6rem', r: -12 },
  ]
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {samples.map((d, i) => (
        <div
          key={d.id}
          className="absolute opacity-40"
          style={{ left: spots[i].left, top: spots[i].top, transform: `rotate(${spots[i].r}deg)` }}
        >
          <div className="animate-floaty" style={{ animationDelay: `${i * 0.4}s` }}>
            <DrinkIcon drink={d} size="4.5rem" />
          </div>
        </div>
      ))}
      <motion.span
        className="font-display text-[11rem] leading-none text-primary"
        style={{ textShadow: '0 0.45rem 0 #B9461F' }}
        animate={{ y: [0, -10, 0], rotate: [-4, 4, -4] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        aria-label="미스터리 박스"
      >
        ?
      </motion.span>
    </div>
  )
}

/** 확정 순간 반짝이는 별 파티클 */
function Burst({ color }: { color: string }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.3
        const dist = 13 + Math.random() * 5
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          s: 0.7 + Math.random() * 0.8,
          c: i % 3 === 0 ? color : i % 3 === 1 ? '#FFD56A' : '#E87343',
          star: i % 2 === 0,
        }
      }),
    [color],
  )
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {parts.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: `${p.x}rem`, y: `${p.y}rem`, scale: [0, p.s, 0], opacity: [1, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {p.star ? (
            <svg viewBox="0 0 20 20" className="h-[2rem] w-[2rem]">
              <path d="M10 0 Q12 8 20 10 Q12 12 10 20 Q8 12 0 10 Q8 8 10 0 Z" fill={p.c} stroke="#382B28" strokeWidth="1.2" />
            </svg>
          ) : (
            <span className="block h-[1rem] w-[1rem] rounded-full" style={{ background: p.c }} />
          )}
        </motion.div>
      ))}
    </div>
  )
}
