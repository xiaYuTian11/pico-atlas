/**
 * CDP 截图/巡检脚手架。
 *
 * 为什么需要它：内置截图工具无法设定视口，手机布局（390×844）验不了。
 * 这里直连 Chrome 的 DevTools WebSocket，用 Emulation 设设备尺寸，
 * 再按动作脚本点/等/截图，顺便收集 console 报错。
 *
 * 用法：
 *   node tools/shoot.mjs --url http://127.0.0.1:5273/ --w 390 --h 844 \
 *        --steps "[{\"t\":\"shot\",\"p\":\"assets/shots/home.png\"}]"
 *
 * 先看 /json/list 里有哪些页面（--list）。
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
}

const PORT = Number(arg('port', process.env.PA_CDP_PORT || 63547));
const URL_TO_OPEN = arg('url', 'http://127.0.0.1:5273/');
const W = Number(arg('w', 390));
const H = Number(arg('h', 844));
const DPR = Number(arg('dpr', 2));
const STEPS = JSON.parse(arg('steps', '[]'));
const KEEP_VIEWPORT = arg('keep', '0') === '1';

function getJSON(pathname) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: PORT, path: pathname }, (res) => {
        let b = '';
        res.on('data', (d) => (b += d));
        res.on('end', () => {
          try {
            resolve(JSON.parse(b));
          } catch {
            reject(new Error(`bad json from ${pathname}: ${b.slice(0, 200)}`));
          }
        });
      })
      .on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const targets = await getJSON('/json/list');
  if (args.includes('--list')) {
    console.log(
      JSON.stringify(
        targets.map((t) => ({ id: t.id, type: t.type, url: t.url })),
        null,
        2,
      ),
    );
    return;
  }
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('没有可用的 page target');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error('ws 连接失败'));
  });

  let seq = 0;
  const pending = new Map();
  const logs = [];

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.method || 'cmd'} ${JSON.stringify(msg.error)}`));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ');
      logs.push(`[console.${msg.params.type}] ${text}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(
        `[exception] ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`,
      );
    }
    if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry;
      if (e.level === 'error' || e.level === 'warning')
        logs.push(`[log.${e.level}] ${e.text} ${e.url ?? ''}`);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: W,
    height: H,
    deviceScaleFactor: DPR,
    mobile: true,
    screenWidth: W,
    screenHeight: H,
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  if (URL_TO_OPEN) {
    await send('Page.navigate', { url: URL_TO_OPEN });
    await sleep(1800);
  }

  for (const step of STEPS) {
    if (step.t === 'wait') {
      await sleep(step.ms ?? 300);
    } else if (step.t === 'eval') {
      const r = await send('Runtime.evaluate', {
        expression: step.js,
        awaitPromise: true,
        returnByValue: true,
      });
      const v = r.result?.value;
      if (step.print !== false) console.log(`eval ⇒ ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    } else if (step.t === 'shot') {
      const out = path.resolve(step.p);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const caps = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: !!step.full,
      });
      fs.writeFileSync(out, Buffer.from(caps.data, 'base64'));
      console.log(`shot ⇒ ${out}`);
    }
  }

  if (!KEEP_VIEWPORT) await send('Emulation.clearDeviceMetricsOverride').catch(() => {});
  const uniq = [...new Set(logs)];
  if (uniq.length) {
    console.log('\n--- 页面日志 ---');
    for (const l of uniq.slice(0, 60)) console.log(l);
  } else {
    console.log('\n--- 页面日志：无报错 ---');
  }
  ws.close();
}

main().catch((e) => {
  console.error('shoot failed:', e.message);
  process.exit(1);
});
