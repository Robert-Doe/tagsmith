# Module 5 — JavaScript Code Walkthrough

`State.js`, `Token.js`, `Preprocess.js`, and `CharacterReference.js` are all
unchanged. Everything new is in `Tokenizer.js`.

## New fields

```js
this.currentToken = null;      // the tag token being built, if any
this.tempBuffer = '';          // scratch space while trying to match an end tag
this.lastStartTagName = null;  // needed for "appropriate end tag token"
```

`lastStartTagName` is the one that matters most conceptually: it's how the
tokenizer remembers, across potentially thousands of characters of RCDATA
or RAWTEXT content, which specific tag name is allowed to close the
section. Module 9 will be the first module that actually *sets* it (every
time a start tag is emitted); this module only *reads* it, and tests set it
manually to exercise the logic in isolation.

## `textContentState(charRefState, lessThanState)`

One method, two thin wrappers (`rcdataState()`, `rawtextState()`). The only
difference between RCDATA and RAWTEXT text handling is whether `&` means
anything — passing `null` for `charRefState` makes the `&`-check a no-op,
so `&` just falls through to being emitted as an ordinary character, which
is exactly RAWTEXT's real behavior.

## `lessThanSignState` → `endTagOpenState` → `endTagNameState`

Three methods, each shared by an RCDATA-flavored and RAWTEXT-flavored thin
wrapper, mirroring the same three real spec states duplicated for each
family. The chain implements "try to look like a closing tag, and back out
cleanly if it turns out you're wrong":

- `lessThanSignState` only commits if the very next character is `/` — and
  it checks with `peek()`, not `consume()`, so backing out costs nothing:
  the state was never actually advanced past that character.
- `endTagOpenState` only commits further if the character after `/` is an
  ASCII letter — starting to build a real `EndTagToken` and a
  `tempBuffer` copy of what's been read so far.
- `endTagNameState` keeps extending the tag name for each subsequent
  letter, and only checks whether the growing name is "appropriate"
  (matches `lastStartTagName`) at the exact moment a terminator character
  (whitespace, `/`, `>`) is seen. If it's not appropriate *at that moment*,
  even `>` doesn't close anything — the whole attempt unwinds: `<`, `/`,
  and every buffered character get emitted as plain `CharacterToken`s, and
  the terminator character itself is reconsumed back in RCDATA/RAWTEXT.

That unwind step is the part worth sitting with: `this.pos -= 1` after a
failed match is what makes the reconsume work. The character was already
consumed to test it; backing the position up by exactly one lets the next
`step()` call see it again, fresh, under RCDATA/RAWTEXT's own rules.

## Try it yourself

In the `endTagNameState` method, delete the `isAppropriate &&` from the
`'>'` branch only (leave the tab/`/` branches alone). Rerun the tests — the
"NON-matching end tag name does NOT close RCDATA" test should now fail,
and you should be able to predict exactly what wrong token sequence it
produces before you look at the failure output.
