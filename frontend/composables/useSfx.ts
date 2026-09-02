// composables/useSfx.ts
// Efeitos sonoros retrô sintetizados via Web Audio API — sem arquivos de áudio.
// O AudioContext só é criado após o primeiro gesto do usuário (política dos browsers).

let audioCtx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctor) return null
      audioCtx = new Ctor()
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

type ToneOpts = {
  freq: number
  duration?: number
  type?: OscillatorType
  gain?: number
  delay?: number
}

function tone({ freq, duration = 0.08, type = 'square', gain = 0.04, delay = 0 }: ToneOpts) {
  const ac = ctx()
  if (!ac) return
  const start = ac.currentTime + delay
  const osc = ac.createOscillator()
  const amp = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  amp.gain.setValueAtTime(gain, start)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(amp)
  amp.connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export const useSfx = () => {
  return {
    /** clique curto de navegação/seleção */
    blip: () => tone({ freq: 1180, duration: 0.03, gain: 0.02 }),
    /** confirmação simples */
    beep: () => tone({ freq: 880, duration: 0.09 }),
    /** confirmação dupla ascendente (ação bem-sucedida) */
    confirm: () => {
      tone({ freq: 660, duration: 0.08 })
      tone({ freq: 990, duration: 0.11, delay: 0.09 })
    },
    /** alerta grave de erro/falha */
    error: () => {
      tone({ freq: 200, duration: 0.18, type: 'sawtooth', gain: 0.05 })
      tone({ freq: 160, duration: 0.22, type: 'sawtooth', gain: 0.05, delay: 0.12 })
    },
    /** sequência telegráfica de confirmação de viagem */
    travel: () => {
      ;[440, 550, 660, 880].forEach((f, i) =>
        tone({ freq: f, duration: 0.12, type: 'triangle', delay: i * 0.08 })
      )
    },
    /** tique de máquina de escrever (usado pelo efeito datilografado) */
    type: () => tone({ freq: 1500 + Math.random() * 350, duration: 0.012, gain: 0.012 }),
  }
}
