// Checked against the HTTP response, not the filesystem: vinext writes no HTML files.
// Markup is stripped before matching (the headline is split across spans), and
// <script>/<style> first (the RSC payload carries copy no reader without JS sees).
// The needles are hardcoded: an expectation read from the source under test always passes.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 8788;
const CONFIG = 'dist/server/wrangler.json';
const CSS_DIR = 'dist/client/_next/static/css';
const CSS_FILES = 3;
const REQUIRED = [
  'I build the systems that let teams ship software with AI.',
  'Selected work',
  'info@obarsal.dev',
];

// The root `wrangler.jsonc` has a virtual `main` that resolves only inside the Vite plugin.
const server = spawn(
  'npx',
  ['wrangler', 'dev', '--config', CONFIG, '--port', String(PORT)],
  { stdio: ['ignore', 'ignore', 'pipe'], detached: true },
);

let stderr = '';
server.stderr.on('data', (chunk) => {
  stderr += chunk;
});

// Killing `npx` alone leaves wrangler orphaned and holding the port.
function stop() {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
}

function fail(msg) {
  console.error(`[assert-static] ${msg}`);
  if (stderr.trim()) console.error(`[assert-static] wrangler stderr:\n${stderr}`);
  stop();
  process.exit(1);
}

/** The text a reader with JavaScript disabled would actually see. */
function renderedText(html) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

// A 'use client' file that imports a stylesheet splits a fourth CSS chunk, one more
// request on the critical path; the file-name grep in check-rules.sh cannot see it.
const css = readdirSync(CSS_DIR).filter((name) => name.endsWith('.css'));
if (css.length !== CSS_FILES) {
  fail(`${CSS_DIR} holds ${css.length} stylesheets, expected ${CSS_FILES}: ${css.join(', ')}`);
}

try {
  let html = null;
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      if (res.ok) {
        html = await res.text();
        break;
      }
    } catch {
      /* not up yet */
    }
  }
  if (html === null) fail('the built Worker never served a 200 on / within 60s');

  const text = renderedText(html);
  const missing = REQUIRED.filter((needle) => !text.includes(needle));
  if (missing.length > 0) {
    fail(
      `served HTML is missing ${missing.length} of ${REQUIRED.length} required strings:\n` +
        missing.map((m) => `  - ${JSON.stringify(m)}`).join('\n') +
        `\nThe page must be complete in the response body, before any JS runs.` +
        `\n(<script> and <style> contents are excluded: copy that only exists in` +
        `\nthe RSC payload is copy a reader without JavaScript never sees.)`,
    );
  }

  console.log(
    `[assert-static] OK — the built Worker serves the full page in its HTML response ` +
      `(${REQUIRED.length}/${REQUIRED.length} required strings present outside <script>).`,
  );
  stop();
} catch (err) {
  fail(String(err));
}
