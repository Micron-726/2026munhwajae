/**
 * Web Audio API 로 직접 합성하는 효과음. 외부 음원 파일을 쓰지 않는다.
 * 오디오를 쓸 수 없는 환경에서는 모든 함수가 조용히 아무것도 하지 않는다.
 */

type Wave = OscillatorType

const STORAGE_KEY = 'mystery-kitchen:sound'
const MASTER_VOLUME = 0.22

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  /** 진행 중인 효과음 묶음. stopAll() 하면 통째로 끊는다. */
  private bus: GainNode | null = null
  private enabled = true

  constructor() {
    try {
      const saved = globalThis.localStorage?.getItem(STORAGE_KEY)
      if (saved === 'off') this.enabled = false
    } catch {
      /* 저장소 접근 불가 → 기본값 ON */
    }
  }

  isEnabled() {
    return this.enabled
  }

  setEnabled(on: boolean) {
    this.enabled = on
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, on ? 'on' : 'off')
    } catch {
      /* 무시 */
    }
    if (!on) this.stopAll()
  }

  /** 첫 사용자 클릭 때 호출 — 브라우저 자동재생 정책 대응 */
  unlock() {
    const ctx = this.ensure()
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      const Ctor =
        globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = MASTER_VOLUME
      this.master.connect(this.ctx.destination)
      return this.ctx
    } catch {
      this.ctx = null
      return null
    }
  }

  private out(): { ctx: AudioContext; dest: GainNode } | null {
    if (!this.enabled) return null
    const ctx = this.ensure()
    if (!ctx || !this.master) return null
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    if (!this.bus) {
      this.bus = ctx.createGain()
      this.bus.connect(this.master)
    }
    return { ctx, dest: this.bus }
  }

  /** 실행 중인 모든 효과음을 즉시 끊는다. */
  stopAll() {
    if (this.bus) {
      try {
        this.bus.disconnect()
      } catch {
        /* 무시 */
      }
      this.bus = null
    }
  }

  private tone(opts: {
    freq: number
    to?: number
    at?: number
    dur: number
    type?: Wave
    vol?: number
    attack?: number
  }) {
    const o = this.out()
    if (!o) return
    try {
      const { ctx, dest } = o
      const t0 = ctx.currentTime + (opts.at ?? 0)
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = opts.type ?? 'sine'
      osc.frequency.setValueAtTime(opts.freq, t0)
      if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur)
      const vol = opts.vol ?? 0.5
      const attack = opts.attack ?? 0.005
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(vol, t0 + attack)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur)
      osc.connect(g)
      g.connect(dest)
      osc.start(t0)
      osc.stop(t0 + opts.dur + 0.02)
    } catch {
      /* 재생 실패 → 무시하고 진행 */
    }
  }

  /** 버튼 클릭: 가벼운 팝 */
  click() {
    this.tone({ freq: 520, to: 880, dur: 0.08, type: 'sine', vol: 0.35 })
  }

  /** 룰렛 빠른 회전: 띠리릭 */
  tick(step = 0) {
    const notes = [880, 988, 1047, 1175, 1319]
    this.tone({ freq: notes[step % notes.length], dur: 0.045, type: 'square', vol: 0.12 })
  }

  /** 룰렛 감속: 낮아지는 틱 */
  slowTick(step = 0) {
    this.tone({ freq: 700 - step * 60, dur: 0.07, type: 'triangle', vol: 0.3 })
  }

  /** 재료 확정: 밝은 딩! */
  ding() {
    this.tone({ freq: 1319, dur: 0.5, type: 'sine', vol: 0.45 })
    this.tone({ freq: 1976, at: 0.06, dur: 0.45, type: 'sine', vol: 0.22 })
    this.tone({ freq: 2637, at: 0.0, dur: 0.15, type: 'triangle', vol: 0.08 })
  }

  /** 비율 확정: 짧은 톡! */
  tok() {
    this.tone({ freq: 420, to: 260, dur: 0.09, type: 'triangle', vol: 0.5 })
    this.tone({ freq: 1600, dur: 0.03, type: 'square', vol: 0.06 })
  }

  /** 비율 섞는 중 작은 소리 */
  shuffleBlip() {
    this.tone({ freq: 1400 + Math.random() * 400, dur: 0.03, type: 'square', vol: 0.05 })
  }

  /** 완성: 경쾌한 팡파르 */
  fanfare() {
    const seq: [number, number, number][] = [
      [523, 0, 0.14],
      [659, 0.11, 0.14],
      [784, 0.22, 0.14],
      [1047, 0.33, 0.5],
    ]
    for (const [f, at, dur] of seq) {
      this.tone({ freq: f, at, dur, type: 'triangle', vol: 0.4 })
      this.tone({ freq: f * 2, at, dur: dur * 0.8, type: 'sine', vol: 0.1 })
    }
    this.tone({ freq: 784, at: 0.33, dur: 0.5, type: 'triangle', vol: 0.22 })
    this.tone({ freq: 659, at: 0.33, dur: 0.5, type: 'triangle', vol: 0.18 })
  }

  /** 이름 공개: 반짝이는 아르페지오 */
  nameReveal() {
    const notes = [1047, 1319, 1568, 2093]
    notes.forEach((f, i) => this.tone({ freq: f, at: i * 0.07, dur: 0.28, type: "sine", vol: 0.28 }))
    this.tone({ freq: 2637, at: 0.3, dur: 0.4, type: "triangle", vol: 0.1 })
  }

  /** 새 손님 환영: 짧은 반짝 */
  welcome() {
    this.tone({ freq: 784, dur: 0.12, type: 'sine', vol: 0.3 })
    this.tone({ freq: 1175, at: 0.09, dur: 0.22, type: 'sine', vol: 0.3 })
  }
}

export const sound = new SoundEngine()
export type { SoundEngine }
