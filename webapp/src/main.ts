import './style.css';
import { Tokenizer } from './Tokenizer';
import { Token, StartTagToken, EndTagToken, CharacterToken, CommentToken, DoctypeToken, EOFToken } from './Token';
import type { StateName } from './State';

interface Example {
  label: string;
  html: string;
}

const EXAMPLES: Example[] = [
  {
    label: 'basic page',
    html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Hello</title>
  </head>
  <body>
    <!-- a comment -->
    <p class="intro">Hi &amp; welcome, friend!</p>
  </body>
</html>
`,
  },
  {
    label: 'unquoted attribute gotcha',
    html: `<div class=box id=main data-x=1>
  <a href=/search?q=cats&format=json>unquoted href with an ambiguous ampersand</a>
  <input disabled value=hello>
</div>
`,
  },
  {
    label: 'bogus comment + script escape',
    html: `<?xml-stylesheet type="text/css"?>
<p>weird processing-instruction-looking bogus comment above</p>
<script>
  var x = "<!-- this looks like a comment but it's just a string -->";
  document.write("<div>" + x + "</div>");
</script>
<!--> abrupt-closing empty comment above
`,
  },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function visibleChar(c: string): string {
  if (c === '\n') return '\\n';
  if (c === '\t') return '\\t';
  if (c === ' ') return '·'; // middle dot for visible space
  return c;
}

function tokenBadgeClass(t: Token): string {
  switch (t.kind) {
    case 'StartTag': return 'start-tag';
    case 'EndTag': return 'end-tag';
    case 'Character': return 'character';
    case 'Comment': return 'comment';
    case 'DOCTYPE': return 'doctype';
    case 'EOF': return 'eof';
    default: return '';
  }
}

function tokenLabel(t: Token): string {
  switch (t.kind) {
    case 'StartTag': return 'Start Tag';
    case 'EndTag': return 'End Tag';
    case 'Character': return 'Character';
    case 'Comment': return 'Comment';
    case 'DOCTYPE': return 'DOCTYPE';
    case 'EOF': return 'EOF';
    default: return '?';
  }
}

function renderTokenDetail(t: Token): string {
  if (t instanceof StartTagToken || t instanceof EndTagToken) {
    const attrs = t.attributes
      .map((a) => `<span class="attr-name">${escapeHtml(a.name)}</span>=<span class="attr-value">"${escapeHtml(a.value)}"</span>`)
      .join(' ');
    const slash = t.selfClosing ? ' /' : '';
    return `&lt;${t instanceof EndTagToken ? '/' : ''}${escapeHtml(t.tagName)}${attrs ? ' ' + attrs : ''}${slash}&gt;`;
  }
  if (t instanceof CharacterToken) {
    return `'${escapeHtml(visibleChar(t.data))}'`;
  }
  if (t instanceof CommentToken) {
    return `&lt;!--${escapeHtml(t.data)}--&gt;`;
  }
  if (t instanceof DoctypeToken) {
    const parts = [t.name ?? '(missing name)'];
    if (t.publicIdentifier !== null) parts.push(`PUBLIC "${t.publicIdentifier}"`);
    if (t.systemIdentifier !== null) parts.push(`SYSTEM "${t.systemIdentifier}"`);
    if (t.forceQuirks) parts.push('[force-quirks]');
    return `&lt;!DOCTYPE ${escapeHtml(parts.join(' '))}&gt;`;
  }
  if (t instanceof EOFToken) {
    return 'end of input';
  }
  return '';
}

/** Coalesce runs of consecutive CharacterTokens into a single display row
 * (the spec really does emit one token per character — that granularity is
 * preserved in `tokens`/`tokenStates` for accuracy — but a thousand
 * one-row-per-letter rows would make the stream unreadable). */
interface DisplayRow {
  tokens: Token[];
  state: StateName;
}

function buildDisplayRows(tokens: Token[], tokenStates: StateName[]): DisplayRow[] {
  const rows: DisplayRow[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const state = tokenStates[i];
    const prev = rows[rows.length - 1];
    if (t instanceof CharacterToken && prev && prev.tokens[0] instanceof CharacterToken && prev.state === state) {
      prev.tokens.push(t);
    } else {
      rows.push({ tokens: [t], state });
    }
  }
  return rows;
}

function renderTokenStream(tokens: Token[], tokenStates: StateName[]): string {
  const rows = buildDisplayRows(tokens, tokenStates);
  const html = rows
    .map((row) => {
      const first = row.tokens[0];
      const badge = tokenBadgeClass(first);
      const label = tokenLabel(first);
      let detail: string;
      if (first instanceof CharacterToken && row.tokens.length > 1) {
        const text = row.tokens.map((t) => (t as CharacterToken).data).join('');
        detail = `"${escapeHtml(text)}"${row.tokens.length > 1 ? ` <span class="tok-attr">(${row.tokens.length} chars)</span>` : ''}`;
      } else {
        detail = renderTokenDetail(first);
      }
      return `<div class="token-row">
        <span class="tok-badge ${badge}">${label}</span>
        <span class="tok-detail">${detail}</span>
        <span class="tok-pos" title="tokenizer state when emitted">${escapeHtml(row.state)}</span>
      </div>`;
    })
    .join('');
  return `<div class="token-stream">${html}</div>`;
}

function renderStateTrace(trace: { state: StateName; pos: number }[]): string {
  // Collapse consecutive duplicate states into one row with a count, so a
  // long run inside e.g. "Character reference" doesn't dominate the view.
  const collapsed: { state: StateName; count: number; pos: number }[] = [];
  for (const step of trace) {
    const last = collapsed[collapsed.length - 1];
    if (last && last.state === step.state) {
      last.count++;
    } else {
      collapsed.push({ state: step.state, count: 1, pos: step.pos });
    }
  }
  const html = collapsed
    .map(
      (s) => `<div class="token-row">
        <span class="state-badge">${escapeHtml(s.state)}</span>
        <span class="tok-detail tok-attr">${s.count > 1 ? `&times;${s.count}` : ''}</span>
        <span class="tok-pos">pos ${s.pos}</span>
      </div>`
    )
    .join('');
  return `<div class="token-stream">${html}</div>`;
}

// ---------------------------------------------------------------- app shell

const app = document.getElementById('app')!;

app.innerHTML = `
  <header class="topbar">
    <div class="topbar__brand">tagsmith</div>
    <nav class="topbar__links">
      <a href="https://github.com/Robert-Doe/tagsmith" target="_blank" rel="noopener">GitHub</a>
      <a href="https://robertdoe.com">&larr; robertdoe.com</a>
    </nav>
  </header>

  <section class="hero">
    <h1>HTML Tokenizer Playground</h1>
    <p>A real port of tagsmith's spec-accurate HTML5 tokenizer state machine, running client-side. Type raw HTML below and watch the actual token stream, and the exact WHATWG state name active when each token was emitted.</p>
  </section>

  <main class="main">
    <div class="playground">
      <div class="card">
        <div class="card__header"><span class="card__title">Raw HTML</span></div>
        <div class="card__body">
          <div class="examples" id="examples"></div>
          <textarea class="source" id="source" spellcheck="false"></textarea>
          <div class="run-row">
            <button class="btn" id="run">Tokenize</button>
            <span class="status" id="status"></span>
          </div>
          <ul class="error-list" id="errors"></ul>
        </div>
      </div>

      <div class="card">
        <div class="tabs" id="tabs">
          <button class="tab active" data-tab="tokens">Token Stream</button>
          <button class="tab" data-tab="states">State Trace</button>
        </div>
        <div class="card__body scroll-panel" id="panel"></div>
      </div>
    </div>
  </main>

  <footer class="footer">
    tagsmith is a spec-accurate HTML5 tokenizer, built state by state from the WHATWG tokenization algorithm.
    <a href="https://github.com/Robert-Doe/tagsmith" target="_blank" rel="noopener">Read the source &rarr;</a>
  </footer>
`;

const sourceEl = document.getElementById('source') as HTMLTextAreaElement;
const statusEl = document.getElementById('status')!;
const panelEl = document.getElementById('panel')!;
const examplesEl = document.getElementById('examples')!;
const tabsEl = document.getElementById('tabs')!;
const errorsEl = document.getElementById('errors')!;

let activeTab: 'tokens' | 'states' = 'tokens';
let lastTokens: Token[] = [];
let lastTokenStates: StateName[] = [];
let lastTrace: { state: StateName; pos: number }[] = [];

for (const ex of EXAMPLES) {
  const btn = document.createElement('button');
  btn.className = 'chip';
  btn.textContent = ex.label;
  btn.addEventListener('click', () => {
    sourceEl.value = ex.html;
    run();
  });
  examplesEl.appendChild(btn);
}

tabsEl.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const tab = target.dataset.tab as 'tokens' | 'states' | undefined;
  if (!tab) return;
  activeTab = tab;
  for (const el of tabsEl.querySelectorAll('.tab')) {
    el.classList.toggle('active', (el as HTMLElement).dataset.tab === tab);
  }
  renderPanel();
});

function renderPanel(): void {
  if (activeTab === 'tokens') {
    panelEl.innerHTML = renderTokenStream(lastTokens, lastTokenStates);
  } else {
    panelEl.innerHTML = renderStateTrace(lastTrace);
  }
}

function run(): void {
  const src = sourceEl.value;
  const tokenizer = new Tokenizer(src);
  const tokens = tokenizer.run();

  lastTokens = tokens;
  lastTokenStates = tokenizer.tokenStates;
  lastTrace = tokenizer.stateTrace;

  const tagCount = tokens.filter((t) => t instanceof StartTagToken || t instanceof EndTagToken).length;
  statusEl.textContent = `${tokens.length} tokens (${tagCount} tags), ${tokenizer.stateTrace.length} state transitions`;
  statusEl.className = 'status ok';

  if (tokenizer.parseErrors.length > 0) {
    errorsEl.innerHTML = tokenizer.parseErrors
      .slice(0, 100)
      .map((e) => `<li>[${escapeHtml(e.state)}] ${escapeHtml(e.description)}</li>`)
      .join('');
  } else {
    errorsEl.innerHTML = '';
  }

  renderPanel();
}

document.getElementById('run')!.addEventListener('click', run);
sourceEl.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run();
});

// Boot with the first example already loaded.
sourceEl.value = EXAMPLES[0].html;
run();
