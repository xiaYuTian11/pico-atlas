// 全站巡检：首页 → 每个入口 → 每个分区 → 每张卡片，记录控制台报错与 404。
// 用法：node tools/walkthrough.mjs
const CDP = 'http://127.0.0.1:9222';
const APP = 'http://127.0.0.1:5273';

const list = await (await fetch(`${CDP}/json/list`)).json();
const page = list.find((t) => t.type === 'page' && t.url.includes('5273')) ?? list.find((t) => t.type === 'page');
if (!page) throw new Error('没有可用的 page，先启动 headless chrome');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = () => rej(new Error('ws 连接失败'));
});

let seq = 0;
const pending = new Map();
const errors = [];
const notFound = [];

ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) rej(new Error(JSON.stringify(m.error)));
    else res(m.result);
    return;
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    errors.push('[exception] ' + (d.exception?.description ?? d.text));
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push('[console] ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  }
  if (m.method === 'Network.responseReceived') {
    const { url, status } = m.params.response;
    if (status >= 400) notFound.push(`${status} ${url}`);
  }
};

function send(method, params = {}) {
  const id = ++seq;
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        rej(new Error(`${method} 超时`));
      }
    }, 20000);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval 失败');
  return r.result.value;
}

await send('Runtime.enable');
await send('Network.enable');
await send('Page.enable');

// 进入首页；无存档时注入默认档（新 profile 首访会卡在年龄选择页）
await send('Page.navigate', { url: APP });
await sleep(1200);
await evaluate(`
  (() => {
    const KEY = 'pico-atlas:v2';
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { s = null; }
    if (!s || !s.ageBand) {
      localStorage.setItem(KEY, JSON.stringify({ v: 2, ageBand: 'L2' }));
    }
  })()
`);
await send('Page.navigate', { url: APP });
await sleep(2500);

const sections = await evaluate(`
  (() => {
    const out = [];
    document.querySelectorAll('[data-section]').forEach((el) => out.push(el.dataset.section));
    return out;
  })()
`);

console.log('首页分区:', sections.length);

// 点进每个入口 + 每个分区
const entries = ['look', 'read', 'play'];
for (const lane of entries) {
  await evaluate(`document.querySelector('[data-lane="${lane}"]')?.click()`);
  await sleep(1200);
  const secs = await evaluate(`
    (() => {
      const out = [];
      document.querySelectorAll('[data-section]').forEach((el) => out.push(el.dataset.section));
      return out;
    })()
  `);
  console.log(`  ${lane}: ${secs.length} 个分区`);
  for (const s of secs) {
    await evaluate(`document.querySelector('[data-section="${s}"]')?.click()`);
    await sleep(900);
    // 逐个点开网格里的卡
    const n = await evaluate(`document.querySelectorAll('[data-card]').length`);
    for (let i = 0; i < n; i++) {
      await evaluate(`document.querySelectorAll('[data-card]')[${i}]?.click()`);
      await sleep(700);
      await evaluate(`document.querySelector('[data-back]')?.click()`);
      await sleep(350);
    }
    console.log(`    ${s}: ${n} 张`);
    // 分区是同一屏的 tab，不需要返回（点 data-back 会直接回首页）
  }
  await evaluate(`document.querySelector('[data-back]')?.click()`);
  await sleep(600);
}

await sleep(500);

console.log('\n=== 结果 ===');
console.log('报错:', errors.length);
for (const e of [...new Set(errors)].slice(0, 15)) console.log('  ' + e);
console.log('404/失败请求:', notFound.length);
for (const n of [...new Set(notFound)].slice(0, 15)) console.log('  ' + n);

ws.close();
process.exit(errors.length || notFound.length ? 1 : 0);
