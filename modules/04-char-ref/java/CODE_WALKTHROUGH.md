# Module 4 — Java Code Walkthrough

`State.java`, `Preprocessor.java`, and `Check.java` are unchanged.
`Token.java` and `Tokenizer.java` change; `CharacterReference.java` is new.

## `Token.java` — the real structural change

Unlike JS, Java's `char` is *exactly* 16 bits and cannot hold an astral
code point at all — so `CharacterToken.data` changes type, from `char` to
`String`, this module. A convenience `CharacterToken(char data)`
constructor keeps every existing single-character call site compiling
unchanged (`String.valueOf(data)` under the hood); a new
`CharacterToken(String data)` constructor is what the numeric-reference
path uses for potentially-astral results
(`new String(Character.toChars(codePoint))` — `Character.toChars` is the
JDK method that correctly produces either 1 or 2 `char`s for a given code
point). This is the module where the "documented simplification, revisit
later" note from Module 1's `DECISIONS.md` actually gets revisited.

## `Tokenizer.java` — access changes

`CharacterReference` needs to read and rewind `pos`, read `input`, and call
`consume()`/`eof()`/`reportParseError()`. Rather than add a pile of
getters/setters, the relevant fields and methods dropped their `private`
modifier to package-private — legal and idiomatic here because
`CharacterReference` lives in the same file-less default package (the same
convention `Token.java`'s package-private classes already established in
Module 1). New: `peek()`/`peek(int offset)`, returning boxed `Character`
(nullable) rather than primitive `char`, specifically so "past EOF" can be
represented as `null` — the same role `undefined` plays in the JS version.

## `CharacterReference.java`

Structurally identical to the JS version: a `NAMED_REFERENCES` map built in
a static initializer, a `WINDOWS_1252_REPLACEMENTS` map for the four
output-changing numeric special cases, `consumeNumericReference` and
`consumeNamedReference` as private static helpers, and a public
`consumeCharacterReference` entry point. `isAlphanumeric` explicitly checks
`c < 128` — Java's `Character.isLetter`/`isDigit` are Unicode-aware and
would happily accept non-ASCII letters, which the spec's tokenizer grammar
does not intend for a reference *name*'s starting character check.

## Try it yourself

Add `WINDOWS_1252_REPLACEMENTS.put(0x81, 0x0081);` to the static
initializer (0x81 has no real entry in the spec's table — this deliberately
introduces a wrong fact). Rerun `TokenizerTest`. Nothing fails, because no
existing test exercises `&#129;`. This is a live demonstration of why
"tests all pass" is never proof of completeness — only proof of what was
actually tested. Remove the line once you've seen it.
