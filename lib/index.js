// dsh-effort-slider —— host half
// ============================================================================
// 一个“鲸鱼挂件式”的 DSH 宿主插件（无需客户端打包管线）：
//   * 在 Web 界面 HTML 里注入 /dsh-effort-slider/widget.js（美丽的思考强度滑块）；
//   * 暴露两个同源 JSON 接口：
//       GET  /dsh-effort-slider/state.json   读取当前(默认)模型选择 + 推理档位元数据
//       POST /dsh-effort-slider/apply.json   把滑块档位写进 DSH
//   * 写入语义与 Web 端“模型座位”选择完全一致：
//       1) sessionController.selectModel({ sessionId, provider, model, reasoningEffort })
//          —— 会话级生效(下一轮提问起用)，可带可选 sessionId；
//       2) 总是把同一选择持久化为默认模型(agent-default-model settings 命名空间)
//          —— 新会话/未单独指定模型的会话都继承该档位。
// 任何服务缺失或调用失败都不会让页面崩掉：全部 try/catch，回落为“仅写默认”。
// ============================================================================

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

let WIDGET_JS = null
function widgetSource() {
  if (WIDGET_JS === null) {
    try {
      WIDGET_JS = fs.readFileSync(path.join(PACKAGE_ROOT, 'web', 'widget.js'), 'utf8')
    } catch (error) {
      console.error('[effort-slider] failed to read web/widget.js:', String((error && error.message) || error))
      WIDGET_JS = ''
    }
  }
  return WIDGET_JS
}

export const name = 'effort-slider'
export const inject = ['webServer']

/** DSH 推理强度档位顺序（与 @deepseek-ai/dsh-llm 的 ReasoningEffortId 一致）。 */
const LEVEL_ORDER = ['off', 'low', 'high', 'max']
/** 档位展示名/说明：modelCatalog 缺席时的兜底。 */
const FALLBACK_LEVELS = [
  { id: 'off', name: 'Off', description: '关闭思考，适合无需推理的简单任务。' },
  { id: 'low', name: 'Low', description: '日常、对延迟敏感的任务优先。' },
  { id: 'high', name: 'High', description: '大多数任务默认的平衡档。' },
  { id: 'max', name: 'Max', description: '最难、质量优先的任务再上这一档。' },
]
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,119}$/

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
}

function normalizeLevel(value) {
  return LEVEL_ORDER.includes(value) ? value : null
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let settled = false
    req.on('data', (c) => {
      if (settled) return // oversize already reported; keep draining, never destroy
      size += c.length
      if (size > 16384) {
        settled = true
        reject(new Error('body too large'))
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (!settled) {
        settled = true
        resolve(Buffer.concat(chunks).toString('utf8'))
      }
    })
    req.on('error', (error) => {
      if (!settled) {
        settled = true
        reject(error)
      }
    })
  })
}

function sendJson(res, status, payload) {
  res.writeHead(status, JSON_HEADERS)
  res.end(JSON.stringify(payload))
}

/** 从 host 取默认模型选择服务（懒解析，缺失返回 null）。 */
function defaultModelService(ctx) {
  try {
    const svc = ctx.get('agentDefaultModel')
    return svc && typeof svc.currentSelection === 'function' ? svc : null
  } catch {
    return null
  }
}

/** 读当前默认模型选择 {provider, model, reasoningEffort?}，读不到返回 null。 */
async function readDefaultSelection(ctx) {
  const svc = defaultModelService(ctx)
  if (svc) {
    try {
      const sel = svc.currentSelection()
      if (sel && typeof sel.provider === 'string' && typeof sel.model === 'string') return sel
    } catch (error) {
      ctx.logger?.warn?.(`[effort-slider] read default selection failed: ${String((error && error.message) || error)}`)
    }
  }
  // 兜底：直接读 settings 命名空间。
  try {
    const settings = ctx.get('settings')
    const section = settings && typeof settings.read === 'function' ? await settings.read('agent-default-model') : null
    if (section && typeof section.provider === 'string' && typeof section.model === 'string') return section
  } catch {
    /* ignore */
  }
  return null
}

/** 持久化默认模型选择：优先服务，其次 settings 命名空间。 */
async function saveDefaultSelection(ctx, provider, model, effort) {
  const sel = { provider, model }
  if (effort != null) sel.reasoningEffort = String(effort)
  const svc = defaultModelService(ctx)
  if (svc && typeof svc.saveSelection === 'function') {
    try {
      await svc.saveSelection(sel)
      return { via: 'service' }
    } catch (error) {
      ctx.logger?.warn?.(`[effort-slider] default save via service failed: ${String((error && error.message) || error)}`)
    }
  }
  const settings = ctx.get('settings')
  if (settings && typeof settings.replace === 'function') {
    await settings.replace('agent-default-model', {
      provider,
      model,
      ...(effort == null ? {} : { reasoningEffort: String(effort) }),
    })
    return { via: 'settings' }
  }
  throw new Error('no settings backend to persist the default model selection')
}

/** 从 sessionController.modelCatalog() 找当前 (provider, model) 的推理元数据。 */
async function findCapability(ctx, provider, model) {
  if (!provider || !model) return null
  try {
    const sc = ctx.get('sessionController')
    if (!sc || typeof sc.modelCatalog !== 'function') return null
    const catalog = await sc.modelCatalog()
    const groups = Array.isArray(catalog?.groups) ? catalog.groups : []
    for (const group of groups) {
      if (group.id !== provider || !Array.isArray(group.models)) continue
      const entry = group.models.find((m) => m && m.id === model)
      if (entry && entry.reasoning) {
        const efforts = Array.isArray(entry.reasoning.efforts)
          ? entry.reasoning.efforts.map((e) => ({ id: e.id, name: e.name, description: e.description }))
          : null
        if (efforts && efforts.length > 0) return { efforts, defaultEffort: entry.reasoning.defaultEffort }
      }
    }
  } catch (error) {
    ctx.logger?.warn?.(`[effort-slider] modelCatalog lookup failed: ${String((error && error.message) || error)}`)
  }
  return null
}

/** 可测试的内部构建器：不依赖 ctx.webServer，由 apply() 装配路由。 */
export function createEffortSlider(server, ctx) {
  // 最近一次“已应用到会话”的记忆（仅用于 UI 展示，不参与自动目标选择）。
  let appliedPending = null // { sessionId, level, ts }

  async function statePayload() {
    const def = await readDefaultSelection(ctx)
    const provider = def?.provider ?? null
    const model = def?.model ?? null
    const current = def
      ? { provider, model, ...(def.reasoningEffort == null ? {} : { reasoningEffort: String(def.reasoningEffort) }), source: 'default' }
      : { provider: null, model: null, source: 'none' }
    // 若最近刚对某会话应用过且仍较新，把展示值标为该会话档位。
    if (appliedPending && Date.now() - appliedPending.ts < 10 * 60 * 1000) {
      current.source = 'session'
      current.pending = true
      current.sessionId = appliedPending.sessionId
      current.reasoningEffort = appliedPending.level
    }
    const capability = await findCapability(ctx, provider, model)
    return {
      ok: true,
      current,
      capability: capability || { efforts: FALLBACK_LEVELS, defaultEffort: 'high' },
    }
  }

  /** 档位 id -> {provider, model, reasoningEffort} 应用到“当前会话 + 默认”。 */
  async function applyLevel(level, sessionId) {
    const normalized = normalizeLevel(level)
    if (normalized === null) return { ok: false, error: `unsupported level: ${String(level)}` }
    if (sessionId != null && (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId))) {
      return { ok: false, error: 'invalid sessionId' }
    }
    const def = await readDefaultSelection(ctx)
    if (!def) return { ok: false, error: 'no default model selection available on this deployment' }

    const result = { ok: true, level: normalized, provider: def.provider, model: def.model, appliedTo: 'default', sessionId: null }
    if (sessionId) {
      try {
        const sc = ctx.get('sessionController')
        if (sc && typeof sc.selectModel === 'function') {
          const request = {
            sessionId,
            provider: def.provider,
            model: def.model,
            reasoningEffort: normalized,
          }
          const value = await sc.selectModel(request)
          result.appliedTo = 'session'
          result.sessionId = sessionId
          appliedPending = { sessionId, level: normalized, ts: Date.now() }
          // selectModel 内部已保存默认；若它没保存成功我们再补一刀。
          if (!value) {
            try {
              await saveDefaultSelection(ctx, def.provider, def.model, normalized)
            } catch (error) {
              result.defaultSaved = false
              result.defaultError = String((error && error.message) || error)
            }
          }
        } else {
          throw new Error('sessionController.selectModel unavailable')
        }
      } catch (error) {
        ctx.logger?.warn?.(`[effort-slider] session-scoped apply failed (${String((error && error.message) || error)}) → default only`)
        result.appliedTo = 'default-only'
      }
    }
    if (result.appliedTo !== 'session') {
      try {
        await saveDefaultSelection(ctx, def.provider, def.model, normalized)
        result.defaultSaved = true
      } catch (error) {
        result.ok = false
        result.error = String((error && error.message) || error)
      }
    }
    return result
  }

  server.register({
    kind: 'exact',
    path: '/dsh-effort-slider/widget.js',
    handler: (req, res) => {
      const source = widgetSource()
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Length': String(Buffer.byteLength(source, 'utf8')),
      })
      res.end(source)
    },
  })

  server.register({
    kind: 'exact',
    path: '/dsh-effort-slider/state.json',
    handler: async (req, res) => {
      try {
        sendJson(res, 200, await statePayload())
      } catch (error) {
        sendJson(res, 200, { ok: false, error: String((error && error.message) || error) })
      }
    },
  })

  server.register({
    kind: 'exact',
    path: '/dsh-effort-slider/apply.json',
    handler: async (req, res) => {
      try {
        if (req.method !== 'POST' && req.method !== 'PUT') {
          sendJson(res, 405, { ok: false, error: 'method not allowed; use POST' })
          return
        }
        const body = await readBody(req)
        let parsed = null
        try {
          parsed = JSON.parse(body)
        } catch {
          sendJson(res, 400, { ok: false, error: 'request body must be JSON' })
          return
        }
        const level = typeof parsed.level === 'string' ? parsed.level : parsed.reasoningEffort
        const sessionId = typeof parsed.sessionId === 'string' && parsed.sessionId.length > 0 ? parsed.sessionId : null
        sendJson(res, 200, await applyLevel(level, sessionId))
      } catch (error) {
        sendJson(res, 200, { ok: false, error: String((error && error.message) || error) })
      }
    },
  })

  return { statePayload, applyLevel }
}

export function apply(ctx) {
  const disposers = []
  const server = ctx.webServer

  createEffortSlider(server, ctx)

  disposers.push(
    server.tapIndex((html) => {
      if (html.indexOf('/dsh-effort-slider/widget.js') !== -1) return html
      const tag = '<script defer src="/dsh-effort-slider/widget.js"></script>'
      if (html.indexOf('</body>') !== -1) return html.replace('</body>', tag + '</body>')
      return html + tag
    }),
  )

  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {
        /* ignore */
      }
    }
  })
}
