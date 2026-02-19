"use client"

interface MiniSparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
  gradient?: boolean
  className?: string
}

export function MiniSparkline({
  data,
  color = "#6366f1",
  width = 120,
  height = 32,
  gradient = false,
  className,
}: MiniSparklineProps) {
  if (data.length < 2) return null

  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const padding = 2

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = padding + (height - padding * 2) - ((v - min) / range) * (height - padding * 2)
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ")

  const gradientId = `spark-grad-${color.replace("#", "")}`
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`

  return (
    <svg width={width} height={height} className={className}>
      {gradient && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {gradient && (
        <path d={areaPath} fill={`url(#${gradientId})`} />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
