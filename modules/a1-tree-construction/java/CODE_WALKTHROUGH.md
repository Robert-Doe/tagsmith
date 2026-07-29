# Module A1 — Java Code Walkthrough

Two new files this module: `TreeNode.java` (the tree's node types,
including a small `Doctype` record class) and `TreeBuilder.java` (the
class that closes the gap Module 9 and Module 16 both documented).
`Tokenizer.java` gained exactly **one** new line: a public `isHalted()`
accessor, since `halted` was `private` and every earlier module only
ever needed the internally-looping `run()`.

## The one-line addition to `Tokenizer.java`

```java
/** Module A1 needs to drive step() one call at a time (never run()) so
 * tree construction can intervene between steps -- see TreeBuilder. */
public boolean isHalted() {
    return halted;
}
```

Everything else in `Tokenizer.java` — `state`, `lastStartTagName`,
`tokensSoFar()` — was already visible enough (`state` and
`lastStartTagName` are package-private with no modifier;
`tokensSoFar()` was already `public`, added back in Module 16 so a
throwing `run()` still left inspectable partial output). `halted` was
the one field genuinely locked down, so it's the one field that got a
minimal, single-purpose accessor added — not a general visibility
relaxation.

## `TreeBuilder.run()` — the one-step-at-a-time loop

```java
public DocumentNode run() {
    while (!tokenizer.isHalted()) {
        int before = tokenizer.tokensSoFar().size();
        tokenizer.step();
        List<Token> tokens = tokenizer.tokensSoFar();
        for (int i = before; i < tokens.size(); i++) {
            processToken(tokens.get(i));
        }
    }
    return document;
}
```

Same shape as the JS version, adapted to Java's checked collection API:
snapshot the token count, call `step()` once, process whatever tokens
appeared since the snapshot. Calling `tokenizer.run()` here instead would
compile fine and even pass most of this module's tests — but it would
already be too late for the two tests that matter most (`textarea` and
`script`), because by the time `run()` returns, the tokenizer already
finished tokenizing their contents as ordinary markup.

## `insertStartTag()` — casting `Token` down to `StartTagToken` and mutating the tokenizer directly

```java
private void insertStartTag(StartTagToken token) {
    ElementNode el = new ElementNode(token.tagName, token.attributes);
    currentNode().children.add(el);
    if (token.selfClosing || VOID_ELEMENTS.contains(token.tagName)) { return; }
    stack.add(el);
    if (RCDATA_ELEMENTS.contains(token.tagName)) {
        tokenizer.state = State.RCDATA;
        tokenizer.setLastStartTagName(token.tagName);
    } else if (RAWTEXT_ELEMENTS.contains(token.tagName)) {
        ...
    }
    ...
}
```

`processToken(Token token)` receives the shared `Token` base type (same
pattern Module 1 established for the whole token hierarchy) and uses an
`instanceof` check plus a cast to narrow it to `StartTagToken` before
calling this method — normal Java polymorphism, nothing new. The
interesting line is still `tokenizer.state = State.RCDATA;`: a direct
field write from one class into another, because `state` was left
package-private specifically so code living in the same directory (same
default package) could do exactly this. `lastStartTagName` uses the
existing `setLastStartTagName()` setter from Module 5 rather than a raw
field write, since that setter already existed and this module didn't
need to add a second way to do the same thing.

## `TreeNode.java`'s `Doctype` — an immutable record instead of a mutable field bag

```java
class Doctype {
    final String name;
    final String publicId;
    final String systemId;
    final boolean forceQuirks;
    Doctype(String name, String publicId, String systemId, boolean forceQuirks) { ... }
}
```

The JS side stores the doctype as a plain `{ name, publicId, systemId,
forceQuirks }` object literal; Java has no equivalent lightweight literal
syntax, so this module uses a small class with `final` fields set once in
the constructor — the direct Java translation of "an immutable snapshot
of four values," not a functional change from the JS shape.

## `closeMatchingElement()` — index-walking a `List` instead of an array

```java
private void closeMatchingElement(String tagName) {
    for (int i = stack.size() - 1; i >= 1; i--) {
        TreeNode node = stack.get(i);
        if (node instanceof ElementNode && ((ElementNode) node).tagName.equals(tagName)) {
            while (stack.size() > i) { stack.remove(stack.size() - 1); }
            return;
        }
    }
}
```

JS can truncate an array in one line (`stack.length = i`); `java.util.List`
has no equivalent single call, so this is a small `while` loop popping
from the end until the size matches — mechanically different, same
result as the JS version's truncation.

## Try it yourself — verified, not assumed, and a second real Java crash-truncation case

Comment out the line `tokenizer.state = State.RCDATA;` inside
`insertStartTag`'s `RCDATA_ELEMENTS` branch (leaving
`setLastStartTagName` alone), recompile, and rerun. Verified real
result, and not what you might expect from the JS side's version of this
same experiment (see `js/CODE_WALKTHROUGH.md`, where the analogous change
produces one clean failure): **11 checks pass, 2 fail cleanly** (`textarea
has exactly one child` and `textarea content is 'x&<b>y' (tags literal,
entities decoded)`) — **and then the 14th check crashes the whole run**:

```
  PASS - title tag name is title
  PASS - title has exactly one child
Exception in thread "main" java.lang.ClassCastException: class ElementNode
  cannot be cast to class TextNode ...
```

Why: `RCDATA_ELEMENTS` contains **both** `textarea` and `title`, so
disabling the state switch breaks both of them, not just the one this
module's original bug hunt happened to involve. With the switch gone,
`<title><script>alert(1)</script></title>` never enters `RCDATA` either
— the tokenizer parses `<script>` as a real nested start tag, so
`title.children.get(0)` is an `ElementNode`, not the `TextNode` the test
unconditionally casts it to. That cast throws, uncaught, and — exactly
as Module 16 found for a missing dispatch branch — every one of the
remaining ~29 checks after it, plus the final `Check.summary()` line,
never runs at all. This is the same structural weakness Module 16
documented, now triggered by a completely different *kind* of bug (a
wrong value flowing into an unchecked cast, not a missing dispatch
branch) — worth noticing that it's the **un-isolated nature of this
hand-rolled harness**, not the specific bug, that decides whether a
failure stays clean or takes the rest of the run down with it.
