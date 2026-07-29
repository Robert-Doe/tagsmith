# ROADMAP.md — Browser Tokenization, Built From Scratch

**Source spec:** [HTML5 Tokenization, §8.2.4](https://dev.w3.org/html5/spec-LC/tokenization.html#data-state) (W3C LC, the same algorithm published at WHATWG). 69 named states plus preprocessing rules and the shared "consume a character reference" algorithm.

**Audience:** PhD student preparing to defend knowledge of browser tokenization at a comprehensive exam. Optimized for causal understanding of *why* every transition is shaped the way it is, not for shipping a parser.

---

## Track 1: The Tokenizer Core Engine

This track builds the state machine itself, state by state, grouped the way the spec's own prose groups them (a state and its "family" of sibling states — e.g. RCDATA plus its less-than-sign/end-tag-open/end-tag-name sub-states — are taught together because they only make sense in relation to each other).

| # | Module name | What it proves | Directory | Status |
|---|---|---|---|---|
| 1 | Token Types & Machine Skeleton | A single dispatch loop that reads one input character at a time and switches on a `state` variable is sufficient scaffolding to hold all 69 spec states, before any of them are implemented | `modules/01-skeleton/` | **Built ✅ (JS: 8/8 tests pass, Java: 14/14 pass)** |
| 2 | Input Stream Preprocessing | Newline normalization (CR/CRLF → LF) and EOF handling must happen *before* any state runs, or every later state's character comparisons would be wrong | `modules/02-input-stream/` | **Built ✅ (JS: 13/13, Java: 18/18)** |
| 3 | Data State | Bare text between tags becomes Character tokens, and `&` and `<` are the only two characters that ever divert the data state elsewhere | `modules/03-data-state/` | **Built ✅ (JS: 11/11, Java: 15/15)** |
| 4 | Character Reference Consumption | One shared algorithm (named refs, decimal, hex, and the legacy Windows-1252 numeric-replacement table) correctly decodes `&amp;`, `&#38;`, and `&#x26;` to the same character, independent of which state invoked it | `modules/04-char-ref/` | **Built ✅ (JS: 19/19, Java: 19/19)** |
| 5 | RCDATA / RAWTEXT / PLAINTEXT Families | `<textarea>`, `<title>`, `<style>`, and `<plaintext>` content is *not* re-tokenized as markup — only an "appropriate end tag token" (one matching the open tag's name) can close them | `modules/05-rcdata-rawtext/` | **Built ✅ (JS: 14/14, Java: 13/13)** |
| 6 | Script Data Base States | `<script>` content is emitted as text up to a literal `</script>`, using the same appropriate-end-tag-token rule as module 5 | `modules/06-script-base/` | **Built ✅ (JS: 9/9, Java: 8/8)** |
| 7 | Script Data Escaped States | A `<!--` inside `<script>` content flips the tokenizer into an "escaped" sub-mode that changes how `</script>` is recognized — the mechanism browsers use to stay compatible with `<script>` blocks written for pre-`<script>`-aware browsers | `modules/07-script-escaped/` | **Built ✅ (JS: 12/12, Java: 11/11)** |
| 8 | Script Data Double Escaped States | A *nested* `<script>` inside an escaped comment (`<!--<script>...</script>-->`) is handled by a second escape layer, and the spec's state graph — not any inherent complexity in scripting — is what makes this work | `modules/08-script-double-escaped/` | **Built ✅ (JS: 10/10, Java: 9/9)** |
| 9 | Tag Open / End Tag Open / Tag Name | `<div class="x">` and `</div>` are correctly split into a StartTag/EndTag token with the tag name, before any attribute exists | `modules/09-tag-open/` | **Built ✅ (JS: 17/17, Java: 16/16)** |
| 10 | Attribute Name & Value States | Duplicate attribute names are silently dropped (keep-first), and unquoted attribute values terminate at whitespace, `>`, or a forbidden character — both are consequences of the exact state graph, not special-cased logic | `modules/10-attributes/` | **Built ✅ (JS: 18/18, Java: 17/17)** |
| 11 | Character Reference in Attribute Value | `&amp` (no semicolon) decodes differently inside an attribute value than in data state, because the "additional allowed character" rule only exists to protect query strings like `href="?a=1&b=2"` | `modules/11-attr-char-ref/` | **Built ✅ (JS: 11/11, Java: 10/10)** |
| 12 | Markup Declaration Open & Bogus Comment | `<!--` routes to comment parsing, `<!DOCTYPE` routes to DOCTYPE parsing, and literally anything else after `<!` becomes a "bogus comment" — proving the dispatch is a fixed lookahead, not a grammar | `modules/12-markup-declaration/` | **Built ✅ (JS: 12/12, Java: 11/11)** |
| 13 | Comment States | `-->`, the malformed `--!>`, and comments containing internal `--` are each handled by distinct states, and the differences are there specifically to reject ambiguous close sequences | `modules/13-comments/` | **Built ✅ (JS: 13/13, Java: 12/12)** |
| 14 | DOCTYPE States | `<!DOCTYPE html>` and legacy `PUBLIC`/`SYSTEM` identifier doctypes both tokenize correctly, and malformed doctypes correctly set the force-quirks flag that later drives quirks-mode rendering | `modules/14-doctype/` | **Built ✅ (JS: 14/14, Java: 13/13)** |
| 15 | CDATA Section State | `<![CDATA[ ]]>` is only meaningful in foreign content (SVG/MathML) and becomes plain Character tokens, proving CDATA is a foreign-content escape hatch, not a general HTML feature | `modules/15-cdata/` | **Built ✅ (JS: 7/7, Java: 6/6)** |
| 16 | Full Integration & Differential Testing | All 68 states wired together reproduce the same token stream as a reference tokenizer on real-world HTML pages, closing the loop from "spec text" to "verified implementation" | `modules/16-integration/` | **Built ✅ (JS: 9/9, Java: 8/8) — live-verified against a real browser** |

**Phases:**
- *Phase 1: Bare Metal Foundation* — Modules 1–2
- *Phase 2: Plain Text & Character References* — Modules 3–5
- *Phase 3: The Script Data Minefield* — Modules 6–8
- *Phase 4: Tags & Attributes* — Modules 9–11
- *Phase 5: Comments & Markup Declarations* — Modules 12–13
- *Phase 6: DOCTYPE* — Module 14
- *Phase 7: Foreign Content & Capstone* — Modules 15–16

---

## Track 2: Applied Layer — What the Token Stream Is For, and Where It Breaks

The tokenizer alone is inert; it only matters because something consumes its tokens. This track is the "browser built on the kernel" layer: a minimal tree builder, then two applied modules that are standard territory in a browser-security-flavored comprehensive exam — a sanitizer built directly on your own tokenizer, and a study of real parser-differential/mutation-XSS bugs that exist *because* of specific tokenizer states.

| # | Module name | What it proves | Directory | Depends on (Track 1) | Status |
|---|---|---|---|---|---|
| A1 | Minimal Tree Construction | Feeding your token stream into a small insertion-mode-driven tree builder produces a correct DOM-like tree for a real document — demonstrating the tokenizer/tree-constructor boundary the spec itself draws | `modules/a1-tree-construction/` | Module 16 | **Built ✅ (JS: 11/11, Java: 43/43) — both real Module 16 divergences resolved, plus a real latent JS-only tokenizer bug found and fixed (see DECISIONS.md)** |
| A2 | An HTML Sanitizer Built on the Real Tokenizer | A sanitizer that strips `<script>` while preserving surrounding text only works correctly if it respects RAWTEXT/script-data state boundaries — a hand-rolled regex sanitizer provably cannot | `modules/a2-sanitizer/` | Modules 6–8, 9–10 | **Built ✅ (JS: 8/8, Java: 11/11) — regex-vs-tokenizer divergence proven real in both languages** |
| A3 | Parser Differentials & Mutation XSS | Specific, named real-world vulnerability classes (innerHTML vs. document.write tokenizer context mismatches, mutation XSS) trace directly to specific states in this spec, not to "bugs in browsers" | `modules/a3-security/` | Modules 5, 6–8, 11 | **Built ✅ (JS: 5/5, Java: 9/9) — the exact mutation-XSS mechanism live-verified against a real browser DOM** |

**Phases:**
- *Phase 8: The Consumer Side* — Module A1
- *Phase 9: Applied Security* — Modules A2–A3

---

## Recommended Stopping Points

| Goal | Stop at |
|---|---|
| Pass a comprehensive-exam question on the *core* character/tag/attribute machinery | Module 11 |
| Understand every state in the spec, including DOCTYPE and script-data escaping edge cases | Module 16 |
| Be able to defend the tokenizer's role in real browser security bugs (mXSS, parser differentials) | Module A3 (full course) |
| Just need the "one big analogy" mental model per concept, skipping implementation | Read `tutorial.html` §01 in every module, skip the code sections |

---

## Tools / Architecture Target

- **Languages:** **Full parity.** Every module ships two complete, independently built and tested implementations — vanilla JavaScript (Node.js, zero npm dependencies) and vanilla Java (JDK, zero build tool / zero external libraries) — living side by side in `js/` and `java/` subdirectories of the module folder. Both are real class-based OOP: a `Token` hierarchy, a `State` enum/constant set, and a `Tokenizer` class per language.
- **Testing:** JS uses Node's built-in test runner (`node:test` + `node:assert`). Java uses a small hand-rolled zero-dependency assertion harness (`Check.java`, reused per module) run from a `main()` method — no JUnit/Maven/Gradle, so every module still runs with nothing but `javac`/`java` and `node`. Every test is actually run and its real output captured before any doc claims what the code does.
- **Docs, per module:**
  - `tutorial.html` — Head First style (00–09 sections, shared dark theme, Playfair Display headers, one accent color per module). **Concept-only**: analogies, step-by-step behavior, state diagrams, and *pseudocode* for the algorithm. It never walks through actual JS or Java syntax — that explanation lives in the language subdirectories instead, so this file stays fast to read and language-agnostic.
  - `DECISIONS.md` — line/unit-by-unit rationale for the *shared* algorithm and data model, categorized (a) forced by spec, (b) forced by external contract, (c) our convention.
  - `js/CODE_WALKTHROUGH.md` and `java/CODE_WALKTHROUGH.md` — the actual code explanation, one per language, covering that language's real files with real excerpts and comments in the source itself.
- **Shared assets:** one root `assets/style.css` (design system, linked by every HTML page), a root `GLOSSARY.md` (alphabetical, append-only, "First seen: Module N"), and a root `prerequisite.html` index.
- **Reference oracle for Module 16 / Track 2:** the host environment's own browser tokenizer (via `DOMParser` in JS; a headless-browser diff for the Java side), used only to *diff against*, never copied from.
- **Explicitly out of scope:** full DOM/CSSOM implementation, rendering/layout, the complete HTML5 tree-construction algorithm (Track 2's tree builder is intentionally minimal), any state added in later spec revisions not present in this snapshot of the spec, and any third-party parsing/regex library in either language.

---

## Status

- Prerequisites layer: **Built ✅** — `prerequisite.html` index + 4 concept pages (Finite State Machines, Input Streams & Iterators, Lookahead & Reconsume, Code Points vs. UTF-16).
- **Track 1: Complete ✅ — all 16 modules built, tested (JS + Java, every suite passing), documented, and live-verified against a real browser (Module 16).** All 68 spec states implemented, individually and jointly proven correct.
- `GLOSSARY.md` (65+ terms) and `assets/style.css` (shared design system) actively maintained across all 19 modules.
- **Track 2: Complete ✅ — all 3 modules built, tested (JS + Java, every suite passing), documented, and live-verified against a real browser (Modules A1's divergence-resolution check and A3's mutation-XSS mechanism).**
  - A1: tree construction resolves both real-browser divergences Module 16 documented, plus a real latent JS-only tokenizer bug found, root-caused, and fixed (see A1's DECISIONS.md).
  - A2: a tokenizer-based sanitizer proven, in both languages, to diverge from a realistic naive regex sanitizer on a real, verified case.
  - A3: the real mutation-XSS mechanism (context-sensitive fragment parsing) reproduced in this course's own tokenizer and independently confirmed against a live browser DOM in the same session.

## Course Status: Complete

Both tracks are done. 68 spec states, built state-by-state with real,
passing tests in JavaScript and Java independently; a minimal but real
tree constructor; a sanitizer built directly on top of the tokenizer;
and a live-verified account of exactly how tokenizer-level correctness
does and doesn't propagate to real application security. Every module
has a Head First-style `tutorial.html` (concept/pseudocode only), a
`DECISIONS.md` (every design choice categorized as spec-forced,
externally-forced, or this course's own convention), and per-language
`CODE_WALKTHROUGH.md` files with real code and real, verified behavior —
including two genuine, previously-unknown discoveries (a latent
JavaScript-only tokenizer bug, and a live-confirmed mutation-XSS
mechanism) found by actually building and testing this material, not
assumed in advance.
