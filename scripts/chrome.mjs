/**
 * A minimal headless-Chrome driver over the DevTools protocol, shared by the
 * asset scripts. No Puppeteer: Node's built-in WebSocket and fetch are enough.
 *
 * Headless Chrome on some macOS setups exits by itself about 30 s after launch,
 * so callers should start a fresh session per phase of work rather than keep
 * one open.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * @param {{ binary?: string, width?: number, height?: number, verbose?: boolean }} options
 */
export async function launchChrome({ binary = DEFAULT_CHROME, width = 1280, height = 800, verbose = false } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'json-pilot-chrome-'))
  const port = 9400 + Math.floor(Math.random() * 400)
  const chrome = spawn(
    binary,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      // Video encoding runs in real time; a throttled timer would stretch it.
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: verbose ? ['ignore', 'ignore', 'pipe'] : 'ignore' },
  )
  chrome.on('exit', (code, signal) => verbose && console.log(`  · chrome exited (${code ?? signal})`))
  chrome.stderr?.on('data', (chunk) => {
    const text = String(chunk)
    if (/FATAL|Check failed/.test(text)) console.log(`  · chrome: ${text.trim().slice(0, 300)}`)
  })

  let targets
  for (let attempt = 0; attempt < 100 && !targets; attempt++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
    } catch {
      await sleep(100)
    }
  }
  if (!targets) throw new Error('Chrome did not start — pass --chrome <path>')

  const socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))

  let nextId = 0
  const pending = new Map()
  const listeners = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`))
      else resolve(message.result)
    } else if (message.method) {
      listeners.get(message.method)?.(message.params)
    }
  })
  socket.addEventListener('close', () => {
    for (const { reject } of pending.values()) reject(new Error('Chrome closed the DevTools connection'))
    pending.clear()
  })

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      if (socket.readyState !== WebSocket.OPEN) {
        reject(new Error('Chrome is gone — it exits by itself about 30 s after launch'))
        return
      }
      nextId += 1
      pending.set(nextId, { resolve, reject })
      socket.send(JSON.stringify({ id: nextId, method, params }))
    })
  const on = (method, handler) => listeners.set(method, handler)
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
    return result.value
  }
  const close = async () => {
    socket.close()
    const exited = new Promise((resolve) => chrome.once('exit', resolve))
    if (chrome.exitCode === null) chrome.kill()
    await exited
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }

  return { send, on, evaluate, close }
}
