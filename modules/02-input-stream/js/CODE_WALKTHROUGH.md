# Module 2 — JavaScript Code Walkthrough

This module adds exactly one new file and touches exactly one line of an
old one. `State.js` and `Token.js` are carried forward from Module 1
unchanged — see that module's walkthrough if you need a refresher on them.

## `Preprocess.js`

One function, `preprocess(input)`. It uses `split('\r\n').join('\n')`
rather than a regex (`input.replace(/\r\n/g, '\n')`) purely as a style
choice — both work identically here; `split/join` avoids reasoning about
regex special-character escaping for a two-character literal. Two passes,
in a specific order: first collapse every `"\r\n"` pair, then convert any
remaining `"\r"`. Try swapping the order — see "Try it yourself" below.

## `Tokenizer.js`

One line changed in the constructor:

```js
this.input = preprocess(input);
```

instead of `this.input = input;`. That's the entire integration. Every
other method (`eof()`, `consume()`, `dataState()`, `step()`, `run()`) is
untouched, because they all operate on `this.input` — none of them care
*how* it got normalized, only that by the time they run, it already has
been.

## `test.js`

Four new tests exercise `preprocess()` directly and in isolation — no
`Tokenizer` involved — plus one test confirming the `Tokenizer` actually
calls it (a two-character `"\r\n"` input reaches the same "unimplemented
character" error as any single ordinary character would, proving it was
collapsed to one `"\n"` before `dataState()` ever saw it). All of Module
1's original eight tests are still here, unmodified, and still pass —
proof that preprocessing didn't change behavior for input that had no `\r`
in it to begin with.

## Try it yourself

In `Preprocess.js`, swap the two `.split/.join` calls so the lone-CR pass
runs first. Rerun the tests. Two assertions fail, not one — predict which
two (hint: it's every test whose input contains an actual `"\r\n"` pair,
not just a lone `"\r"`) and what the actual, wrong, output string is for
each, before you run it.
