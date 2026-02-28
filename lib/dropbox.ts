export function isDropboxUrl(value: string): boolean {
  return /^https?:\/\/(www\.)?dropbox\.com\//i.test(value)
}

export function toDropboxWebUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return 'https://www.dropbox.com/home'
  if (isDropboxUrl(pathOrUrl)) return pathOrUrl
  return `https://www.dropbox.com/home${pathOrUrl}`
}

function tryDecode(value: string): string {
  try { return decodeURIComponent(value) } catch { return value }
}

export function extractDropboxPath(pathOrUrl: string): string | null {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('/')) return pathOrUrl
  if (!isDropboxUrl(pathOrUrl)) return null

  try {
    const url = new URL(pathOrUrl)
    const path = url.pathname

    if (path.startsWith('/home/')) {
      const rest = tryDecode(path.slice('/home'.length))
      return rest.startsWith('/') ? rest : `/${rest}`
    }

    if (path.startsWith('/work/')) {
      const parts = path.split('/').filter(Boolean)
      if (parts.length >= 4) {
        // /work/<member>/<team>/<...real-path>
        const real = parts.slice(3).map(tryDecode).join('/')
        return real ? `/${real}` : null
      }
    }

    return null
  } catch {
    return null
  }
}

export function isDropboxSharedLink(value: string): boolean {
  if (!isDropboxUrl(value)) return false
  try {
    const path = new URL(value).pathname
    return path.startsWith('/s/') || path.startsWith('/scl/')
  } catch {
    return false
  }
}
