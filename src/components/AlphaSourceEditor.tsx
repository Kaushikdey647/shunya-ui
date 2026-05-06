import Editor, { useMonaco } from '@monaco-editor/react'
import { Paper, useComputedColorScheme } from '@mantine/core'
import { useEffect, useRef } from 'react'
import { registerAlphaCompletions } from '../alphaEditor/completions'

type Props = {
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
  /** Editor height, e.g. 58vh */
  height?: string
}

export default function AlphaSourceEditor({
  value,
  onChange,
  readOnly = false,
  height = '58vh',
}: Props) {
  const monaco = useMonaco()
  const regRef = useRef<{ dispose: () => void } | null>(null)
  const colorScheme = useComputedColorScheme('light')
  const editorTheme = colorScheme === 'dark' ? 'vs-dark' : 'light'

  useEffect(() => {
    if (!monaco) return
    regRef.current?.dispose()
    regRef.current = registerAlphaCompletions(monaco)
    return () => {
      regRef.current?.dispose()
      regRef.current = null
    }
  }, [monaco])

  return (
    <Paper p={0} radius="sm" withBorder style={{ overflow: 'hidden' }}>
      <Editor
        key={editorTheme}
        height={height}
        defaultLanguage="python"
        theme={editorTheme}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        options={{
          readOnly,
          fontSize: 14,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 4,
        }}
      />
    </Paper>
  )
}
