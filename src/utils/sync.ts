// リモート共有データ（Cloudflare Workers + KV）とのやり取り。
// KV未設定（503）やネットワークエラー時は例外を投げず null を返し、
// 呼び出し側が LocalStorage 単独動作へ静かにフォールバックできるようにする。

export type SyncStatus = 'off' | 'idle' | 'saving' | 'error'

export interface RemoteRecord {
  data: unknown | null
  updatedAt: string | null
  updatedBy: string | null
}

export async function fetchRemoteMeta(): Promise<{ updatedAt: string | null; updatedBy: string | null } | null> {
  try {
    const res = await fetch('/api/meta', { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const body = (await res.json()) as { updatedAt?: string | null; updatedBy?: string | null }
    return { updatedAt: body.updatedAt ?? null, updatedBy: body.updatedBy ?? null }
  } catch {
    return null
  }
}

export async function fetchRemoteData(): Promise<RemoteRecord | null> {
  try {
    const res = await fetch('/api/data', { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const body = (await res.json()) as Partial<RemoteRecord>
    return {
      data: body.data ?? null,
      updatedAt: body.updatedAt ?? null,
      updatedBy: body.updatedBy ?? null,
    }
  } catch {
    return null
  }
}

export async function pushRemoteData(data: unknown, updatedBy: string): Promise<string | null> {
  try {
    const res = await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, updatedBy }),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { updatedAt?: string | null }
    return body.updatedAt ?? null
  } catch {
    return null
  }
}
