# Module 10 — JavaScript Code Walkthrough

`State.js`, `Token.js`, `Preprocess.js`, and `CharacterReference.js` are
unchanged — `Token.js`'s attributes array (a plain JS array of `{name,
value}` objects) was already exactly the shape this module needed, decided
back in Module 1. `Tokenizer.js` gains nine new methods and one new field.

## `currentAttribute`

```js
this.currentAttribute = null; // { name, value } not yet in currentToken.attributes
```

The key word is "not yet." An attribute is built up character by character
in this scratch field, entirely separate from `currentToken.attributes`,
and only gets pushed into that real array at one specific moment:
`finishAttributeName`.

## `finishAttributeName` — where the Module 1 decision pays off

```js
finishAttributeName(nextState) {
  const isDuplicate = this.currentToken.attributes.some((a) => a.name === this.currentAttribute.name);
  if (isDuplicate) {
    this.reportParseError('duplicate-attribute');
  } else {
    this.currentToken.attributes.push(this.currentAttribute);
  }
  this.state = nextState;
}
```

Four states funnel into this one method (`attributeNameState`'s three
"leave the name" branches — whitespace, `/`/`>`/EOF, and `=`) — every one
of them needs the identical duplicate-check-then-push behavior, so it's
factored out once rather than repeated three times.

## The nine new states, grouped by shape

- **Ignore-whitespace-and-stay**: `beforeAttributeNameState`,
  `afterAttributeNameState`, `beforeAttributeValueState` all have a branch
  that just `return`s without changing state — consuming and discarding
  whitespace is a real, distinct action, not a no-op.
- **The three value states** (`attributeValueDoubleQuotedState`,
  `attributeValueSingleQuotedState`, `attributeValueUnquotedState`) each
  write into `this.currentAttribute.value` instead of emitting character
  tokens — the same "accumulate into a field, not the token stream" pattern
  `tagNameState` established in Module 9 for NUL handling, now applied to
  every character in an attribute value, not just NUL.
- **`selfClosingStartTagState`** is the simplest: one branch sets
  `currentToken.selfClosing = true` before emitting.

## Try it yourself

In `finishAttributeName`, change `this.currentToken.attributes.push(...)`
to run unconditionally (delete the `if (isDuplicate)` branch entirely, always
push). Rerun the tests — the duplicate-attribute test should now show
*two* entries for `"a"` instead of one. This is the exact bug a `Map`
based attributes structure would have produced silently, with no error at
all — worth comparing against Module 1's original DECISIONS.md reasoning.
