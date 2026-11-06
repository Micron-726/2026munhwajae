import { motion } from 'motion/react'
import { DRINK_BY_ID } from '../data/drinks'
import { readableText } from '../lib/color'
import type { Recipe } from '../logic/recipeGenerator'

/** 한 줄 막대 그래프. 각 구간 폭 = 정확히 mL/180 (flex-grow 에 정수 mL 사용) */
export function RatioBar({ recipe }: { recipe: Recipe }) {
  return (
    <div className="flex w-full items-center gap-[1.5rem]">
      <div
        className="flex h-[4.6rem] flex-1 overflow-hidden rounded-[1.4rem] border-[0.25rem] border-ink bg-white shadow-[0_0.4rem_0_#e8d6bf]"
        role="img"
        aria-label={`혼합 비율 그래프: ${recipe.items
          .map((it) => `${DRINK_BY_ID.get(it.drinkId)?.name} ${it.ml}mL`)
          .join(', ')}`}
        data-testid="ratio-bar"
      >
        {recipe.items.map((it, i) => {
          const d = DRINK_BY_ID.get(it.drinkId)
          if (!d) return null
          const fg = readableText(d.color)
          const wide = it.ml >= 30
          return (
            <motion.div
              key={it.drinkId}
              className="flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap border-ink font-extrabold"
              style={{
                flexGrow: it.ml,
                flexBasis: 0,
                background: d.color,
                color: fg,
                borderLeftWidth: i === 0 ? 0 : '0.2rem',
              }}
              initial={{ opacity: 0, scaleY: 0.3 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 400, damping: 22 }}
              data-ml={it.ml}
              title={`${d.name} ${it.ml}mL`}
            >
              <span className={wide ? 'text-[1.35rem]' : 'text-[1.1rem]'}>
                {wide ? `${d.name} ${it.ml}mL` : `${it.ml}`}
              </span>
            </motion.div>
          )
        })}
      </div>
      <div className="flex shrink-0 items-baseline gap-[0.4rem] rounded-[1.4rem] bg-primary px-[1.6rem] py-[0.5rem] text-white shadow-[0_0.4rem_0_#B9461F]">
        <span className="text-[1.3rem] font-bold">총량</span>
        <span className="font-display text-[3rem] leading-none" data-testid="total-ml">
          {recipe.totalMl}
        </span>
        <span className="text-[1.5rem] font-bold">mL</span>
      </div>
    </div>
  )
}
