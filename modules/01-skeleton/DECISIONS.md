# Module 1 — DECISIONS.md

Every non-obvious choice in this module's data model and algorithm, sorted
into three categories. This file describes the *shared* design (both
languages implement the same decisions) — anything specific to how one
language expresses a shared decision is in that language's own
`CODE_WALKTHROUGH.md`.

## (a) Forced by the spec — not a choice at all

- **The tokenizer starts in the Data state.** The spec states this
  directly. There is no alternative to evaluate.
- **A Character token holds exactly one character**, not a run of text.
  The spec's token-type preamble defines it this way. (Real production
  parsers typically coalesce adjacent character tokens afterward for
  performance — the spec explicitly *permits* this as an optimization, but
  does not require it, and this module does not do it. One character in,
  one `CharacterToken` out.)
- **An EOF token carries no fields.** Nothing to decide.
- **A DOCTYPE token has a name, a public identifier, a system identifier,
  and a force-quirks flag** — exactly these four fields, no others. Spec
  preamble, verbatim.
- **A start/end tag token has a tag name, a self-closing flag, and a list
  of attributes** — exactly these three fields. Spec preamble, verbatim.

## (b) Forced by an external contract

- **DOCTYPE identifiers start "missing" (`null`), not `""`.** The spec
  itself defines this initial state, but the *reason* it matters is a
  downstream contract: the tree construction stage (a later spec chapter,
  out of scope for this course except in Track 2's minimal bridge module)
  uses "was a public/system identifier ever set at all" to help decide
  quirks mode. Collapsing "missing" and "empty string" into the same value
  would silently break that downstream contract. This is why both languages
  use `null` here instead of the more tempting `''`.
- **Attributes are stored as a list of `{name, value}` pairs, not a
  `Map`/dictionary**, even though this module never populates the list.
  This is decided now, once, because Module 10 (Attribute Name & Value
  States) has to detect and drop *duplicate* attribute names per the spec's
  exact rule ("keep the first occurrence") — a rule a `Map` would silently
  violate by letting a later duplicate overwrite the earlier value. Getting
  the data structure right in Module 1 avoids a breaking change to `Token`
  nine modules from now.

## (c) Our convention — another consistent choice could have replaced it

- **States are represented as named string constants (JS) / an enum with a
  `specName` field (Java)**, rather than plain integers. Chosen for
  debuggability: an error message or a debugger inspection shows
  `'Comment start'`, not `47`. Costs nothing at this scale (68 values).
- **`STATE_MODULE_MAP` exists at all.** No real tokenizer would ship a data
  structure mapping its own states to "which lesson teaches this." This is
  course-specific scaffolding, chosen so Module 1's tests can mechanically
  verify all 68 states are addressable and correctly labeled with what
  comes next, instead of that fact being an unverified claim in this
  document.
- **`NotImplementedError` / `NotImplementedException` is a custom error
  type**, not a bare `throw new Error('nope')` / `throw new
  RuntimeException("nope")`. Chosen so tests can assert on `.moduleNumber`
  and `.stateName` programmatically instead of parsing error message text.
- **The input-stream primitive is a plain integer index (`pos`) into a
  string**, not a proper iterator/generator object. Chosen as the simplest
  thing that works for Module 1's needs (see the Input Streams &amp;
  Iterators prerequisite page for the general concept this specializes).
  This convention is revisited if UTF-16 surrogate-pair handling ever
  requires more than "advance by one index" — see the Unicode prerequisite
  page for why that's a real, if currently dormant, risk.
- **A hand-rolled `Check.java` test harness instead of JUnit.** Chosen to
  keep every module runnable with nothing installed beyond a JDK — no
  Maven/Gradle project setup, no dependency resolution. The tradeoff: less
  expressive assertions and no test discovery, acceptable at this scale
  (a handful of tests per module).
- **Java's `Token.java` puts all six classes in one file, all
  package-private, with no `package` declaration.** An idiomatic multi-file
  Java project would split these into `Token.java`, `DoctypeToken.java`,
  etc., each in a named package. Chosen instead so each module directory
  is a single, copy-pasteable, self-contained unit with zero project
  scaffolding.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | Tokenizer starts in Data state | (a) forced by spec |
| 2 | Character token = one character, no coalescing | (a) forced by spec |
| 3 | EOF token has no fields | (a) forced by spec |
| 4 | DOCTYPE token has exactly 4 fields | (a) forced by spec |
| 5 | Tag token has exactly 3 fields | (a) forced by spec |
| 6 | DOCTYPE identifiers start `null`, not `''` | (b) external contract (tree construction / quirks mode) |
| 7 | Attributes stored as a list, not a map | (b) external contract (Module 10's duplicate-attribute rule) |
| 8 | States as named strings/enum, not integers | (c) convention — debuggability |
| 9 | `STATE_MODULE_MAP` exists | (c) convention — course scaffolding |
| 10 | Custom `NotImplementedError`/`Exception` type | (c) convention — testable failure |
| 11 | Plain integer index as input-stream primitive | (c) convention — simplest thing that works |
| 12 | Hand-rolled `Check.java`, no JUnit | (c) convention — zero dependencies |
| 13 | Java `Token.java`: one file, package-private, no package | (c) convention — self-contained module folders |

## What We Proved

- A single `state` variable plus a dispatch structure (`if`/`switch` in JS,
  `if` + `EnumMap` lookup in Java) is sufficient scaffolding to address all
  68 states from the spec, verified by iterating `Object.values(State)` /
  `State.values()` and confirming every one resolves to a module number.
- Failure for an unimplemented state is loud, specific, and machine-checkable
  — it names the exact state and the exact module that will complete it,
  rather than crashing generically or (worse) silently doing nothing.
- All six token types the spec defines can be constructed and correctly
  hold their defined initial field values, verified by direct unit tests,
  before a single tokenizing state exists to actually produce one during a
  real run.
- One complete, correct, end-to-end vertical slice already works: empty
  string in, exactly one `EOFToken` out — the smallest input the tokenizer
  can ever receive, handled fully correctly, in both languages, verified by
  running (not reading) the tests.
