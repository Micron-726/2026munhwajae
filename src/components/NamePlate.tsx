import { motion } from 'motion/react'
import type { DrinkName } from '../logic/drinkName'

/** 결과 화면의 음료 이름표. 공개 전에는 "이 음료의 이름은…" 이 두근두근 */
export function NamePlate({ name, revealed }: { name: DrinkName; revealed: boolean }) {
  return (
    <div className="mt-[1.2rem] flex h-[4.6rem] items-center" data-testid="name-plate" data-revealed={revealed}>
      <motion.div
        className="flex items-center gap-[0.9rem] rounded-full border-[0.25rem] border-ink px-[1.8rem] py-[0.45rem]"
        style={{ boxShadow: '0 0.35rem 0 #382B28' }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{
          scale: revealed ? [1.18, 1] : 1,
          opacity: 1,
          backgroundColor: revealed ? (name.traits.surprise ? '#E9DDFB' : '#FFE9A8') : '#FFFFFF',
        }}
        transition={{ type: 'spring', stiffness: 420, damping: 16 }}
      >
        <span className="text-[1.9rem]" aria-hidden>
          {name.traits.surprise ? '⚡' : '🏷️'}
        </span>
        {revealed ? (
          <span className="font-display text-[2.6rem] leading-none text-ink" aria-label={`음료 이름: ${name.name}`} data-testid="drink-name">
            {Array.from(name.name).map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block whitespace-pre"
                initial={{ y: '0.5em', opacity: 0, scale: 0.6 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.035, type: 'spring', stiffness: 600, damping: 18 }}
              >
                {ch}
              </motion.span>
            ))}
          </span>
        ) : (
          <span className="flex items-center gap-[0.5rem] font-display text-[2.1rem] leading-none text-muted">
            이 음료의 이름은
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="inline-block"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              >
                ·
              </motion.span>
            ))}
          </span>
        )}
      </motion.div>
    </div>
  )
}
