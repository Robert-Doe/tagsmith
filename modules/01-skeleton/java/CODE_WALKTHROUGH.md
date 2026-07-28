# Module 1 — Java Code Walkthrough

Six files. Read them in this order.

## `State.java`

A `public enum State` with 68 constants, each carrying one extra field,
`specName` — a plain `final String` set through the enum's constructor
(`DATA("Data")`, `COMMENT_START("Comment start")`, ...). This is Java's
native answer to "a fixed, closed set of named values," and it's strictly
safer than the JS version: the compiler rejects `State.NOT_A_REAL_STATE`
outright, rather than silently returning `undefined`.

## `Token.java`

No `package` declaration — this module folder compiles as Java's default
package, deliberately, so the whole module stays self-contained (`javac
*.java` with no classpath setup). Six classes, none of them `public` — a
file is allowed zero public top-level types as long as none of its classes
need to be visible outside the file's own directory, which is true here.

`DoctypeToken`'s three `String` fields start as `null`. In Java, `null` and
`""` are already distinct types of "nothing" (unlike some languages), which
makes this decision almost free — but the *reason* to pick `null` over `""`
is still the same spec-driven "missing" vs. "empty string" contract
described in `Token.js`'s walkthrough and in `DECISIONS.md`.

`TagToken` is `abstract`; `StartTagToken` and `EndTagToken` both `extends
TagToken` with empty bodies, inheriting `tagName`, `selfClosing`, and
`attributes` (a `List<Attribute>`, chosen over a `Map<String,String>` — see
DECISIONS.md for why duplicate detection needs a list here, not a map).

## `Tokenizer.java`

- **`NotImplementedException`** — extends `RuntimeException` (not the
  checked `Exception`), so it doesn't force a `throws` clause onto every
  method in the call chain — appropriate here since this exception means
  "this code path is unfinished," a programmer error class, not a recoverable
  condition.
- **`STATE_MODULE_MAP`** — a `static final Map<State, Integer>` backed by
  `EnumMap`, populated in a `static { ... }` initializer block. `EnumMap` is
  the Java-idiomatic choice over `HashMap<State, Integer>` here: it's
  backed by an array indexed by the enum's ordinal, so lookups are faster
  and iteration order matches declaration order — a genuinely better fit
  than the generic map, not just a stylistic pick.
- **`Tokenizer`** — the `public class` matching the file name (required by
  Java). Same five fields as the JS version (`input`, `pos`, `state`,
  `tokens`, `halted`), same three primitives (`eof()`, `consume()`,
  `emit()`), same `dataState()` / `step()` / `run()` split. `consume()`
  uses `input.charAt(pos++)` — `charAt` returns one UTF-16 code unit, which
  is why `CharacterToken.data` is typed `char` and not a full code point
  (see the Unicode prerequisite page).
- `forceState()` and `stepOnce()` at the bottom are package-private
  test-only hooks, mirroring the JS test's direct `tokenizer.state = ...`
  assignment — Java has no equivalent of "just poke a public field from the
  test file" without exposing it, so these two tiny methods exist purely to
  give the test the same access.

## `Check.java` and `TokenizerTest.java`

`Check` is a ~20-line hand-rolled assertion library: `that(description,
condition)` for plain booleans, `throwsWithModule(...)` for exception
assertions, and `summary()` to print totals and set a non-zero exit code on
failure (so this integrates with any CI that just checks the process exit
code). `TokenizerTest.main()` is a plain `public static void main` — no test
framework, no annotations, just top-to-bottom calls to `Check.that(...)`.

## Try it yourself

In `Tokenizer.java`, change the `static { ... }` block's entry for
`State.COMMENT` from `13` to `99`. Recompile and rerun. Exactly one printed
line should flip from PASS to FAIL — find it before you scroll up to check.
