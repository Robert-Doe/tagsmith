# GLOSSARY.md

Alphabetical. Append-only — never rewritten from scratch, only inserted
into. Each entry tagged with where it was first introduced.

---

**Appropriate end tag token** — An end tag token whose tag name exactly
matches the name of whatever start tag most recently caused the tokenizer
to enter RCDATA/RAWTEXT/script-data. Only an appropriate end tag can
actually close the section. *First seen: Module 5.*

**Character reference** — The general name for `&`-prefixed sequences like
`&amp;`, `&#38;`, `&#x26;` that decode to a single character. *First seen:
Prerequisites (mentioned), fully covered Module 4.*

**Code point** — A single Unicode-assigned number naming one character
(e.g. `U+0041` for `A`). Distinct from a code unit — see below. *First
seen: Prerequisites.*

**Code unit** — One 16-bit chunk of a UTF-16-encoded string. Most
characters are one code unit; characters above `U+FFFF` need two (a
surrogate pair). JS and Java strings are sequences of code units, not code
points. *First seen: Prerequisites.*

**Consume** — Read the current input character and advance the stream's
position by one. Contrast with *peek* (read without advancing) and
*reconsume* (below). *First seen: Prerequisites.*

**CRLF** — Carriage Return (CR, U+000D) immediately followed by Line Feed
(LF, U+000A); the Windows-style line ending. Normalized to a single LF
during input-stream preprocessing. *First seen: Module 2.*

**Current input character** — The spec's term for whatever character is
under the stream's position marker right now — the thing a `consume()` call
would return. *First seen: Prerequisites.*

**Dispatch loop** — The `while` loop that repeatedly checks the tokenizer's
current state and routes to that state's handler logic. *First seen:
Module 1.*

**EOF (end-of-file)** — The signal that the input stream has no more
characters. Treated as a distinct outcome, not a character value. *First
seen: Prerequisites; first real handling: Module 1 (`Data` state's EOF
branch).*

**EOFToken** — The token type emitted when the tokenizer reaches EOF. Has
no fields. *First seen: Module 1.*

**Finite state machine (FSM)** — A model where a system is always in
exactly one of a fixed, known set of states, and moves between them based
only on the current state and the current input — never on prior history.
*First seen: Prerequisites.*

**Force-quirks flag** — A field on `DoctypeToken`, off by default, that
malformed DOCTYPEs get switched on; drives quirks-mode rendering decisions
downstream. *First seen: Module 1 (field defined); used starting Module 14.*

**Input stream** — The sequence of input characters plus a position marker
tracking how far you've read. *First seen: Prerequisites.*

**Longest match** — The rule that named-character-reference lookups try the
longest possible matching name before falling back to shorter ones, since a
shorter valid name can be a real prefix of a longer valid one. *First seen:
Module 4.*

**Lookahead** — Peeking at upcoming input characters (sometimes more than
one) to decide what to do next, without consuming them. *First seen:
Prerequisites.*

**Missing (as applied to DOCTYPE identifiers)** — The spec's distinct
initial value for `DoctypeToken`'s name/public identifier/system
identifier, deliberately different from the empty string `''`. Modeled as
`null` in both languages. *First seen: Module 1.*

**Named character reference** — A character reference identified by a name
rather than a number, e.g. `&amp;` or `&copy;`. This course implements a
documented ~25-entry subset of the real spec table. *First seen: Module 4.*

**NotImplementedError / NotImplementedException** — This course's
custom error type, thrown by any state without real logic yet; carries the
state's spec name and the module number that will implement it.
*First seen: Module 1.*

**Numeric character reference** — A character reference identified by a
decimal (`&#65;`) or hexadecimal (`&#x41;`) code point number. Four special
cases (0, out-of-range, surrogate, Windows-1252 range) override the literal
number. *First seen: Module 4.*

**Parse error** — A spec-defined signal that unusual (but not fatal) input
was seen; recorded, but tokenizing always continues afterward. Not the same
as "invalid, reject this document." *First seen: Module 3.*

**Preprocessing the input stream** — The spec's global step, run once
before tokenizing begins, that normalizes all line endings (CRLF and lone
CR both become LF). Not itself one of the 68 states. *First seen: Module 2.*

**Reconsume** — Switch to a new state and re-process the *same* character
again, without advancing the input stream's position a second time. *First
seen: Prerequisites; first real usage: Module 3.*

**State** — In a finite state machine, the one "room" (of a fixed, known
set) the machine currently occupies; determines how the next input is
interpreted. *First seen: Prerequisites; enumerated in full: Module 1.*

**STATE_MODULE_MAP** — Course-specific (not spec, not production code)
lookup table mapping each of the 68 states to the module number that
implements it. *First seen: Module 1.*

**Surrogate pair** — Two UTF-16 code units that together represent one
astral Unicode code point (above U+FFFF). Produced by, e.g., a numeric
character reference for an emoji. *First seen: Prerequisites (concept);
first real occurrence: Module 4.*

**Temporary buffer (tempBuffer)** — Scratch text accumulated while
tentatively trying to match a closing tag inside RCDATA/RAWTEXT; dumped as
literal characters if the match attempt fails. *First seen: Module 5.*

**Script data escape mechanism** — The `<!--`-triggered legacy behavior
inside `<script>` content that changes how `</script>` is recognized,
originally designed to hide script bodies from browsers that predate the
`<script>` tag. *First seen: Module 6 (entry point); built in Module 7.*

**Script data double escape mechanism** — The further nested mechanism
triggered by a literal `<script` appearing inside an already-hidden
comment; distinct from (not a recursive application of) the escape
mechanism itself. *First seen: Module 7 (seam); built in Module 8.* Notably
case-**sensitive**: matching the temp buffer against `"script"` uses exact
string equality, unlike every other tag-name comparison in this course,
which lowercases as it builds.

**Tree construction** — The spec stage that consumes the tokenizer's
output and builds the DOM, one layer above tokenizing. Critically, it is
also responsible for telling the tokenizer when to switch into
RCDATA/RAWTEXT/PLAINTEXT/script-data based on which tag was just seen —
the tokenizer alone never makes that decision. Out of scope for this
course's Track 1; a minimal version is built in Track 2, Module A1.
*First seen: Module 9.*

**Ambiguous ampersand** — The rule that a legacy, no-semicolon named
character reference is left undecoded if immediately followed by `=` or
an alphanumeric character, but only when consumed inside an attribute
value. Protects historical query strings like `href="?a=1&amp=2"` from
being wrongly decoded. *First seen: Module 11.*

**Scratch attribute (currentAttribute)** — The `{name, value}` pair being
built while tokenizing an attribute, held separately from the tag token's
real attribute list until its name is finished and the duplicate check
passes. *First seen: Module 10.*

**Bogus comment** — The fallback destination for any `<!...>`, `<?...>`,
or `</[non-letter]...>` sequence that doesn't match a recognized
declaration or valid tag — everything up to `>` (or EOF) becomes a real
`CommentToken`'s data, so no input is ever rejected outright. *First seen:
Module 12.*

**Give-back (dash give-back)** — When a provisional dash count turns out
not to be part of a real closing sequence, the dashes already
provisionally swallowed are appended to the token's data as literal
characters instead of being discarded, and the triggering character is
reconsumed. *First seen: Module 7; formalized as a named pattern in Module
13.*

**Quirks mode** — A rendering mode with looser, historically-compatible
layout rules, triggered by a missing or malformed DOCTYPE. This
tokenizer only ever sets the `forceQuirks` flag on a `DoctypeToken`;
actually rendering in quirks mode is a downstream, out-of-scope concern.
*First seen: Module 1 (field); exercised in Module 14.*

**Foreign content** — SVG or MathML markup embedded inside an HTML
document; the real-browser context in which `<![CDATA[` is actually
honored (outside it, real browsers fall back to a bogus comment). This
course's tokenizer takes the CDATA path unconditionally, since foreign-
content awareness is tree-construction context outside Track 1's scope.
*First seen: Module 12; discussed fully in Module 15.*

**Differential testing** — Verifying this course's tokenizer by comparing
its output against an independent reference implementation (a real
browser's `DOMParser`) on identical input, rather than relying only on
this course's own hand-written tests. *First seen: Module 16.*

**Open elements stack** — The tree constructor's list of currently-open
ancestor elements, from the document root down to whichever element is
still accepting new children. New nodes attach to whatever is on top of
the stack; an end tag searches the stack (top-down) for a matching
element to close. *First seen: Module A1.*

**Generic RCDATA/RAWTEXT element parsing algorithm** — The real HTML5
tree-construction spec's name for the exact seam Module 9 first proved
the tokenizer alone cannot own: switching the tokenizer into
RCDATA/RAWTEXT/script-data/PLAINTEXT based on which start tag was just
inserted. Predicted in Module 9, observed diverging from a real browser
in Module 16, implemented in Module A1. *First seen: Module 9 (as a
named gap); built: Module A1.*

**Void element** — An HTML element that can never have children (e.g.
`br`, `img`, `input`, `hr`) — real markup never needs, and this course's
tree builder never honors, a matching end tag for one. *First seen:
Module A1.*

**Text node coalescing** — Merging adjacent `CharacterToken`s into a
single `TextNode` while building a tree, since the tokenizer emits one
token per code point (Module 3) but a real DOM never represents ordinary
text as a run of separate adjacent text nodes. *First seen: Module A1.*

**Insertion mode** — The real HTML5 tree-construction spec's mechanism
for context-sensitive parsing rules ("in head," "in body," "in table," a
few dozen more), each with its own tag-specific behavior. This course's
Track 2 tree builder deliberately has none — one generic stack, no modes
— see Module A1's DECISIONS.md. *First seen: Module A1 (named, out of
scope).*

**Adoption agency algorithm** — The real spec's algorithm for correctly
handling genuinely misnested formatting elements (e.g.
`<b><i>x</b></i>`) by reparenting nodes rather than simply closing them
in stack order. This course's Track 2 tree builder uses a deliberately
simplified stand-in (`closeMatchingElement`) instead. *First seen:
Module A1 (named, out of scope).*

**Fragment parsing / context element** — The real HTML5 mechanism behind
`element.innerHTML = string`: the string is parsed as a standalone
fragment, but the tokenizer's *initial* state is chosen from the target
("context") element — RCDATA for `textarea`/`title`, RAWTEXT for
`style`/`xmp`, script-data for `script`, and so on — before a single
character is parsed. Distinct from Module A1's mid-stream tag-triggered
switching, though both consult the same underlying tag-name table.
*First seen: Module A3.*

**Mutation XSS (mXSS)** — A class of real, named web security bug where
text that is genuinely inert in one HTML parsing context becomes a live,
dangerous element when the exact same (unmodified) text is later
re-parsed in a different context — typically because an application read
already-parsed text back out of the DOM and reinserted it elsewhere
without re-sanitizing for the new destination. Verified in this course
against both its own tokenizer and a real, live browser DOM. *First seen:
Module A3.*

**Sanitizer (tokenizer-based)** — An HTML-cleaning approach that parses
input with a real tokenizer/tree builder and removes dangerous elements
and attributes from the resulting structure, rather than pattern-matching
the raw source text. Contrast with a *regex-based sanitizer*, which this
course showed can both over-remove legitimate content (a false positive)
and, by the same structural weakness, risks under-removing real threats
(a false negative) — see Module A2's DECISIONS.md and Brain Exercise.
*First seen: Module A2.*

**Method shadowing (JavaScript) vs. method overloading (Java)** — In a
JS class body, two methods declared with the same name silently
collide: the second definition replaces the first on the prototype, with
no error, and every call site resolves to whichever one was declared
last, regardless of how many arguments it's called with. Java instead
resolves same-named methods with different parameter lists as genuinely
distinct overloads, chosen by signature at compile time. This course hit
a real bug caused by exactly this JS behavior — see Module A1's
DECISIONS.md "A real discovery" section — and confirmed, by direct
execution, that the identically-named Java methods never collided in the
first place. *First seen: Module A1.*

**Token** — One discrete unit of output from the tokenizer: a DOCTYPE,
start tag, end tag, comment, character, or end-of-file token. *First seen:
Module 1.*

**Tokenizer** — The class/object implementing the state machine: holds the
input, position, current state, and emitted tokens, and exposes a `run()`
loop. *First seen: Module 1.*

**Transition** — In a finite state machine, the rule deciding the next
state (and any output) given the current state and current input. *First
seen: Prerequisites.*

**UTF-16** — The string encoding both JavaScript and Java use internally;
represents text as a sequence of 16-bit code units. See *code point* and
*code unit* above. *First seen: Prerequisites.*

**Windows-1252 replacement table** — A fixed, legacy table mapping numeric
character references in the 0x80–0x9F range to specific Unicode characters
(e.g. `&#128;` → €), for historical compatibility with Windows-1252-encoded
authoring. *First seen: Module 4.*
