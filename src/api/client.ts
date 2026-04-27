const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

function detailMessage(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join('; ')
  }
  if (detail && typeof detail === 'object') {
    return JSON.stringify(detail)
  }
  return String(detail)
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function joinUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE
  return `${base}${p}`
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { parseJson?: boolean },
): Promise<T> {
  const { parseJson = true, ...rest } = init ?? {}
  const hasBody = rest.body != null && rest.body !== ''
  const headers = new Headers(rest.headers)
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(joinUrl(path), {
    ...rest,
    headers,
  })

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  let data: unknown
  if (text && parseJson) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = text
    }
  } else {
    data = text || null
  }

  if (!res.ok) {
    const detail =
      data && typeof data === 'object' && data !== null && 'detail' in data
        ? (data as { detail: unknown }).detail
        : data
    throw new ApiError(detailMessage(detail), res.status, data)
  }

  return data as T
}
