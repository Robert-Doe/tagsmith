# Module 7 — JavaScript Code Walkthrough

`State.js`, `Token.js`, `Preprocess.js`, and `CharacterReference.js` are
unchanged. `Tokenizer.js` gains nine new methods; nothing existing was
modified (unlike Module 6, which had to touch `lessThanSignState`).

## The dash-counting chain

`scriptDataEscapeStartState` → `scriptDataEscapeStartDashState` →
`scriptDataEscapedDashDashState` is a small state machine *inside* the
state machine, whose entire job is counting consecutive dashes: zero dashes
means "never really a comment," one dash means "maybe," two-or-more means
"yes, and now watching for the `>` that closes it." Each of these states
individually is tiny — the complexity of Module 7 isn't in any one state,
it's in there being nine of them that all have to hand off to each other
correctly.

Notice `scriptDataEscapedDashDashState`'s `'-'` branch: it doesn't switch
state at all. Seeing a third, fourth, fifth dash in a row is meant to just
keep emitting dashes while staying exactly where it is — "more dashes"
never invalidates an already-confirmed dash-dash run, unlike a single dash
which is still provisional.

## `scriptDataEscapedState`, `scriptDataEscapedDashState`,
`scriptDataEscapedDashDashState`

All three share a shape you've seen before: consume, check `'-'`, check
`'<'`, check NUL, else plain emit. The genuinely new element in the dash
and dash-dash variants is that a "breaking" character (NUL or any ordinary
character) doesn't just emit — it also resets `this.state =
State.SCRIPT_DATA_ESCAPED`, explicitly stepping back down the dash count
to zero. Forgetting that one line is the single easiest way to introduce a
real bug here — try removing it (see "Try it yourself").

## `scriptDataEscapedLessThanSignState`

Deliberately *not* built on top of `lessThanSignState` — its "ASCII
letter" branch does something none of the three-argument version's
branches do: it emits `'<'` immediately, sets an empty temp buffer, and
switches into `SCRIPT_DATA_DOUBLE_ESCAPE_START` *without consuming the
letter*. That's a real, different shape from the `/`-branch pattern (which
always consumes into an end-tag-open state), so it earned its own method
rather than a fourth parameter bolted onto an already-three-parameter
helper.

## `scriptDataEscapedEndTagOpenState` / `scriptDataEscapedEndTagNameState`

Both are one-line calls into Module 5's `endTagOpenState`/`endTagNameState`
— proof that even nine states deep into the script-data family, the
"appropriate end tag" mechanism built in Module 5 needed zero changes to
keep working correctly.

## Try it yourself

In `scriptDataEscapedDashDashState`, delete the line
`this.state = State.SCRIPT_DATA_ESCAPED;` from the final `else` branch
(leave the emit call). Rerun the whole suite. Checked, not assumed: it
still reports **12/12 passing** — none of this module's tests happen to
construct input that exposes the gap. That's the real lesson here, more
than the bug itself: a fully green test suite is evidence tests you wrote
pass, not proof the code is correct for cases you didn't think to write a
test for. The bug is real — this line is what "forgets" that an ordinary
character breaks a dash run, so an input that goes `--`, then some text,
then a `>` before ever seeing a real second `-->` will close the escaped
section one comment too early. Try to construct a minimal input that
proves this by making the *final token stream* differ (not just an
internal state field) between the fixed and broken versions, then check
your construction by actually running both.
