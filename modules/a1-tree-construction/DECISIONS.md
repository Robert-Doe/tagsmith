# Module A1 — DECISIONS.md

## (a) Forced by the tokenization spec (the seam Module 9 already found)

- **The tokenizer never decides, on its own, to enter RCDATA / RAWTEXT /
  script-data / PLAINTEXT.** This isn't this module's opinion — Module 9
  demonstrated it directly: this course's tokenizer has no branch anywhere
  in `step()`'s `TAG_NAME` handling that inspects a finished tag name and
  changes `state`. The spec's tokenization algorithm genuinely has no such
  rule. Something *outside* the tokenizer has to reach in and set `state`
  and `lastStartTagName` after seeing a start tag token. Module A1 is that
  something. This is the single fact the entire module exists to make
  real, not theoretical.
- **`lastStartTagName` exists on the tokenizer specifically so an
  "appropriate end tag token" can be recognized** (Module 5). Module A1
  is the first module that actually *sets* it from outside the tokenizer,
  the way a real browser's tree constructor does — every earlier module
  set it via the test-only `forceState`/direct-field-write path instead.

## (b) Forced by an external contract

- **The tag-name → mode table (`textarea`/`title` → RCDATA, `style`/`xmp`
  → RAWTEXT, `script` → SCRIPT_DATA, `plaintext` → PLAINTEXT) is forced by
  the real HTML5 *tree construction* specification** — a separate spec
  from the tokenization one this course centers on ("the generic raw text
  element parsing algorithm" / "the generic RCDATA element parsing
  algorithm," in tree-construction terms). This course treats that
  algorithm as an external contract: we don't re-derive it from first
  principles, we implement the specific seam it requires so the
  tokenizer's documented gap gets closed correctly.
- **Adjacent character tokens must merge into one `TextNode`.** This is
  forced by how a real DOM represents text: `element.childNodes` never
  contains two adjacent `Text` nodes from ordinary parsing, because the
  tokenizer's one-character-at-a-time `CharacterToken` stream would
  otherwise produce one DOM text node per input character, which no real
  browser does and no reasonable tree would want. The coalescing rule
  is dictated by the DOM's contract, not invented here.
- **Void elements never receive children.** The specific list used here
  (`area base br col embed hr img input link meta source track wbr`) is
  the real HTML5 "void elements" list — a fact about HTML's element
  vocabulary, external to the tokenizer/tree-builder split this course is
  actually teaching.

## (c) Our convention

- **The element lists are a deliberately small subset**, not the full
  spec lists. Real RAWTEXT also includes `iframe`, `noembed`, `noframes`,
  `noscript`; real void elements include a few more (`area`, `command`
  historically, etc.). This module needs exactly enough real examples to
  prove the mechanism generalizes — not a complete spec-vocabulary
  implementation, which would be a large, separate data-entry exercise
  unrelated to the tokenizer/tree-constructor boundary this module is
  actually about.
- **`closeMatchingElement` is a simplified "pop until you find a match,
  or give up" stack walk**, not the real spec's adoption agency
  algorithm. The real algorithm handles genuinely misnested tags like
  `<b><i>text</b></i>` by *reparenting* nodes so both `<b>` and `<i>`
  stay open correctly around the boundary; this module's version just
  closes everything down to (and including) the first matching open
  element, silently dropping any mismatched tags in between. Explicitly
  out of scope — documented here rather than silently approximated.
- **`TreeBuilder.run()` still calls the tokenizer's `step()` one call at a
  time in a loop**, mirroring exactly how a real browser's HTML parser
  works (tokenizer and tree constructor as two coroutines handing tokens
  back and forth, not "run the whole tokenizer first, then build a tree
  from its output"). This is the one design choice in this module that
  isn't just "the minimum to pass tests" — driving one step at a time
  instead of calling the existing `run()`/`tokensSoFar()` convenience is
  precisely what makes the mid-stream `tokenizer.state = State.RCDATA`
  intervention possible at all. Calling `run()` first and then walking
  the finished token list would already be too late: by the time `run()`
  returns, the tokenizer already (wrongly) tokenized the `<textarea>`'s
  contents as if they were ordinary markup.
- **Java's `Tokenizer` gained one new public method, `isHalted()`.**
  Every earlier module kept `halted` private with only `run()` (which
  loops internally) as a consumer. Module A1's `TreeBuilder` needs to
  drive the loop itself, from outside the class, so a minimal boolean
  accessor was added — the smallest possible change, not a broader
  visibility relaxation of any other field.
- **`Doctype` is a small immutable record class in Java** (`name`,
  `publicId`, `systemId`, `forceQuirks`), mirroring the plain object
  literal `{ name, publicId, systemId, forceQuirks }` used in the JS
  version — a deliberate language-appropriate translation of the same
  shape, not a divergence in what's stored.

## A real discovery: a latent JS-only tokenizer bug, found while preparing Module A2

While using this module's `TreeBuilder` to explore inputs for Module A2 (a
sanitizer), a genuinely unexpected result appeared:
`<title><script>alert(1)</script></title>` should — per Module 5's own
"appropriate end tag token" rule, which requires an end tag's name to
match the name of whichever start tag opened RCDATA/RAWTEXT/script-data —
tokenize the literal text `</script>` as ordinary characters inside
`<title>`, since `"script"` does not match `lastStartTagName` (`"title"`).
Instead, this course's `Tokenizer.js` was closing `<title>` early, right
at that `</script>`, producing a broken tree.

**Root cause, found by direct instrumentation (not guessed):** `Tokenizer.js`
had *two* methods named `endTagOpenState` — the plain, zero-argument one
Module 9 built for ordinary `</tag>` parsing in `DATA` state, and a
separate, parametrized `endTagOpenState(endTagNameState, returnState)`
Module 5 built specifically for RCDATA/RAWTEXT reuse (later also used by
Modules 6 and 7 for script-data). JavaScript class bodies allow two
methods with the same name; the second definition silently **replaces**
the first on the class's prototype — no error, no warning. Every call to
the parametrized version was therefore actually calling the zero-argument
Module 9 version instead (its extra arguments simply ignored), routing
straight into the ordinary, appropriateness-blind `TAG_NAME` state. This
bug has existed since whichever of Modules 5–9 was built last (order
doesn't matter — the second one defined always wins), silently, through
eleven further modules, because **no Track 1 test could ever exercise
it**: Track 1 only reaches RCDATA/RAWTEXT/script-data via `forceState()`
plus a manually, consistently set `lastStartTagName` — it never drives a
*real*, tag-triggered entry into one of these modes followed by a
genuinely different closing tag name, because Track 1 has no tree
constructor to do the driving. Module A1's real tag-driven
`insertStartTag()` seam is the first thing in this whole course able to
reach this exact scenario — and building Module A2's sanitizer is what
first supplied an input, `<title><script>...`, that actually needed it to
work correctly.

**The fix:** rename the parametrized helper to `sharedEndTagOpenState`
(clearly distinct from the plain `endTagOpenState()`) and update its four
real callers (`rcdataEndTagOpenState`, `rawtextEndTagOpenState`,
`scriptDataEndTagOpenState`, `scriptDataEscapedEndTagOpenState`). Verified
before and after: `node --test` stayed 9/9 green through the whole
investigation (every existing test used a *matching* end tag name, so the
bug was invisible to all of them), and the exact repro case above changed
from a truncated tree to the correct, full literal text the instant the
rename was applied — confirmed by direct, isolated single-step tracing of
`Tokenizer.step()`, not by re-reading the source and assuming the fix
would work.

**Java never had this bug — verified, not assumed.** Java's
`Tokenizer.java` has the exact same two method names,
`endTagOpenState(State, State)` and `endTagOpenState()` — but Java
resolves overloaded methods by parameter signature at compile time, so
these are two genuinely distinct methods, not a silent shadowing pair.
A direct Java repro of the identical `<title><script>alert(1)</script></title>`
input, run before touching a single line of `Tokenizer.java`, produced the
correct result immediately. This is a real, concrete instance of a
language-design difference (structural method overloading vs. JavaScript's
single-namespace-per-class-body, last-definition-wins) silently
preventing a whole category of bug in one language while allowing it in
the other — not a hypothetical textbook example, but one this course
actually hit.

Both languages' Module A1 test suites now carry permanent regression
coverage for this exact scenario (`js/test.js`, `TokenizerTest.java`):
JS to prove the fix holds, Java to prove — and keep proving — that it
never needed one.

## What We Proved

- **The exact divergence Module 16 found against a real browser is now
  resolved.** `<textarea>x&amp;<b>y</textarea>` produces one `TextNode`
  with data `"x&<b>y"` — entities decoded, `<b>` left as literal text,
  not parsed as a tag — instead of the pure tokenizer's corrupted split.
- **`<script>if (a<b) { console.log("hi"); }</script>` now produces
  exactly the string a real browser's `DOMParser` produced in Module
  16's differential test** (`"if (a<b) { console.log(\"hi\"); }"`,
  verbatim, independently verified there) — the phantom `<b)>` tag from
  the pure-tokenizer run in Module 16 is gone, because the tokenizer is
  now correctly switched into `SCRIPT_DATA` before it ever sees the `<`
  inside the script body.
- **35/35 Java checks and 9/9 JS tests pass**, run for real, covering:
  the two resolved divergences above, a real `</script>` end tag actually
  closing the element (proving the appropriate-end-tag-token machinery
  Module 5 built now has a live caller), a realistic nested document with
  a doctype/head/body/attributes/text, comments, void elements never
  gaining children, self-closing tags never gaining children, an
  unmatched end tag being safely ignored rather than crashing, and
  adjacent character tokens coalescing correctly.
