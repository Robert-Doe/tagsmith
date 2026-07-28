# Module 2 — Java Code Walkthrough

One new file, one changed line. `State.java`, `Token.java`, and `Check.java`
are carried forward from Module 1 unchanged — see that module's walkthrough.

## `Preprocessor.java`

A single `public static String preprocess(String input)` method on a small
utility class. Uses `String.replace(CharSequence, CharSequence)` — Java's
*literal* replace, not `replaceAll` (which takes a regex). For a two-
character literal like `"\r\n"` this matters: `replaceAll("\r\n", "\n")`
would also work here since neither `\r` nor `\n` are regex metacharacters,
but reaching for `replace` instead of `replaceAll` communicates "this is
literal text, not a pattern" to the next reader, and avoids accidentally
writing patterns that break on other, less lucky, literal strings later.

Same two-pass, order-dependent structure as the JS version: CRLF pairs
first, lone CR second. See DECISIONS.md for why the order isn't arbitrary.

## `Tokenizer.java`

One line changed in the constructor:

```java
this.input = Preprocessor.preprocess(input);
```

instead of `this.input = input;`. Everything else — `eof()`, `consume()`,
`dataState()`, `step()`, `run()` — is untouched.

## `TokenizerTest.java`

Four new `Check.that(...)` calls exercise `Preprocessor.preprocess()`
directly, before any of Module 1's original fourteen checks run (all of
which are still present, unmodified, and still pass).

## Try it yourself

Swap the order of the two `.replace()` calls in `Preprocessor.java`.
Recompile, rerun. Two checks flip to FAIL, not one — predict which two
(hint: only the ones whose input contains an actual `"\r\n"` pair) and what
string each will actually produce, before you look.
