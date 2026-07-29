# Module 13 — DECISIONS.md

## (a) Forced by the spec

- **`<!-->` and `<!--->` are both "abrupt closing of an empty comment"**
  — the same parse error, from two different states
  (`COMMENT_START`/`COMMENT_START_DASH`), for the same underlying reason:
  a comment that closes before ever having two confirmed opening dashes
  worth of content.
- **Extra dashes immediately before a real close become literal data**,
  not a chain of nested closes. `<!--hi---->` has data `"hi--"`: the last
  two of the four trailing dashes are the real `-->`, and the first two
  are "given back." Verified directly, and independently re-verified by
  deliberately breaking exactly this rule and confirming exactly one test
  catches it.
- **`--!>` is a valid, if erroring, way to close a comment** —
  `incorrectly-closed-comment`, not a hard failure. This is genuine legacy
  tolerance: some very old authoring tools produced this exact sequence,
  and the spec accepts it rather than treating it as unrecoverable.
- **`--!` not immediately followed by `>` gives back all three characters
  as literal data** (`"--!"`), and if what follows is `-`, that dash
  starts an entirely fresh close attempt (routes to `COMMENT_END_DASH`,
  not back to plain `COMMENT`) — a real, specific distinction verified
  with a dedicated test (`--!-->` produces different intermediate state
  handling than `--!x-->`, though both ultimately close correctly).
- **This spec snapshot has no `<` handling inside comments** — six states
  total, matching the original spec table of contents fetched for this
  course's Module 1, not the larger set some later WHATWG revisions add.

## (b) Forced by an external contract

- None new. `currentToken` (a `CommentToken`, set up by Module 12) is
  simply the state this family accumulates into — no new cross-module
  field was needed.

## (c) Our convention

- **Each of the six states was written directly, not built on a shared
  helper**, unlike the RCDATA/RAWTEXT/script-data end-tag-name family
  (Modules 5–9), which shares real structure. Comment states' dash-
  counting shape looks similar to Modules 7–8's escape mechanisms on the
  surface, but the specific give-back rules (one dash vs. two dashes vs.
  three characters) differ enough at each step that a shared parametrized
  helper would have needed as many special cases as it saved lines.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | Both premature closes report the same `abrupt-closing-of-empty-comment` | (a) forced by spec |
| 2 | Extra pre-close dashes become literal data, not nested closes | (a) forced by spec |
| 3 | `--!>` closes the comment (with a parse error) | (a) forced by spec |
| 4 | `--!` gives back 3 characters together; a following `-` starts fresh | (a) forced by spec |
| 5 | No `<` handling in this spec snapshot (6 states, not more) | (a) forced by spec (scope, matches Module 1's TOC) |
| 6 | Each state written directly, no shared helper | (c) convention |

## What We Proved

- A complete, real HTML comment (`<!--hello-->`) tokenizes correctly
  starting from plain Data state — the first time this course has run a
  comment through the *entire* pipeline (Data → Tag Open → Markup
  Declaration Open → the comment family → back to Data) in one single
  test, rather than force-starting mid-stream.
- Every one of the six states' distinct "give back what I provisionally
  swallowed" rules was independently verified — not just that a comment
  eventually closes, but that the exact bytes it closes with match the
  spec's dash-by-dash accounting.
- A deliberately introduced, realistic bug (forgetting to append an extra
  dash) was caught by exactly the test built to catch it, in both
  languages — continuing this course's now-established pattern of
  verifying its own "Try it yourself" claims by actually breaking the code
  and reading the real output, not by reasoning about it on paper.
