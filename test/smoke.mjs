// Smoke test for dsh-effort-slider host half (no GUI required).
// Stubs cordis ctx + webServer, mounts apply(), and drives the JSON routes.
import assert from 'node:assert'
import { apply } from '../lib/index.js'

function makeReq(method, url, body) {
  const handlers = {}
  return {
    method,
    url,
    on(event, fn) {
      handlers[event] = fn
      return this
    },
    _deliver() {
      if (body != null) {
        const chunk = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body))
        handlers.data?.(chunk)
      }
      handlers.end?.()
    },
    destroy() {},
  }
}

function makeRes() {
  const calls = []
  return {
    writeHead(status, headers) {
      calls.push(['head', status, headers])
    },
    end(payload) {
      calls.push(['end', payload])
    },
    get body() {
      const item = calls.find(([kind]) => kind === 'end')
      return item ? item[1] : null
    },
    get status() {
      const item = calls.find(([kind]) => kind === 'head')
      return item ? item[1] : null
    },
    get headers() {
      const item = calls.find(([kind]) => kind === 'head')
      return item ? item[2] : null
    },
  }
}

function makeCtx() {
  const calls = { selectModel: [], saveDefault: [], settingsReplace: [] }
  const agentDefaultModel = {
    currentSelection: () => ({ provider: 'deepseek', model: 'deepseek-v4-flash' }),
    async saveSelection(sel) {
      calls.saveDefault.push(sel)
    },
  }
  const settings = {
    async read() {
      return null
    },
    async replace(namespace, value) {
      assert.equal(namespace, 'agent-default-model')
      calls.settingsReplace.push(value)
    },
  }
  const sessionController = {
    async selectModel(request) {
      calls.selectModel.push(request)
      return { selected: { ...request } }
    },
    async modelCatalog() {
      return {
        groups: [
          {
            id: 'deepseek',
            models: [
              {
                id: 'deepseek-v4-flash',
                reasoning: {
                  defaultEffort: 'high',
                  efforts: [
                    { id: 'off', name: 'Off', description: 'x' },
                    { id: 'low', name: 'Low', description: 'x' },
                    { id: 'high', name: 'High', description: 'x' },
                    { id: 'max', name: 'Max', description: 'x' },
                  ],
                },
              },
            ],
          },
        ],
      }
    },
  }
  const services = { agentDefaultModel, settings, sessionController }
  const routes = []
  const tappers = []
  const ctx = {
    webServer: {
      register(entry) {
        routes.push(entry)
      },
      tapIndex(fn) {
        tappers.push(fn)
      },
    },
    get(name) {
      if (services[name]) return services[name]
      return undefined
    },
    logger: { warn: () => {}, error: () => {} },
    effect(fn) {
      ctx._dispose = fn
    },
  }
  return { ctx, calls, routes, tappers, services }
}

function routeByPath(routes, path) {
  const found = routes.find((r) => r.path === path)
  assert.ok(found, `route ${path} not registered`)
  return found.handler
}

async function callJson(handler, method, body) {
  const req = makeReq(method, '/x', body)
  const res = makeRes()
  // start the handler first (its sync prefix attaches body listeners), then
  // deliver the request body, then settle on the handler promise.
  const pending = handler(req, res)
  req._deliver()
  await pending
  return res
}

// ---- mount ---------------------------------------------------------------
const { ctx, calls, routes, tappers } = makeCtx()
apply(ctx)

const widgetRoute = routeByPath(routes, '/dsh-effort-slider/widget.js')
const stateRoute = routeByPath(routes, '/dsh-effort-slider/state.json')
const applyRoute = routeByPath(routes, '/dsh-effort-slider/apply.json')

// widget route serves js
{
  const res = makeRes()
  widgetRoute({}, res)
  assert.ok(String(res.body).includes('__dshEffortSlider'), 'widget.js should ship the browser script')
  assert.ok(String(res.body).trimEnd().endsWith('})()'), 'widget.js must be delivered whole (closing IIFE present)')
  const declared = Number(res.headers['Content-Length'])
  assert.ok(Number.isFinite(declared) && declared === Buffer.byteLength(res.body, 'utf8'), 'Content-Length must be UTF-8 byte length')
}

// index tap injects once
{
  const html = '<html><body>app</body></html>'
  const next = tappers.reduce((h, fn) => fn(h), html)
  assert.ok(next.includes('/dsh-effort-slider/widget.js'), 'index should reference widget.js')
  const again = tappers.reduce((h, fn) => fn(h), next)
  assert.equal(again, next, 'no double injection')
}

// state.json reflects default selection + capability
{
  const res = await callJson(stateRoute, 'GET')
  const data = JSON.parse(res.body)
  assert.equal(res.status, 200)
  assert.equal(data.ok, true)
  assert.equal(data.current.provider, 'deepseek')
  assert.equal(data.current.model, 'deepseek-v4-flash')
  assert.equal(data.current.reasoningEffort, undefined)
  assert.equal(data.capability.efforts.length, 4)
  assert.equal(data.capability.efforts[3].id, 'max')
  assert.equal(data.capability.defaultEffort, 'high')
}

// apply route rejects GET
{
  const res = await callJson(applyRoute, 'GET')
  assert.equal(res.status, 405)
  assert.equal(JSON.parse(res.body).ok, false)
}

// apply without sessionId → default only, sessionController untouched
{
  const res = await callJson(applyRoute, 'POST', { level: 'high' })
  const data = JSON.parse(res.body)
  assert.equal(res.status, 200)
  assert.equal(data.ok, true)
  assert.equal(data.appliedTo, 'default')
  assert.equal(data.sessionId, null)
  assert.equal(calls.saveDefault.length, 1)
  assert.deepEqual(calls.saveDefault[0], { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'high' })
  assert.equal(calls.selectModel.length, 0)
}

// apply with sessionId → session selectModel mirrors seat semantics
{
  const res = await callJson(applyRoute, 'POST', { level: 'max', sessionId: 'session-abc-123' })
  const data = JSON.parse(res.body)
  assert.equal(res.status, 200)
  assert.equal(data.ok, true)
  assert.equal(data.appliedTo, 'session')
  assert.equal(data.sessionId, 'session-abc-123')
  assert.equal(calls.selectModel.length, 1)
  assert.deepEqual(calls.selectModel[0], {
    sessionId: 'session-abc-123',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    reasoningEffort: 'max',
  })
}

// state.json now shows the pending session-scoped level
{
  const res = await callJson(stateRoute, 'GET')
  const data = JSON.parse(res.body)
  assert.equal(data.current.source, 'session')
  assert.equal(data.current.reasoningEffort, 'max')
  assert.equal(data.current.sessionId, 'session-abc-123')
}

// invalid level rejected, invalid session id rejected
{
  const badLevel = JSON.parse((await callJson(applyRoute, 'POST', { level: 'ultra' })).body)
  assert.equal(badLevel.ok, false)
  const badSession = JSON.parse((await callJson(applyRoute, 'POST', { level: 'high', sessionId: '../etc/passwd' })).body)
  assert.equal(badSession.ok, false)
  assert.match(badSession.error, /invalid sessionId/)
}

// missing sessionController → graceful default-only apply
{
  const { ctx: ctx2, calls: calls2, routes: routes2, services: services2 } = makeCtx()
  delete services2.sessionController
  apply(ctx2)
  const applyRoute2 = routes2.find((r) => r.path === '/dsh-effort-slider/apply.json')
  const res = await callJson(applyRoute2.handler, 'POST', { level: 'low', sessionId: 'session-xyz' })
  const data = JSON.parse(res.body)
  assert.equal(data.ok, true)
  assert.equal(data.appliedTo, 'default-only')
  assert.equal(calls2.saveDefault.length, 1)
  assert.equal(calls2.saveDefault[0].reasoningEffort, 'low')
}

// dispose hook exists
assert.equal(typeof ctx._dispose, 'function')
ctx._dispose()

console.log('smoke ok ✔')

