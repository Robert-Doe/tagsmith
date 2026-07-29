# tagsmith

A spec-accurate HTML5 tokenizer, built state-by-state from the W3C/WHATWG tokenization algorithm, in parallel JavaScript and Java.

## What this is

This course implements the HTML5 tokenization state machine ([HTML5 Tokenization, section 8.2.4](https://dev.w3.org/html5/spec-LC/tokenization.html#data-state)) directly from the spec text: 69 named states, the input-stream preprocessing rules, and the shared "consume a character reference" algorithm. Every module ships two complete, independently written and tested implementations of the same states — vanilla JavaScript on Node with zero npm dependencies, and vanilla Java with zero build tooling — so that "the tokenizer works" means it works twice, in two type systems, not once.

It exists because most claims about browser parsing security — why a sanitizer regex is not a substitute for a real tokenizer, why mutation XSS happens, why `innerHTML` and `document.write` can disagree about the same bytes — are usually taken on faith. This project is part of a personal research program for a PhD security researcher who wants every one of those claims grounded in a tokenizer they wrote themselves, state by state, and then deliberately tried to break. Track 2 of this course exists specifically to reproduce named, real vulnerability classes and trace each one to the exact spec state responsible, rather than writing them off as "browser bugs."

## Track 1: the tokenizer core engine

Builds the state machine itself, grouped the way the spec's own prose groups related states (e.g. RCDATA plus its sub-states are taught together because they only make sense relative to each other).

| # | Module | What it proves | Directory |
|---|--------|-----------------|-----------|
| 1 | Token Types & Machine Skeleton | A single dispatch loop switching on a `state` variable is sufficient scaffolding to hold all 69 spec states before any are implemented | [`modules/01-skeleton/`](modules/01-skeleton/) |
| 2 | Input Stream Preprocessing | Newline normalization (CR/CRLF to LF) and EOF handling must happen before any state runs | [`modules/02-input-stream/`](modules/02-input-stream/) |
| 3 | Data State | Bare text becomes Character tokens; `&` and `<` are the only characters that divert data state elsewhere | [`modules/03-data-state/`](modules/03-data-state/) |
| 4 | Character Reference Consumption | One shared algorithm decodes `&amp;`, `&#38;`, and `&#x26;` to the same character regardless of caller | [`modules/04-char-ref/`](modules/04-char-ref/) |
| 5 | RCDATA / RAWTEXT / PLAINTEXT Families | `<textarea>`, `<title>`, `<style>`, `<plaintext>` content is not re-tokenized as markup | [`modules/05-rcdata-rawtext/`](modules/05-rcdata-rawtext/) |
| 6 | Script Data Base States | `<script>` content is text up to a literal `</script>` | [`modules/06-script-base/`](modules/06-script-base/) |
| 7 | Script Data Escaped States | `<!--` inside `<script>` flips an "escaped" sub-mode that changes how `</script>` is recognized | [`modules/07-script-escaped/`](modules/07-script-escaped/) |
| 8 | Script Data Double Escaped States | A nested `<script>` inside an escaped comment needs a second escape layer | [`modules/08-script-double-escaped/`](modules/08-script-double-escaped/) |
| 9 | Tag Open / End Tag Open / Tag Name | `<div class="x">` and `</div>` split correctly into tagged tokens before any attribute exists | [`modules/09-tag-open/`](modules/09-tag-open/) |
| 10 | Attribute Name & Value States | Duplicate attributes are dropped (keep-first); unquoted values terminate at whitespace/`>`/forbidden chars | [`modules/10-attributes/`](modules/10-attributes/) |
| 11 | Character Reference in Attribute Value | `&amp` without a semicolon decodes differently inside attributes, protecting query strings | [`modules/11-attr-char-ref/`](modules/11-attr-char-ref/) |
| 12 | Markup Declaration Open & Bogus Comment | `<!--`, `<!DOCTYPE`, and everything else after `<!` are dispatched by fixed lookahead | [`modules/12-markup-declaration/`](modules/12-markup-declaration/) |
| 13 | Comment States | `-->`, malformed `--!>`, and internal `--` are each handled to reject ambiguous close sequences | [`modules/13-comments/`](modules/13-comments/) |
| 14 | DOCTYPE States | Modern and legacy `PUBLIC`/`SYSTEM` doctypes tokenize correctly; malformed ones set force-quirks | [`modules/14-doctype/`](modules/14-doctype/) |
| 15 | CDATA Section State | `<![CDATA[ ]]>` is a foreign-content (SVG/MathML) escape hatch, not a general HTML feature | [`modules/15-cdata/`](modules/15-cdata/) |
| 16 | Full Integration & Differential Testing | All 68 states wired together match a reference tokenizer on real HTML, live-verified against a real browser | [`modules/16-integration/`](modules/16-integration/) |

## Track 2: applied layer — what the token stream is for, and where it breaks

| # | Module | What it proves | Directory |
|---|--------|-----------------|-----------|
| A1 | Minimal Tree Construction | An insertion-mode-driven tree builder over the token stream produces a correct DOM-like tree | [`modules/a1-tree-construction/`](modules/a1-tree-construction/) |
| A2 | An HTML Sanitizer Built on the Real Tokenizer | A sanitizer that respects RAWTEXT/script-data boundaries works; a hand-rolled regex sanitizer provably cannot | [`modules/a2-sanitizer/`](modules/a2-sanitizer/) |
| A3 | Parser Differentials & Mutation XSS | Named real-world vulnerability classes (innerHTML vs. document.write context mismatches, mutation XSS) trace to specific spec states | [`modules/a3-security/`](modules/a3-security/) |

Supporting material: [`ROADMAP.md`](ROADMAP.md) (full build log and phase breakdown), [`GLOSSARY.md`](GLOSSARY.md) (65+ terms, each tagged with the module it's first introduced in), [`prerequisite.html`](prerequisite.html) and [`prerequisites/`](prerequisites/) (finite state machines, input streams/iterators, lookahead & reconsume, code points vs. UTF-16).

## Tech stack

- **Languages, full parity:** every module ships independent vanilla JavaScript (Node.js, zero npm dependencies) and vanilla Java (JDK, zero build tooling) implementations of the same state machine, in `js/` and `java/` subdirectories. Both use real class-based OOP — a `Token` hierarchy, a `State` enum/constant set, and a `Tokenizer` class.
- **Testing:** JS uses Node's built-in `node:test` + `node:assert`. Java uses a small hand-rolled zero-dependency assertion harness (`Check.java`) run from `main()` — no JUnit/Maven/Gradle. Every module runs with nothing but `javac`/`java` and `node`.
- **Reference oracle:** for Module 16 and Track 2, the host browser's own tokenizer (via `DOMParser` in JS; a headless-browser diff on the Java side) is used only to diff against, never to copy from.
- **Docs per module:** `tutorial.html` (Head First-style, concept/pseudocode only, shared dark theme via `assets/style.css`), `DECISIONS.md` (every design choice tagged spec-forced / externally-forced / course convention), and per-language `CODE_WALKTHROUGH.md` files with real code and real captured test output.
- **Explicitly out of scope:** full DOM/CSSOM, rendering/layout, the complete HTML5 tree-construction algorithm (Track 2's tree builder is intentionally minimal), states from later spec revisions not in this snapshot, and any third-party parsing/regex library.

## Status

Both tracks complete. All 68 spec states implemented and independently tested in JavaScript and Java (every suite passing in both languages), plus a minimal tree constructor, a tokenizer-based sanitizer, and a live-verified account of how tokenizer-level correctness does and does not propagate to real application security — including two genuine discoveries made while building this material: a latent JavaScript-only tokenizer bug (Module A1) and a live-confirmed mutation-XSS mechanism (Module A3).

## How to explore / run the code

Each module directory contains `tutorial.html` (read this first — concept and pseudocode, no language syntax), `DECISIONS.md`, and a `js/` and `java/` implementation with its own `CODE_WALKTHROUGH.md`.

Run the JavaScript tests for a module (Node.js, no install step):

```bash
cd modules/01-skeleton/js
node --test
```

Run the Java tests for a module (JDK only, no build tool):

```bash
cd modules/01-skeleton/java
javac *.java
java Main
```

Module A3's live-browser verification and Module 16's differential testing additionally use the host browser's own `DOMParser` as a diffing oracle — see each module's `tutorial.html`/`DECISIONS.md` for exact reproduction steps.
