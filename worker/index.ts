// Paigner 共有データ同期 Worker
//
// KV namespace (PAIGNER_KV) が未設定でもサイトが壊れないように設計している。
// バインディングが無い場合、/api/* は 503 { error: 'kv_unconfigured' } を返し、
// クライアント側は従来どおり LocalStorage 単独で動作する。

// @cloudflare/workers-types に依存せずビルドを通すための最小型定義
interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}
interface Fetcher {
  fetch(request: Request): Promise<Response>
}

export interface Env {
  PAIGNER_KV?: KVNamespace
  ASSETS: Fetcher
}

const KEY = 'paigner-shared-v1'

interface StoredRecord {
  data: unknown
  updatedAt: string
  updatedBy: string | null
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

async function readRecord(kv: KVNamespace): Promise<StoredRecord | null> {
  const raw = await kv.get(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredRecord
  } catch {
    // 壊れたJSONは未保存扱い（既存データを消さないため上書きはしない）
    return null
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // API 以外は静的アセット（SPA）へ委譲
    if (!path.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    const kv = env.PAIGNER_KV
    if (!kv) {
      return json({ error: 'kv_unconfigured' }, 503)
    }

    try {
      if (path === '/api/meta' && request.method === 'GET') {
        const rec = await readRecord(kv)
        return json({
          updatedAt: rec?.updatedAt ?? null,
          updatedBy: rec?.updatedBy ?? null,
        })
      }

      if (path === '/api/data' && request.method === 'GET') {
        const rec = await readRecord(kv)
        return json({
          data: rec?.data ?? null,
          updatedAt: rec?.updatedAt ?? null,
          updatedBy: rec?.updatedBy ?? null,
        })
      }

      if (path === '/api/data' && request.method === 'PUT') {
        const body = (await request.json()) as { data?: unknown; updatedBy?: string }
        if (body == null || typeof body !== 'object' || body.data === undefined || body.data === null) {
          return json({ error: 'invalid_body' }, 400)
        }
        const updatedAt = new Date().toISOString()
        const record: StoredRecord = {
          data: body.data,
          updatedAt,
          updatedBy: typeof body.updatedBy === 'string' ? body.updatedBy : null,
        }
        await kv.put(KEY, JSON.stringify(record))
        return json({ updatedAt })
      }

      return json({ error: 'not_found' }, 404)
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500)
    }
  },
}
