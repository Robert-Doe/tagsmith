# Module 1 — JavaScript Code Walkthrough

Four files. Read them in this order.

## `State.js`

A single frozen object, `State`, with 68 keys. Each value is the exact spec
section title (e.g. `State.DATA === 'Data'`, `State.COMMENT_START ===
'Comment start'`). `Object.freeze` means nobody can accidentally add a 69th
state or typo an existing one at runtime — it'll silently no-op instead of
throwing, which is a known minor gap (see DECISIONS.md).

Why an object of strings instead of a JS-native `class Enum` or numeric
constants? JavaScript has no built-in enum type, and string values make
`NotImplementedError` messages self-explanatory in a stack trace without a
lookup table — `err.message` already reads like the spec's own heading.

## `Token.js`

Six classes, all extending an empty `Token` base. `DoctypeToken`'s three
identifier fields are initialized to `null`, not `''` — re-read the comment
block at the top of the file if that looks like a typo. It isn't; it's the
spec's own "missing" vs. "empty string" distinction, load-bearing for
quirks-mode detection two spec chapters from now.

`TagToken` is an intermediate class that `StartTagToken` and `EndTagToken`
both extend, so they share `tagName`, `selfClosing`, and `attributes`
without duplicating field declarations — the one place in this module where
inheritance actually pulls its weight rather than being decorative.

## `Tokenizer.js`

Three pieces:

1. **`NotImplementedError`** — a custom `Error` subclass with two extra
   fields, `stateName` and `moduleNumber`. Custom error classes in JS just
   need to call `super(message)` and set `this.name`; the rest is normal
   class mechanics.
2. **`STATE_MODULE_MAP`** — a plain object literal using computed property
   syntax (`[State.DATA]: 3`) so the keys are the *values* of `State`
   (strings like `'Data'`), not the property names (`'DATA'`). This is the
   one line in the whole file most likely to trip you up if you're new to
   JS: `{ [State.DATA]: 3 }` is not the same as `{ State.DATA: 3 }` (the
   latter is actually a syntax error).
3. **`Tokenizer`** — a plain class holding `input`, `pos`, `state`,
   `tokens`, and `halted`. `eof()`, `consume()`, and `emit()` are the three
   primitives every future module's state-handler methods will call.
   `dataState()` is the one method with real branching logic; `step()` is
   the dispatcher — right now it has exactly one `if` for the one state
   that's implemented, and a fallback `throw` for the other 67. `run()` is
   the loop from the Prerequisites finite-state-machine page, spelled out
   in real code: `while (!this.halted) { this.step(); }`.

## `test.js`

Uses Node's built-in `node:test` — no install required (`node --test` just
works on any Node 18+). Eight tests, each asserting one sentence from the
module's tutorial. Notice the seventh test manually sets
`tokenizer.state = State.COMMENT_START` before calling `step()` directly —
that's how we test a state module 1 doesn't own without wiring up 47 states
of state transitions just to reach it.

## Try it yourself

Break something on purpose: change `State.DATA` to `'data'` (lowercase) in
just `Tokenizer.js`'s `step()` comparison. Run the tests. Watch which ones
fail and think about why *those specific ones* broke and not others — that
tells you exactly which tests depend on the DATA branch actually firing.
