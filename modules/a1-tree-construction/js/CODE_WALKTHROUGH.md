# Module A1 — JavaScript Code Walkthrough

Two new files this module: `TreeNode.js` (the tree's node types) and
`TreeBuilder.js` (the class that actually closes the gap Module 9 and
Module 16 both documented). `Tokenizer.js` is untouched — every field
`TreeBuilder` needs (`state`, `lastStartTagName`, `tokens`, `halted`) was
already accessible by construction, being plain JS.

## `TreeNode.js` — four small classes, nothing clever

```js
class ElementNode {
  constructor(tagName, attributes) { this.tagName = tagName; this.attributes = attributes; this.children = []; }
}
```

Deliberately dumb data classes: no methods, no validation. The
interesting logic lives entirely in `TreeBuilder`, not spread across the
node types — a document tree is just a shape; a tree *builder* is a
process.

## `TreeBuilder.run()` — the one-step-at-a-time loop that makes everything else possible

```js
run() {
  while (!this.tokenizer.halted) {
    const before = this.tokenizer.tokens.length;
    this.tokenizer.step();
    for (let i = before; i < this.tokenizer.tokens.length; i++) {
      this.processToken(this.tokenizer.tokens[i]);
    }
  }
  return this.document;
}
```

This is the one line of architecture the whole module hinges on:
`this.tokenizer.step()`, not `this.tokenizer.run()`. Every earlier
module's tests called `run()` and looked at the finished token list —
fine, because nothing needed to talk back to the tokenizer mid-stream.
Tree construction *does* need to talk back: by the time a `<textarea>`
start tag's token is fully formed and `run()` would have already moved
on, the tokenizer is already past the point where switching to RCDATA
would help. Stepping one token-producing iteration at a time, and
reacting to each new token the instant it appears, is what lets
`insertStartTag()` flip `this.tokenizer.state` *before* the next
character is consumed.

## `insertStartTag()` — the seam Module 9 said the tokenizer could never own

```js
insertStartTag(token) {
  const el = new ElementNode(token.tagName, token.attributes);
  this.currentNode().children.push(el);
  if (token.selfClosing || VOID_ELEMENTS.has(token.tagName)) { return; }
  this.stack.push(el);
  if (RCDATA_ELEMENTS.has(token.tagName)) {
    this.tokenizer.state = State.RCDATA;
    this.tokenizer.lastStartTagName = token.tagName;
  } else if (RAWTEXT_ELEMENTS.has(token.tagName)) {
    ...
  } else if (token.tagName === 'script') {
    this.tokenizer.state = State.SCRIPT_DATA;
    ...
  }
  ...
}
```

Four things happen, in this exact order, every time a start tag is
processed: (1) build the element, (2) attach it to whatever's currently
open, (3) decide whether it can ever have children at all (void /
self-closing elements never get pushed onto `stack`), (4) — only for the
small set of tags that need it — reach directly into the tokenizer and
change its `state`. Step 4 is a plain field write. There's no callback,
no event, no observer pattern; `Tokenizer` and `TreeBuilder` are two
objects in the same process, and tree construction is simply allowed to
mutate the tokenizer's public state. That directness is exactly how the
spec itself describes the relationship — tokenization and tree
construction are two *coupled* algorithms, not two independent black
boxes.

## `processToken()`'s character-token branch — building Text nodes one code point at a time

```js
if (token instanceof CharacterToken) {
  const kids = this.currentNode().children;
  const last = kids[kids.length - 1];
  if (last instanceof TextNode) { last.data += token.data; }
  else { kids.push(new TextNode(token.data)); }
  return;
}
```

The tokenizer emits one `CharacterToken` per code point (Module 3's
design, unchanged since). A DOM never looks like that — `"hello"` is one
`Text` node, not five. This is the coalescing rule from DECISIONS.md
made concrete: check whether the most recently added child is already a
`TextNode`, and if so, append to it instead of creating a new one.
Cheap, and it's the only place in this whole module that has to run once
per character rather than once per tag.

## `closeMatchingElement()` — deliberately not the real adoption agency algorithm

```js
closeMatchingElement(tagName) {
  for (let i = this.stack.length - 1; i >= 1; i--) {
    if (this.stack[i] instanceof ElementNode && this.stack[i].tagName === tagName) {
      this.stack.length = i;
      return;
    }
  }
}
```

Walk the open-elements stack from the top down, looking for a matching
tag name; if found, truncate the stack to end right before it (`stack[i]`
itself is removed too, since the matching element is now closed and
everything above it was implicitly closed along with it). `i >= 1`, not
`i >= 0`, deliberately skips index 0 — the permanent `document` root is
never a candidate for "closing." If nothing matches, the loop falls
through and the end tag is silently ignored. See DECISIONS.md for why
this is a documented simplification, not the full spec algorithm.

## Try it yourself — verified, not assumed

Comment out the line inside `insertStartTag`'s `RCDATA_ELEMENTS` branch
that sets `this.tokenizer.state = State.RCDATA` (leaving
`lastStartTagName` alone) and rerun `node --test`. Verified real result:
**exactly one test fails**, `textarea content is now correctly protected
from tag/entity interpretation...`, with `node:test` reporting
`2 !== 1` — the tokenizer, never switched out of `DATA`, sees `<b>` as a
real start tag and pushes it as a second, separate child of
`<textarea>` instead of leaving it as literal text, so `textarea`
ends up with 2 children where the test expects 1. Every other test —
including the completely unrelated `script` test — still passes,
because breaking only the RCDATA branch cannot affect script handling.
This is the smallest possible demonstration of the seam this whole
module exists to close: delete the one field write, and the exact bug
Module 16 found against a real browser comes right back.
