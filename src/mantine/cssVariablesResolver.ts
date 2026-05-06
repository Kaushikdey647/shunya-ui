import { defaultCssVariablesResolver, type MantineTheme } from '@mantine/core'

/** Near-black surfaces; default borders transparent so Card/Paper edges disappear in dark mode. */
export function shunyaCssVariablesResolver(theme: MantineTheme) {
  const base = defaultCssVariablesResolver(theme)
  return {
    ...base,
    dark: {
      ...base.dark,
      '--mantine-color-body': '#050504',
      '--mantine-color-default': '#080807',
      '--mantine-color-default-hover': '#0e0d0c',
      '--mantine-color-default-border': 'transparent',
    },
  }
}
