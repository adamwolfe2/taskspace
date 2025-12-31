import confetti from "canvas-confetti"

// Basic confetti burst
export function fireConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  })
}

// Celebration confetti for major achievements
export function fireCelebration() {
  const duration = 3000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    })
  }, 250)
}

// Fire emoji for streak achievements
export function fireStreakConfetti() {
  const scalar = 2
  const fire = confetti.shapeFromText({ text: "🔥", scalar })

  confetti({
    shapes: [fire],
    scalar,
    particleCount: 30,
    spread: 80,
    origin: { y: 0.6 },
    gravity: 0.8,
    decay: 0.94,
  })
}

// Star confetti for task completions
export function fireStarConfetti() {
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 20,
    shapes: ["star"] as confetti.Shape[],
    colors: ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"],
  }

  function shoot() {
    confetti({
      ...defaults,
      particleCount: 20,
      scalar: 1.2,
    })

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
    })
  }

  setTimeout(shoot, 0)
  setTimeout(shoot, 100)
  setTimeout(shoot, 200)
}

// Trophy confetti for rock completions
export function fireTrophyConfetti() {
  const scalar = 2
  const trophy = confetti.shapeFromText({ text: "🏆", scalar })

  const defaults = {
    shapes: [trophy],
    scalar,
    particleCount: 15,
    spread: 50,
    gravity: 0.6,
    decay: 0.91,
  }

  confetti({
    ...defaults,
    origin: { x: 0.3, y: 0.5 },
  })

  confetti({
    ...defaults,
    origin: { x: 0.7, y: 0.5 },
  })
}

// Side cannons for special achievements
export function fireSideCannons() {
  const end = Date.now() + 1000

  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]

  function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}

// Confetti with custom emojis
export function fireEmojiConfetti(emoji: string, count = 20) {
  const scalar = 2
  const shape = confetti.shapeFromText({ text: emoji, scalar })

  confetti({
    shapes: [shape],
    scalar,
    particleCount: count,
    spread: 100,
    origin: { y: 0.6 },
    gravity: 0.8,
    decay: 0.94,
  })
}

// Subtle confetti for minor achievements
export function fireSubtleConfetti() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    gravity: 1.2,
    decay: 0.95,
    startVelocity: 15,
  })
}

// Confetti handler based on event type
export function triggerConfetti(
  eventType: "task_complete" | "rock_complete" | "streak" | "achievement" | "celebration"
) {
  switch (eventType) {
    case "task_complete":
      fireSubtleConfetti()
      break
    case "rock_complete":
      fireTrophyConfetti()
      break
    case "streak":
      fireStreakConfetti()
      break
    case "achievement":
      fireStarConfetti()
      break
    case "celebration":
      fireCelebration()
      break
  }
}
