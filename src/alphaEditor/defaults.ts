/** Shown for new alphas and as a template when a row is module-only. */
export const DEFAULT_ALPHA_SOURCE = `import jax.numpy as jnp

def alpha(ctx) -> jnp.ndarray:
    return ctx.cs.rank(ctx.close)
`
