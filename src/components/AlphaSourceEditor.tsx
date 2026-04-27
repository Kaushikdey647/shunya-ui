import Editor, { useMonaco } from '@monaco-editor/react'
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
    <div
      className="alpha-source-editor"
      style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}
    >
      <Editor
        height={height}
        defaultLanguage="python"
        theme="vs-dark"
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
    </div>
  )
}
