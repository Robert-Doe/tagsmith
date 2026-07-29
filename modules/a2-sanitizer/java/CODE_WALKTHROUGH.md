# Module A2 — Java Code Walkthrough

Two new files: `Sanitizer.java` (the real, tokenizer-based
implementation) and `NaiveRegexSanitizer.java` (a realistic comparison
point, used only in `TokenizerTest.java`). `TreeBuilder.java`/
`TreeNode.java`/`Tokenizer.java` are the exact files Module A1 finished
with — including the confirmation that Java never needed A1's JS-only
bug fix in the first place.

## `sanitize()` — the same three phases as the JS version

```java
public static String sanitize(String html) {
    DocumentNode doc = new TreeBuilder(html).run();
    StringBuilder out = new StringBuilder();
    for (TreeNode child : doc.children) {
        TreeNode cleanChild = sanitizeNode(child);
        if (cleanChild != null) {
            out.append(serializeNode(cleanChild));
        }
    }
    return out.toString();
}
```

Same shape as `Sanitizer.js`'s `sanitize()`: parse with the real
tokenizer/tree builder, sanitize the resulting structure, serialize back
to a string — never a pattern match against the raw source. Java's
`StringBuilder` replaces JS's `Array.map().join('')`, mechanically
different, same result.

## `sanitizeNode()` — `instanceof` plus a `null` return standing in for "delete this subtree"

```java
static TreeNode sanitizeNode(TreeNode node) {
    if (node instanceof ElementNode) {
        ElementNode el = (ElementNode) node;
        if (DROPPED_ELEMENTS.contains(el.tagName)) {
            return null;
        }
        ...
        ElementNode clean = new ElementNode(el.tagName, cleanAttrs);
        for (TreeNode child : el.children) {
            TreeNode cleanChild = sanitizeNode(child);
            if (cleanChild != null) {
                clean.children.add(cleanChild);
            }
        }
        return clean;
    }
    ...
}
```

Same recursive-`null`-propagation trick as the JS version: a dropped
element's `sanitizeNode` call returns `null`, and every caller (this
method recursing into a parent's children, or `sanitize()` itself at the
document's top level) simply skips appending a `null` result — the
entire subtree vanishes in one place, with no separate "walk and delete
children" step anywhere.

## `isDangerousAttribute()` — a compiled `Pattern`, checked once per attribute

```java
private static final Pattern DANGEROUS_URL_SCHEME =
    Pattern.compile("^\\s*javascript:.*", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

private static boolean isDangerousAttribute(Attribute attr) {
    String name = attr.name.toLowerCase();
    if (name.startsWith("on")) { return true; }
    if (URL_ATTRS.contains(name) && DANGEROUS_URL_SCHEME.matcher(attr.value).matches()) { return true; }
    return false;
}
```

`Pattern.DOTALL` matters here specifically because `attr.value` is
already the fully-decoded attribute value (Modules 10–11) and could in
principle contain newline characters carried through from the source
(e.g. inside a double-quoted attribute value spanning lines) — without
`DOTALL`, Java's `.` wouldn't match those, and a `javascript:` scheme
followed by a newline-containing payload could slip through. `.matches()`
(anchors the whole string), not `.find()`, since this needs to know the
attribute's *entire* value has this shape, not merely that the pattern
appears somewhere inside it.

## `serializeNode()` — text re-escaping, same reasoning as JS

```java
private static String escapeText(String s) {
    return s.replace("&", "&amp;").replace("<", "&lt;");
}
```

Identical logic to `Sanitizer.js`'s `escapeText`, translated directly:
`TextNode.data` holds fully-decoded text, so writing it back into an
HTML string requires re-escaping `&` and `<` or the output could be
misread by whatever re-parses it later. `String.replace` (not a regex
`replaceAll`) is deliberately used for both calls here, since neither
target (`&`, `<`) needs regex features and a literal replace is simpler
and slightly cheaper.

## Try it yourself — the divergence, run for real

```java
String html = "<title><script>alert(1)</script></title>";
System.out.println(Sanitizer.sanitize(html));               // <title>&lt;script>alert(1)&lt;/script></title>
System.out.println(NaiveRegexSanitizer.naiveStripScript(html)); // <title></title>
```

Same real, verified divergence as the JS side, confirmed independently
in Java rather than assumed to carry over: the real sanitizer preserves
the title's actual text; the naive regex-based one silently deletes
legitimate page content it was never supposed to touch. Two entirely
separate language runtimes, two entirely separate regex engines, the
same real bug in the same naive approach — strong evidence this isn't an
artifact of one language's particular regex quirks, but a structural
consequence of pattern-matching HTML instead of tokenizing it.
