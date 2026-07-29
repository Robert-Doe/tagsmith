# Module 13 — JavaScript Code Walkthrough

`State.js`, `Token.js`, `Preprocess.js`, and `CharacterReference.js` are
unchanged. `Tokenizer.js` gains six new methods, no shared-helper reuse —
this family's shape doesn't overlap with the end-tag-name mechanism from
Modules 5–9, so each state is written directly.

## The dash-counting shape, a fourth time

`commentStartState` → `commentStartDashState` → `commentEndDashState` →
`commentEndState` is the same "count consecutive dashes toward a close
sequence" pattern Module 7 built for `<script>`'s hidden comments, and
Module 8 built again for the nested double-escape case. By this module,
the shape should be recognizable on sight: a state per dash count
(zero/one/two-or-more), with every non-dash character "giving back" the
dashes it provisionally swallowed before reconsuming itself in the body
state.

## `commentEndState`'s two give-back branches

```js
if (c === '-') {
  this.currentToken.data += '-';
  return; // stay -- extra dashes don't break anything
}
...
this.currentToken.data += '--';
this.state = State.COMMENT;
this.pos -= 1; // reconsume
```

Read these side by side: a *third* dash extends the count (append one
dash, stay put, still watching for `>`). Anything else abandons the close
attempt entirely, giving back *both* dashes at once (since this state
represents having confirmed two), then reconsuming whatever broke the
streak fresh, in the body state.

## `commentEndBangState`

The one genuinely new shape in this module: three characters
(`'-'`, `'-'`, `'!'`) get given back together as the literal string
`'--!'`, not appended one at a time — because by the time this state
runs, all three were already consumed by earlier states without being
added to `data`, on the hope they were forming a real `-->` or `--!>`
close.

## Try it yourself

In `commentEndState`, change the extra-dash branch (`c === '-'`) to not
append anything (just `return;` with no data mutation). Before running
anything, predict exactly what `<!--hi---->` would produce with this bug
in place. Verified answer: `"hi"` — the two "extra" dashes silently
vanish instead of ending up in the data, and (checked, not assumed)
exactly one test catches it.
