declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number
    angle?: number
    spread?: number
    startVelocity?: number
    decay?: number
    gravity?: number
    drift?: number
    ticks?: number
    origin?: { x?: number; y?: number }
    colors?: string[]
    shapes?: (Shape | 'square' | 'circle')[]
    scalar?: number
    zIndex?: number
    disableForReducedMotion?: boolean
  }

  type Shape = {
    type: 'path' | 'bitmap' | 'text'
    [key: string]: unknown
  }

  interface ConfettiFunction {
    (options?: ConfettiOptions): Promise<null> | null
    reset: () => void
    create: (
      canvas?: HTMLCanvasElement | null,
      globalOptions?: { resize?: boolean; useWorker?: boolean }
    ) => ConfettiFunction
    shapeFromText: (options: { text: string; scalar?: number; color?: string; fontFamily?: string }) => Shape
    shapeFromPath: (options: { path: string; matrix?: number[] }) => Shape
  }

  namespace confetti {
    type Shape = {
      type: 'path' | 'bitmap' | 'text'
      [key: string]: unknown
    }
  }

  const confetti: ConfettiFunction
  export default confetti
}
