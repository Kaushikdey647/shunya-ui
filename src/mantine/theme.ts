import { createTheme, type MantineColorsTuple } from '@mantine/core'

/** Brand yellow scale (10 shades): light tints → rich gold for CTAs in light mode. */
const yellowBrand: MantineColorsTuple = [
  '#fffbeb',
  '#fff3c4',
  '#ffe89a',
  '#ffdc6f',
  '#f5cf45',
  '#e6bd20',
  '#c9a017',
  '#a57f0f',
  '#7a5c0a',
  '#4d3805',
]

/**
 * Warm neutral dark scale (no blue-gray): Mantine indexes 0 = lightest … 9 = darkest.
 * Used for surfaces and borders in dark mode.
 */
const warmDark: MantineColorsTuple = [
  '#f4f2ef',
  '#ddd9d4',
  '#c4bfba',
  '#a9a39d',
  '#8f8983',
  '#6f6a65',
  '#514d49',
  '#3a3633',
  '#252321',
  '#141312',
]

export const shunyaMantineTheme = createTheme({
  primaryColor: 'yellow',
  colors: {
    yellow: yellowBrand,
    dark: warmDark,
  },
  primaryShade: { light: 6, dark: 4 },
  defaultRadius: 'sm',
  fontFamily:
    "system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontFamilyMonospace: "ui-monospace, 'SF Mono', Consolas, monospace",
  defaultGradient: {
    from: 'yellow.4',
    to: 'yellow.7',
    deg: 120,
  },
  /** Softer page chrome in dark mode (warm black). */
  other: {
    darkPageBg: '#141312',
    darkPanelBg: '#1c1a18',
    darkBorder: '#3a3633',
  },
  components: {
    Button: {
      defaultProps: {
        variant: 'filled',
      },
    },
    NavLink: {
      defaultProps: {
        variant: 'subtle',
      },
    },
    Card: {
      defaultProps: {
        withBorder: true,
        padding: 'md',
        radius: 'md',
      },
    },
    Table: {
      defaultProps: {
        striped: true,
        highlightOnHover: true,
        verticalSpacing: 'xs',
        horizontalSpacing: 'sm',
      },
    },
    Anchor: {
      defaultProps: {
        c: 'dimmed',
        underline: 'hover',
      },
    },
  },
})
