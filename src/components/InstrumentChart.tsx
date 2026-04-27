import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import type { OhlcvBar } from '../api/types'

function chartColors() {
  const cs = getComputedStyle(document.documentElement)
  return {
    bg: (cs.getPropertyValue('--chart-bg').trim() || '#131722') as string,
    text: (cs.getPropertyValue('--text-muted').trim() || '#787b86') as string,
    grid: (cs.getPropertyValue('--chart-grid').trim() || '#363a45') as string,
    up: '#089981',
    down: '#f23645',
  }
}

type Props = {
  bars: OhlcvBar[]
}

export default function InstrumentChart({ bars }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [themeTick, setThemeTick] = useState(0)

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick((n) => n + 1))
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const colors = chartColors()
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: colors.bg },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      width: el.clientWidth,
      height: el.clientHeight,
      timeScale: { borderColor: colors.grid },
      rightPriceScale: { borderColor: colors.grid },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: colors.up,
      downColor: colors.down,
      borderVisible: false,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
    })

    const data: CandlestickData<UTCTimestamp>[] = bars.map((b) => ({
      time: Math.floor(new Date(b.time).getTime() / 1000) as UTCTimestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }))
    series.setData(data)
    if (data.length > 0) {
      chart.timeScale().fitContent()
    }

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight })
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [bars, themeTick])

  return <div ref={containerRef} className="chart-panel" />
}
