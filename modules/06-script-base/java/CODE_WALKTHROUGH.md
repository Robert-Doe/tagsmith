# Module 6 — Java Code Walkthrough

`State.java`, `Token.java`, `Preprocessor.java`, `CharacterReference.java`,
and `Check.java` are unchanged. `Tokenizer.java` gets one modified method
signature and four tiny new ones.

## The one change: `lessThanSignState` grows a third parameter

`lessThanSignState(State endTagOpenState, State returnState)` becomes
`lessThanSignState(State endTagOpenState, State returnState, State
bangState)`. Unlike JS, Java has no optional parameters — both existing
call sites (`rcdataLessThanSignState`, `rawtextLessThanSignState`) had to
be updated to explicitly pass `null`. This is a small but real cost of
Java's static arity: every call site is a hard compile error until it's
updated, which is arguably a feature here — nothing could silently keep
calling the old two-argument shape by accident.

## The four new wrappers

Identical in shape to the JS version — `scriptDataState`,
`scriptDataLessThanSignState`, `scriptDataEndTagOpenState`,
`scriptDataEndTagNameState`, each a one-line call into a Module 5 method.

## What's genuinely new: the `<!` branch

```java
if (bangState != null && next != null && next == '!') {
    consume();
    emit(new CharacterToken('<'));
    emit(new CharacterToken('!'));
    state = bangState;
    return;
}
```

Two null checks where JS needed one (`bangState !== undefined`) — Java's
`peek()` already returns a boxed, nullable `Character` (from Module 4), so
this branch has to guard both "was a bangState even requested" and "is
there actually a next character to compare."

## Try it yourself

Same experiment as the JS walkthrough: run a `Tokenizer` starting in
`SCRIPT_DATA` on `"a<!--b</script>"`, catch the `NotImplementedException`,
then call `.tokensSoFar()` and `.state` — you should see exactly a
`CharacterToken('a')`, `CharacterToken('<')`, `CharacterToken('!')`, and
`state == State.SCRIPT_DATA_ESCAPE_START`, with the rest of the input never
even looked at.
