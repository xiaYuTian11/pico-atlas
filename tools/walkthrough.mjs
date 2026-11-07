/**
 * 全类型巡检 —— 把 14 类卡片逐个点开、逐屏截图、收集报错。
 *
 * 用法：node tools/walkthrough.mjs [--w 390 --h 844] [--only sectionId]
 *
 * 输出：assets/shots/<section>_<card>.png + 控制台报错汇总
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const PORT = Number(arg('port', process.env.PA_CDP_PORT || 63547));
const W = Number(arg('w', 390));
const H = Number(arg('h', 844));
const DPR = Number(arg('dpr', 2));
const ONLY = arg('only', '');
const OUT = arg('out', 'assets/shots');
const URL_BASE = arg('url', 'http://127.0.0.1:5273/');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (p) =>
  new Promise((res, rej) => {
    http
      .get({ host: '127.0.0.1', port: PORT, path: p }, (r) => {
        let b = '';
        r.on('data', (d) => (b += d));
        r.on('end', () => res(JSON.parse(b)));
      })
      .on('error', rej);
  });

async function main() {
  const targets = await getJSON('/json/list');
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  let seq = 0;
  const pending = new Map();
  const errors = [];
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
      errors.push(
        '[exception] ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text),
      );
    }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      errors.push(
        `[console.${m.params.type}] ` + (m.params.args || []).map((a) => a.value ?? a.description).join(' '),
      );
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      errors.push('[log] ' + m.params.entry.text);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const id = ++seq;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (js) => {
    const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval error');
    return r.result?.value;
  };

  const shot = async (name) => {
    const p = path.resolve(OUT, `${name}.png`);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const c = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(p, Buffer.from(c.data, 'base64'));
    return p;
  };

  /** 轮询直到条件为真，避免 reload 竞态 */
  const waitFor = async (cond, timeout = 8000) => {
    const t0 = Date.now();
    for (;;) {
      let ok = false;
      try {
        ok = await evaluate(`(() => { try { return !!(${cond}); } catch { return false; } })()`);
      } catch {
        ok = false;
      }
      if (ok) return true;
      if (Date.now() - t0 > timeout) return false;
      await sleep(150);
    }
  };

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

  // 干净起点
  await send('Page.navigate', { url: URL_BASE });
  await waitFor(`document.querySelector('.pa-app, .pa-age, .pa-home')`);
  await evaluate(`localStorage.clear(); location.reload(); 'ok'`).catch(() => {});
  await sleep(600);
  await waitFor(`document.querySelector('.pa-age, .pa-home')`);

  // 选择年龄档 L2（内容最全）
  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('4 – 5 岁') || x.textContent.includes('4-5'));
      if (!b) return 'no age button: ' + document.body.innerText.slice(0,120);
      b.click(); return 'picked';
    })()
  `);
  await sleep(500);
  await waitFor(`document.querySelector('.pa-home__entry')`);
  console.log('body:', JSON.stringify(await evaluate('document.body.innerText.slice(0,260)')));
  console.log('ageBtns:', await evaluate(`document.querySelectorAll('.pa-age__btn').length`));
  await shot('00-home');

  // 收集分区清单
  const sections = await evaluate(`
    (() => [...document.querySelectorAll('.pa-home__entry')].map(b => b.getAttribute('aria-label') || b.innerText.replace(/\\s+/g,' ')))()
  `);
  console.log('首页入口:', JSON.stringify(sections));

  const plan = [];
  for (const laneZh of ['认东西', '读一读', '玩一玩']) {
    await evaluate(`
      (() => {
        const b = [...document.querySelectorAll('.pa-home__entry')].find(x => (x.getAttribute('aria-label')||'').includes(${JSON.stringify(laneZh)}));
        if (b) b.click();
        return !!b;
      })()
    `);
    await sleep(600);
    const tabs = await evaluate(`
      (() => [...document.querySelectorAll('.pa-grid__tab')].map(t => (t.querySelector('.pa-grid__tab-zh')||t).textContent.trim()))()
    `);
    for (const tab of tabs || []) {
      const secName = tab;
      if (ONLY && secName !== ONLY) continue;
      await evaluate(`
        (() => {
          const t = [...document.querySelectorAll('.pa-grid__tab')].find(x => (x.querySelector('.pa-grid__tab-zh')||x).textContent.trim() === ${JSON.stringify(tab)});
          if (t) t.click();
          return !!t;
        })()
      `);
      await sleep(350);
      const slug = secName;
      await shot(`grid-${laneZh}-${slug}`);
      // 点第一个格子，逐张翻
      const count = await evaluate(`document.querySelectorAll('.pa-grid__cell').length`);
      for (let i = 0; i < Math.min(3, count); i++) {
        await evaluate(`
          (() => {
            const cells = document.querySelectorAll('.pa-grid__cell');
            if (cells[${i}]) cells[${i}].click();
            return !!cells[${i}];
          })()
        `);
        await sleep(900);
        await shot(`card-${laneZh}-${slug}-${i}`);
        plan.push(`${laneZh}/${slug}/${i}`);
        await evaluate(
          `(() => { const b = document.querySelector('.pa-stage__back, [aria-label="返回网格"], [aria-label="返回"]'); if (b) b.click(); return !!b; })()`,
        );
        await sleep(500);
      }
    }
    // 回首页
    await evaluate(
      `(() => { const b = document.querySelector('[aria-label="返回首页"]'); if (b) b.click(); return !!b; })()`,
    );
    await sleep(500);
  }

  console.log(`共截图 ${plan.length} 张卡片`);
  const uniq = [...new Set(errors)];
  console.log(uniq.length ? '--- 报错 ---\n' + uniq.join('\n') : '--- 无报错 ---');
  await send('Emulation.clearDeviceMetricsOverride').catch(() => {});
  ws.close();
}

main().catch((e) => {
  console.error('walkthrough failed:', e.message);
  process.exit(1);
});
