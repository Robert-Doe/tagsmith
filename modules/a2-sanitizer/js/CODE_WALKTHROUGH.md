# Module A2 — JavaScript Code Walkthrough

Two new files: `Sanitizer.js` (the real, tokenizer-based implementation)
and `NaiveRegexSanitizer.js` (a realistic comparison point, used only in
`test.js`). `TreeBuilder.js`/`TreeNode.js`/`Tokenizer.js` are the exact
files Module A1 finished with, including its real bug fix.

## `sanitize()` — three phases, none of them touching raw text

```js
function sanitize(html) {
  const doc = new TreeBuilder(html).run();
  const clean = new DocumentNode();
  clean.doctype = doc.doctype;
  for (const child of doc.children) {
    const cleanChild = sanitizeNode(child);
    if (cleanChild !== null) clean.children.push(cleanChild);
  }
  return clean.children.map(serializeNode).join('');
}
```

Parse (via the real tokenizer + tree builder), then sanitize the
resulting *structure*, then serialize that structure back to a string.
At no point does any of this module's code run a pattern match against
the original HTML source — every decision ("is this a script element,"
"does this attribute's value start with `javascript:`") is made against
already-parsed, already-boundary-correct data.

## `sanitizeNode()` — dropping a subtree vs. filtering one

```js
function sanitizeNode(node) {
  if (node instanceof ElementNode) {
    if (DROPPED_ELEMENTS.has(node.tagName)) {
      return null;
    }
    const clean = new ElementNode(node.tagName, sanitizeAttributes(node.attributes));
    for (const child of node.children) {
      const cleanChild = sanitizeNode(child);
      if (cleanChild !== null) clean.children.push(cleanChild);
    }
    return clean;
  }
  ...
}
```

Returning `null` for a dropped element is the whole mechanism: the
caller (`sanitize()`, or this same function recursing into a parent's
children) simply skips pushing a `null` result, so the entire subtree —
including any further nested elements or text — disappears without ever
needing a separate "and also delete its children" step. Every other
element gets rebuilt fresh (`sanitizeAttributes` filters its attribute
list; children are recursively sanitized) rather than mutated in place,
so the original parsed tree from `TreeBuilder` is never touched.

## `sanitizeAttributes()` — checking real, resolved values

```js
function sanitizeAttributes(attributes) {
  return attributes.filter((attr) => {
    const name = attr.name.toLowerCase();
    if (EVENT_HANDLER_ATTR.test(name)) return false;
    if (URL_ATTRS.has(name) && DANGEROUS_URL_SCHEME.test(attr.value)) return false;
    return true;
  });
}
```

`attr.value` here is the fully-decoded string Modules 10–11 already
built — entities resolved, quoting already stripped away by the
tokenizer's own attribute-value states. `DANGEROUS_URL_SCHEME.test(...)`
is checking the real, final value a browser would actually navigate to,
not a raw substring of the original markup that might still contain
`&#106;avascript:` or similar encoded tricks — those were already
resolved into a plain `j` by the time this code ever sees the value.

## `serializeNode()` — why text gets re-escaped on the way back out

```js
function escapeText(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
```

Every `TextNode`'s `data` field holds fully-decoded text (Module 3's
Character tokens, already resolved by Module 4's character-reference
logic). Writing that decoded text directly into an HTML string without
re-escaping `&` and `<` would be wrong twice over: literal `&` would be
misread as the start of a new (probably bogus) character reference by
whoever re-parses this output, and literal `<` would be misread as a new
tag. This is the serializer's one genuinely delicate line — get it
wrong, and `sanitize()`'s output could reintroduce exactly the kind of
ambiguity this whole module exists to remove.

## Try it yourself — the divergence, run for real

```js
const html = '<title><script>alert(1)</script></title>';
console.log(sanitize(html));                 // <title>&lt;script>alert(1)&lt;/script></title>
console.log(naiveStripScript(html));         // <title></title>
```

Run this directly (`node -e "..."` or add a temporary `console.log` to
`test.js`) and compare: the real sanitizer's output, when re-parsed by
any real HTML parser, displays the literal text `<script>alert(1)</script>`
as the page's title — exactly the original author's intent. The naive
version's output has no title text at all. Nothing was unsafe in the
original input in the first place (RCDATA content is never executed as
script by any real browser) — the naive sanitizer's bug is a false
positive, not a missed attack, but it's exactly the class of bug
ROADMAP.md predicted for this module before a single line of it was
written: "only works correctly if it respects RAWTEXT/script-data state
boundaries."
