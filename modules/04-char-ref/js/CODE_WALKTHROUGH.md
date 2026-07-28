# Module 4 — JavaScript Code Walkthrough

`State.js` and `Preprocess.js` are unchanged. `Token.js` and `Tokenizer.js`
change; `CharacterReference.js` is new.

## `Token.js`

Only a comment changed — `CharacterToken.data` was always just "whatever
string you pass it," so JS needed zero structural change to go from
"one code unit" to "one code point (1 or 2 code units)." The constraint was
never enforced by the language; it was enforced by *what callers passed
in*, and Module 3's callers only ever passed single-code-unit strings.
Module 4's numeric-reference path is the first caller that can pass a
2-code-unit string (`String.fromCodePoint(0x1F600)`), and nothing else
needed to change to support it.

## `CharacterReference.js`

Three pieces:

1. **`NAMED_REFERENCES`** — a plain object subset of the real table (see
   the file's header comment and DECISIONS.md for what's excluded and why).
   `LONGEST_NAME_LENGTH` is computed once from the table's own keys, not
   hardcoded, so adding an entry can never silently desync it.
2. **`consumeNumericReference`** — consumes `#`, then optionally `x`/`X`,
   then digits matching whichever base was selected, backtracking to
   `startPos` if zero digits were found (a numeric reference needs at
   least one digit — `&#;` is not one). `mapNumericCodePoint` centralizes
   the four output-changing special cases (NUL, out-of-range, surrogate,
   Windows-1252 range) as early returns, so the "ordinary" path falls
   through to just returning the code point unchanged.
3. **`consumeNamedReference`** — grabs up to `LONGEST_NAME_LENGTH`
   characters as a lookahead string (without consuming them yet), then
   tries progressively *shorter* prefixes of that lookahead against the
   table until one matches, consuming only that matched length. This is
   "longest match wins" implemented as a simple linear shrink rather than
   a trie — correct and easy to read at this table size; a real browser's
   ~2000-entry table uses a trie for speed, not correctness.

`consumeCharacterReference` ties it together: bail out immediately (return
`null`, consume nothing) for EOF or any of the "not a reference" terminator
characters; otherwise dispatch to numeric or named based on the next
character.

## `Tokenizer.js`

`peek(offset = 0)` was added alongside `consume()` — same idea, no side
effect. `characterReferenceState(returnState)` is shared by both
`characterReferenceInDataState()` and `characterReferenceInRcdataState()`:
run the algorithm, emit either the decoded text or a literal `'&'`, then
switch to whichever state should regain control. `step()` grew two more
`if` branches for the two now-real states — Module 1's generic fallback
still handles the other 66.

## Try it yourself

Add `'yen;': '¥'` to `NAMED_REFERENCES` in `CharacterReference.js`. Rerun
the tests — all still pass, because none of them test for `&yen;`. Now add
a test for it yourself, modeled on the `&amp;` test. This is the exact
shape a real named-reference-table expansion takes.
