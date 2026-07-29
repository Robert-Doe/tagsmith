# Module A3 — Java Code Walkthrough

No new files this module — the deliverable is a second constructor
(plus one small static helper) added to `TreeBuilder.java`, and
`TokenizerTest.java` proving what it unlocks. Java's lack of default
parameter values means this needed an actual overload, not just an
optional argument the way `TreeBuilder.js` handled it.

## Two constructors, one delegating to the other

```java
public TreeBuilder(String html) {
    this(html, null);
}

public TreeBuilder(String html, String contextTagName) {
    this.tokenizer = new Tokenizer(html);
    if (contextTagName != null) {
        this.tokenizer.state = contextInitialState(contextTagName);
        this.tokenizer.setLastStartTagName(contextTagName);
    }
    this.stack.add(document);
}
```

`this(html, null)` is Java's constructor-chaining syntax: the
single-argument constructor is now purely a convenience wrapper around
the two-argument one, guaranteeing there's exactly one place the actual
setup logic lives. `contextTagName` is `null` to mean "no context" (a
plain top-level parse, Module A1's original behavior) — the direct Java
analogue of `TreeBuilder.js` checking `contextTagName !== undefined`.

## `contextInitialState()` — a `static` method, since it needs no instance state

```java
static State contextInitialState(String contextTagName) {
    if (RCDATA_ELEMENTS.contains(contextTagName)) return State.RCDATA;
    if (RAWTEXT_ELEMENTS.contains(contextTagName)) return State.RAWTEXT;
    if (contextTagName.equals("script")) return State.SCRIPT_DATA;
    if (contextTagName.equals("plaintext")) return State.PLAINTEXT;
    return State.DATA;
}
```

Package-private `static` (no `private`, no instance `this` needed) —
called once, from the constructor, before the object it would otherwise
belong to has finished being built. Same four checks as
`insertStartTag()`'s mid-stream version from Module A1, translated
directly: `Set.contains()` in place of JS's `Set.has()`, `.equals()` in
place of `===` for string comparison (a real, easy-to-forget Java
gotcha this whole course has been careful about since Module 1).

## `TokenizerTest.java`'s closing check — Java's method-reference stream API doing the same job as JS's `Array.find`

```java
img.attributes.stream().anyMatch(a -> a.name.equals("onerror") && a.value.equals("alert(1)"));
```

The JS version writes
`img.attributes.find((a) => a.name === 'onerror').value === 'alert(1)'`
— find the attribute, then check its value. The Java version folds both
steps into one `anyMatch` predicate over the stream, avoiding a
null-check on the `find` result (JS's `.find()` returns `undefined` if
nothing matches; Java's `Optional`-avoiding `anyMatch` just returns
`false`) — a small, deliberate difference in how each language's
standard library nudges you toward writing this kind of "does some
element satisfy X" check safely.

## Try it yourself — confirming the table is really shared, not duplicated

Replace `"textarea"` with `"title"` in the final test block's first
`TreeBuilder` call, recompile, and rerun. Because `title` is in the same
`RCDATA_ELEMENTS` set `textarea` is, every check still passes unchanged
— direct, runnable confirmation that this module's context mechanism and
Module A1's mid-stream mechanism really do draw from the exact same
underlying classification, not two independently-maintained copies of
it that happen to agree today.
