import type * as Monaco from 'monaco-editor'

type CompletionWithoutRange = Omit<Monaco.languages.CompletionItem, 'range'>

const buildItems = (m: typeof Monaco) => {
  const k = m.languages.CompletionItemKind
  const mk = (
    label: string,
    insertText: string,
    kind: Monaco.languages.CompletionItemKind,
    detail: string,
    doc?: string,
  ): CompletionWithoutRange => ({
    label,
    kind,
    insertText,
    detail,
    documentation: doc,
  })
  return [
    mk('ctx', 'ctx', k.Variable, 'AlphaContext: open, high, low, close, …'),
    mk('ctx.open', 'ctx.open', k.Property, 'AlphaSeries (OHLCV history)'),
    mk('ctx.high', 'ctx.high', k.Property, 'AlphaSeries'),
    mk('ctx.low', 'ctx.low', k.Property, 'AlphaSeries'),
    mk('ctx.close', 'ctx.close', k.Property, 'AlphaSeries'),
    mk('ctx.adj_volume', 'ctx.adj_volume', k.Property, 'AlphaSeries'),
    mk('ctx.n_tickers', 'ctx.n_tickers', k.Property, 'int'),
    mk('ctx.feature_names', 'ctx.feature_names', k.Property, 'tuple of extra feature names'),
    mk('ctx.ts', 'ctx.ts', k.Field, 'Time series ops: delay, mean, zscore, ...'),
    mk('ctx.ts.delay', 'ctx.ts.delay(x, lag)', k.Method, 'TimeSeriesOps.delay', 'TSDelay'),
    mk('ctx.ts.delta', 'ctx.ts.delta(x, lag)', k.Method, 'TimeSeriesOps.delta'),
    mk('ctx.ts.sum', 'ctx.ts.sum(x, window)', k.Method, 'Rolling sum'),
    mk('ctx.ts.mean', 'ctx.ts.mean(x, window)', k.Method, 'Rolling mean'),
    mk('ctx.ts.std', 'ctx.ts.std(x, window)', k.Method, 'Rolling stdev'),
    mk('ctx.ts.zscore', 'ctx.ts.zscore(x, window)', k.Method, 'Rolling z-score'),
    mk('ctx.ts.rank', 'ctx.ts.rank(x, window)', k.Method, 'Rolling cross-time rank (time-series op)'),
    mk(
      'ctx.ts.regression',
      'ctx.ts.regression(y, x, window, lag, retval)',
      k.Method,
      'TS regression; retval: b | a | r | t',
    ),
    mk('ctx.ts.humpdecay', 'ctx.ts.humpdecay(x, hump)', k.Method, 'Hump decay'),
    mk('ctx.cs', 'ctx.cs', k.Field, 'Cross-section ops on latest bar'),
    mk('ctx.cs.rank', 'ctx.cs.rank(x)', k.Method, 'CS rank of latest'),
    mk('ctx.cs.zscore', 'ctx.cs.zscore(x)', k.Method, 'CS z-score'),
    mk('ctx.cs.scale', 'ctx.cs.scale(x, target)', k.Method, 'Rescale to gross target'),
    mk('ctx.cs.sign', 'ctx.cs.sign(x)', k.Method, 'CS sign'),
    mk('ctx.cs.winsorize', 'ctx.cs.winsorize(x, tail)', k.Method, 'Winsorize'),
    mk('ctx.cs.neutralize_market', 'ctx.cs.neutralize_market(x)', k.Method, 'Market neutral'),
    mk(
      'ctx.cs.neutralize_groups',
      'ctx.cs.neutralize_groups(x, group_ids)',
      k.Method,
      'Group neutral (JAX array of group ids)',
    ),
    mk('ctx.feature', 'ctx.feature("name")', k.Method, 'Get named AlphaSeries feature'),
    mk('jnp', 'jnp', k.Module, 'jax.numpy'),
    mk('jnp.array', 'jnp.array(a)', k.Function, 'JAX array'),
    mk('jnp.zeros', 'jnp.zeros(shape)', k.Function, 'Zeros'),
    mk('jnp.ones', 'jnp.ones(shape)', k.Function, 'Ones'),
    mk('jnp.sqrt', 'jnp.sqrt(x)', k.Function, 'sqrt'),
    mk('jnp.log', 'jnp.log(x)', k.Function, 'log'),
    mk('jnp.exp', 'jnp.exp(x)', k.Function, 'exp'),
    mk('jnp.where', 'jnp.where(cond, x, y)', k.Function, 'where'),
    mk('jnp.abs', 'jnp.abs(x)', k.Function, 'abs'),
    mk('jnp.mean', 'jnp.mean(x)', k.Function, 'mean'),
    mk('jnp.std', 'jnp.std(x)', k.Function, 'std'),
  ]
}

export function registerAlphaCompletions(monaco: typeof import('monaco-editor')): {
  dispose: () => void
} {
  const suggestions = buildItems(monaco)
  const provider = monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }
      return {
        suggestions: suggestions.map((s) => ({
          ...s,
          range,
        })),
      }
    },
  })
  return provider
}
