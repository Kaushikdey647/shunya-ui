import { useEffect, useMemo, useRef } from 'react'
import type { InstrumentTickerNewsItem } from '../api/types'
import { snapNewsToBarTime } from '../utils/chartBarTimes'

function formatNewsWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

function snappedBarUtc(item: InstrumentTickerNewsItem, barTimes: number[]): number | null {
  if (!item.published_at || barTimes.length === 0) return null
  const ts = Math.floor(new Date(item.published_at).getTime() / 1000)
  if (!Number.isFinite(ts)) return null
  return snapNewsToBarTime(ts, barTimes)
}

type Props = {
  news: InstrumentTickerNewsItem[]
  barTimes: number[]
  focusBarUnix: number | null
}

export default function InstrumentContextFeed({ news, barTimes, focusBarUnix }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const sorted = useMemo(() => {
    return [...news].sort((a, b) => {
      const ta = a.published_at ? Date.parse(a.published_at) : 0
      const tb = b.published_at ? Date.parse(b.published_at) : 0
      return ta - tb
    })
  }, [news])

  useEffect(() => {
    if (focusBarUnix == null || !scrollRef.current) return
    const el = scrollRef.current.querySelector(`[data-snapped-bar="${focusBarUnix}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusBarUnix])

  return (
    <aside className="instrument-split-feed" aria-label="Context feed">
      <h2 className="instrument-feed-heading">Context</h2>
      <p className="muted small" style={{ marginBottom: '0.65rem' }}>
        News on the price timeline. Move the crosshair on the chart to scroll matching items.
      </p>
      <div ref={scrollRef} className="instrument-feed-scroll">
        {sorted.length === 0 ? (
          <p className="muted">No news for this symbol.</p>
        ) : (
          sorted.map((item, i) => {
            const barU = snappedBarUtc(item, barTimes)
            const focused = barU != null && focusBarUnix != null && barU === focusBarUnix
            const href = item.link?.trim()
              ? item.link.trim()
              : undefined
            return (
              <article
                key={`${item.title}-${String(item.story_id ?? i)}`}
                className={`instrument-feed-item${focused ? ' instrument-feed-item-focused' : ''}`}
                data-snapped-bar={barU ?? undefined}
              >
                {item.published_at && (
                  <time className="instrument-feed-time tabular-nums" dateTime={item.published_at}>
                    {formatNewsWhen(item.published_at)}
                  </time>
                )}
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="instrument-feed-title-link"
                  >
                    {item.title}
                  </a>
                ) : (
                  <span className="instrument-feed-title">{item.title}</span>
                )}
                {item.publisher?.trim() && (
                  <div className="instrument-feed-meta muted small">{item.publisher.trim()}</div>
                )}
                {item.summary?.trim() && (
                  <p className="instrument-feed-summary muted small">{item.summary.trim()}</p>
                )}
              </article>
            )
          })
        )}
      </div>
    </aside>
  )
}
