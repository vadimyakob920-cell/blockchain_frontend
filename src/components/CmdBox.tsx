import { useState } from 'react'
import type { ClipboardEvent } from 'react'

function buildClipboardText(value: string, copyPrefix: string, selectedText?: string): string {
  const copied = selectedText || value
  return copyPrefix ? `${copyPrefix}${copied}` : copied
}

type CmdBoxProps = {
  value: string
  copyPrefix?: string
}

export default function CmdBox({ value, copyPrefix = '' }: CmdBoxProps) {
  const [copied, setCopied] = useState(false)

  async function writeToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  async function handleCopy() {
    await writeToClipboard(buildClipboardText(value, copyPrefix))
  }

  function handleNativeCopy(event: ClipboardEvent<HTMLPreElement>) {
    event.preventDefault()
    const selectedText = window.getSelection()?.toString() ?? ''
    const text = buildClipboardText(value, copyPrefix, selectedText)
    event.clipboardData.setData('text/plain', text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="cmd-box">
      <button type="button" onClick={handleCopy} className="cmd-box-copy">
        {copied ? 'Copied ✓' : 'Copy'}
      </button>

      <pre className="cmd-box-pre" onCopy={handleNativeCopy}>
        <code>{value}</code>
      </pre>
    </div>
  )
}
