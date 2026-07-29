# Module A3 — JavaScript Code Walkthrough

No new files this module — the entire deliverable is roughly a dozen
lines added to `TreeBuilder.js`'s constructor, plus `test.js` proving
what they unlock. Small change, disproportionately large consequence:
this is the "context" half of what `element.innerHTML = string` really
does.

## `contextInitialState()` — the same table as Module A1, applied at a different moment

```js
function contextInitialState(contextTagName) {
  if (RCDATA_ELEMENTS.has(contextTagName)) return State.RCDATA;
  if (RAWTEXT_ELEMENTS.has(contextTagName)) return State.RAWTEXT;
  if (contextTagName === 'script') return State.SCRIPT_DATA;
  if (contextTagName === 'plaintext') return State.PLAINTEXT;
  return State.DATA;
}
```

Recognize this logic — it's the same four checks `insertStartTag()`
already made in Module A1, just returning a value instead of mutating
`this.tokenizer.state` directly. Module A1 asked "which tag did we just
see mid-stream?"; this function answers a related but distinct question:
"which element is this whole fragment being parsed *as if it were
inside of*?" Same underlying HTML fact (these tag names put the
tokenizer in a special mode), two different real spec mechanisms
consulting it.

## The constructor — one `if`, applied before a single character is consumed

```js
constructor(html, contextTagName) {
  this.tokenizer = new Tokenizer(html);
  if (contextTagName !== undefined) {
    this.tokenizer.state = contextInitialState(contextTagName);
    this.tokenizer.lastStartTagName = contextTagName;
  }
  this.document = new DocumentNode();
  this.stack = [this.document];
}
```

Compare this to Module A1's `insertStartTag()`, which does the identical
two-line state-and-`lastStartTagName` assignment, but from *inside* the
running parse loop, triggered by a token that already exists. Here, both
lines run before `run()` — before `tokenizer.step()` has been called even
once. There's no tag token to react to yet; the context is simply
asserted upfront, exactly the way a real browser's `innerHTML` setter
knows its own target element without needing to "discover" it from the
fragment's content.

## Why `test.js`'s fourth test is the one that matters most

```js
const safelyStored = new TreeBuilder(PAYLOAD, 'textarea').run();
const capturedText = safelyStored.children[0].data;
const reinserted = new TreeBuilder(capturedText, 'div').run();
```

The first three tests in this module each prove one context in
isolation — useful, but not yet the security lesson. This fourth test
chains two `TreeBuilder` calls together, using the *literal output* of
the first as the *input* to the second, with no transformation in
between. That chaining is the whole point: it's not that `<img
src=x onerror=alert(1)>` is dangerous, and it's not that this course's
tokenizer has a bug — every single step here is behaving exactly per
spec. The danger is entirely an emergent property of *composing* two
individually-correct parses with mismatched contexts, which is precisely
what a real application does whenever it reads text out of one DOM
location and writes it into another without re-sanitizing for the new
destination.

## Try it yourself — confirming the table is really shared, not duplicated

Add `'title'` in place of `'textarea'` in the fourth test's first
`TreeBuilder` call, rerun `node --test`. Because `title` is in the same
`RCDATA_ELEMENTS` set `textarea` is, every assertion still passes
unchanged — direct, runnable confirmation that this module's context
mechanism and Module A1's mid-stream mechanism really do draw from the
exact same underlying classification, not two independently-maintained
copies of it that happen to agree today.
