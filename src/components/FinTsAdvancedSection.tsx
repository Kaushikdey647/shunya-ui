import type { Dispatch, SetStateAction } from 'react'
import type { BarUnit, FeatureMode, MarketDataProvider, TradingAxisMode } from '../api/types'
import type { FinTsAdvancedState } from '../finTs/advancedState'

type Props = {
  state: FinTsAdvancedState
  setState: Dispatch<SetStateAction<FinTsAdvancedState>>
  /** Index backtests: OHLCV from Timescale only; no Yahoo classifications in-browser. */
  timescaleOnly?: boolean
  /** Server forces daily bars; hide bar_spec controls. */
  hideBarSpec?: boolean
}

export default function FinTsAdvancedSection({
  state,
  setState,
  timescaleOnly = false,
  hideBarSpec = false,
}: Props) {
  const a = state
  const set = setState

  return (
    <details className="advanced">
      <summary>Advanced (fin_ts)</summary>
      <div className="form-grid" style={{ marginTop: '0.75rem' }}>
        {!hideBarSpec && (
          <>
            <label className="row">
              <input
                type="checkbox"
                checked={a.useBarSpec}
                onChange={(e) =>
                  set((s) => ({ ...s, useBarSpec: e.target.checked }))
                }
              />
              Set bar_spec
            </label>
            {a.useBarSpec && (
              <>
                <label>
                  Bar unit
                  <select
                    value={a.barUnit}
                    onChange={(e) =>
                      set((s) => ({ ...s, barUnit: e.target.value as BarUnit }))
                    }
                  >
                    {(
                      [
                        'SECONDS',
                        'MINUTES',
                        'HOURS',
                        'DAYS',
                        'WEEKS',
                        'MONTHS',
                        'YEARS',
                      ] as BarUnit[]
                    ).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Bar step
                  <input
                    type="number"
                    min={1}
                    value={a.barStep}
                    onChange={(e) =>
                      set((s) => ({
                        ...s,
                        barStep: Number(e.target.value) || 1,
                      }))
                    }
                  />
                </label>
              </>
            )}
          </>
        )}
        {hideBarSpec && (
          <p className="muted" style={{ gridColumn: '1 / -1' }}>
            Bar cadence is fixed to <span className="mono">DAYS</span> step <span className="mono">1</span> for
            backtests.
          </p>
        )}
        {timescaleOnly ? (
          <p className="muted" style={{ gridColumn: '1 / -1' }}>
            Market data: Timescale only (index universe). Classifications load from DB when
            available.
          </p>
        ) : (
          <label>
            Market data provider
            <select
              value={a.marketDataProvider}
              onChange={(e) =>
                set((s) => ({
                  ...s,
                  marketDataProvider: e.target.value as MarketDataProvider,
                }))
              }
            >
              <option value="auto">auto</option>
              <option value="timescale">timescale</option>
              <option value="yfinance">yfinance</option>
            </select>
          </label>
        )}
        <label>
          Feature mode
          <select
            value={a.featureMode}
            onChange={(e) =>
              set((s) => ({
                ...s,
                featureMode: e.target.value as FeatureMode,
              }))
            }
          >
            <option value="full">full</option>
            <option value="ohlcv_only">ohlcv_only</option>
          </select>
        </label>
        <label>
          Trading axis mode
          <select
            value={a.tradingAxisMode}
            onChange={(e) =>
              set((s) => ({
                ...s,
                tradingAxisMode: e.target.value as TradingAxisMode,
              }))
            }
          >
            <option value="observed">observed</option>
            <option value="canonical">canonical</option>
          </select>
        </label>
        {!timescaleOnly && (
          <label className="row">
            <input
              type="checkbox"
              checked={a.attachYf}
              onChange={(e) =>
                set((s) => ({ ...s, attachYf: e.target.checked }))
              }
            />
            attach_yfinance_classifications
          </label>
        )}
        {!timescaleOnly && (
          <label className="row">
            <input
              type="checkbox"
              checked={a.attachFund}
              onChange={(e) =>
                set((s) => ({ ...s, attachFund: e.target.checked }))
              }
            />
            attach_fundamentals
          </label>
        )}
        <label className="row">
          <input
            type="checkbox"
            checked={a.strictTradingGrid}
            onChange={(e) =>
              set((s) => ({ ...s, strictTradingGrid: e.target.checked }))
            }
          />
          strict_trading_grid
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={a.strictProviderUniverse}
            onChange={(e) =>
              set((s) => ({ ...s, strictProviderUniverse: e.target.checked }))
            }
          />
          strict_provider_universe
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={a.strictOhlcv}
            onChange={(e) =>
              set((s) => ({ ...s, strictOhlcv: e.target.checked }))
            }
          />
          strict_ohlcv
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={a.strictEmpty}
            onChange={(e) =>
              set((s) => ({ ...s, strictEmpty: e.target.checked }))
            }
          />
          strict_empty
        </label>
        <label>
          require_history_bars (optional)
          <input
            type="number"
            min={1}
            value={a.requireHistoryBars}
            onChange={(e) =>
              set((s) => ({ ...s, requireHistoryBars: e.target.value }))
            }
            placeholder="empty = omit"
          />
        </label>
      </div>
    </details>
  )
}
