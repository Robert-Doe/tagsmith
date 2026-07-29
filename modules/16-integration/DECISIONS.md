# Module 16 — DECISIONS.md

## (a) Forced by the spec

- Nothing new — this module adds zero tokenizer behavior. Every decision
  here is about how to *verify* the 68 states Modules 1–15 already built,
  not what those states should do.

## (b) Forced by an external contract

- **The differential test's oracle is a real, live browser's
  `DOMParser`**, run in this actual course-building session via the
  `Claude_Browser` tool — not simulated, not asserted from general
  knowledge of how browsers behave. Exact transcripts below.

### Differential test 1 — the realistic page

The exact `REALISTIC_PAGE` HTML string from this module's tests, parsed
via `new DOMParser().parseFromString(html, 'text/html')` in a real browser:

```json
{
  "tagSequence": ["html","head","meta","title","body","div","p","br","img"],
  "divAttrs": [{"name":"class","value":"main"},{"name":"data-id","value":"42"}],
  "titleText": "Test & Page",
  "pText": "Hello & welcome, <friend>!",
  "doctypeName": "html"
}
```

This tokenizer's output for the identical string (already verified via
`test.js`/`TokenizerTest.java`): the same start-tag sequence, the same two
`div` attributes with the same values, `&amp;` and `&lt;`/`&gt;` decoded
identically in both the title and the paragraph text, and the same
doctype name. **Every measured dimension matches exactly.**

### Differential test 2 — where this tokenizer legitimately diverges

The `<script>if (a<b) { console.log("hi"); }</script>` snippet, same
real-browser `DOMParser`:

```json
{
  "scriptFound": true,
  "scriptTextContent": "if (a<b) { console.log(\"hi\"); }",
  "tagSequence": ["html","head","script","body"]
}
```

A real browser correctly treats the entire script body as text and
produces exactly four elements. This course's pure tokenizer — run on the
identical string, no tree construction driving it — instead produces a
`StartTagToken("script")` immediately followed by a
`StartTagToken("b)")`, and the real `</script>` end tag is never reached
at all (Module 9's EOF-discards-the-tag rule swallows the rest). **This
divergence is expected, understood, and exactly what Module 9 predicted**
— proof, not assertion, that tree construction (Track 2, Module A1) is
not an optional refinement but a structural requirement for correct
`<script>` handling.

## (c) Our convention

- **The completeness check probes every state directly** (force-set +
  single `step()`), rather than trying to construct real markup that
  reaches all 68 states through ordinary tokenizing — some states (like
  `CHARACTER_REFERENCE_IN_RCDATA`) are only reachable in a pure tokenizer
  via direct force-setting anyway, per this course's Module 9 finding
  that RCDATA/RAWTEXT/script-data are never entered from real markup
  without a tree constructor.
- **Java's completeness check uses a broad `catch (Exception e)`**
  around each probe, deliberately, since the minimal shared fixture
  object doesn't match every state's expected concrete token type —
  the test's only real assertion is "did `NotImplementedException`
  specifically fire," and every other exception from the mismatched
  fixture is expected noise.

## What We Proved

- **All 68 states are genuinely complete** — not just "the last module
  built didn't throw," but directly, individually probed, one at a time,
  in both languages.
- **A complete, realistic HTML document — doctype, comment, nested tags,
  attributes, entities in both attribute and text content, a self-closing
  tag — tokenizes with zero parse errors**, and its exact token shape was
  asserted against a hand-verified expected sequence, not just "didn't
  crash."
- **This tokenizer's output was checked against a real, live browser and
  found to match exactly** on a realistic document, and **found to
  diverge in a specific, predicted, understood way** on a script tag
  containing ordinary comparison syntax — both outcomes are real evidence,
  not claims.
- **A genuine, unplanned discovery**: JS's `node:test` isolates each test
  so one failure doesn't prevent others from running and being reported;
  this course's hand-rolled Java `Check` harness has no such isolation,
  and an uncaught exception mid-run silently truncates every check after
  it, including the final pass/fail summary. Found by actually running
  the same deliberate-bug experiment in both languages and noticing they
  behaved differently — not predicted in advance, and worth knowing before
  trusting a Java `Check.summary()` count of "0 failed" as proof nothing
  crashed earlier in the run.
