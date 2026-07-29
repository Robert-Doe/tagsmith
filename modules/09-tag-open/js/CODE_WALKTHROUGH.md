# Module 9 — JavaScript Code Walkthrough

`State.js`, `Preprocess.js`, and `CharacterReference.js` are unchanged.
`Token.js` needed no changes either — `StartTagToken`/`EndTagToken` were
fully defined back in Module 1, just unused by any real producer until
now. `Tokenizer.js` gains three new methods and one small helper.

## `tagOpenState`

Four branches (`!`, `/`, letter, `?`), plus a catch-all. The letter branch
is the interesting one: it creates a fresh `StartTagToken`, switches to
`TAG_NAME`, and decrements `pos` by one — reconsuming the very letter it
just read, so `TAG_NAME`'s own `consume()` call sees it fresh. This is the
same reconsume pattern every module since Module 3 has used; nothing new
mechanically, just a new place it's applied.

## `endTagOpenState`

Structurally similar to Module 5's `endTagOpenState` (same name, different
method — this one has no shared-helper reuse, because its "anything else"
behavior genuinely differs: RCDATA/RAWTEXT/script-data's version always
emits `<` and `/` literally on failure, but *this* version's failure path
(non-letter, non-`>`, non-EOF) routes into `BOGUS_COMMENT` instead — a real
behavioral difference the Module 5 helper doesn't have a parameter for.

## `tagNameState` and `emitCurrentTagToken`

The NUL branch is worth reading closely:

```js
this.currentToken.tagName += '�';
```

Compare this to Module 3's Data-state NUL handling, which emits the
literal NUL as its own `CharacterToken`. Here, NUL is happening *inside* a
tag name being built — there's no character-token stream to emit into at
this point, only a string field being assembled. So the *replacement*
policy (U+FFFD, not literal) applies directly to that string instead. Two
different NUL rules in this course now, for two different reasons — see
DECISIONS.md.

`emitCurrentTagToken` is a tiny two-line method, but it's the one place in
this whole module that reaches out and touches `lastStartTagName` — the
field every RCDATA/RAWTEXT/script-data test since Module 5 has had to set
by hand. As of this module, it's finally set by real tokenizer behavior.

## Try it yourself

Run `new Tokenizer('<textarea><b></textarea>').run()` and inspect
`tokenizer.lastStartTagName` afterward. It'll be `'b'`, not `'textarea'` —
walk through why using this file's `tagOpenState`/`tagNameState`, and
convince yourself this is exactly correct pure-tokenizer behavior, not a
bug, before reading this module's Brain Exercise.
