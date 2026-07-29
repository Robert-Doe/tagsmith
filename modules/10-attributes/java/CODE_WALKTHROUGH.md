# Module 10 — Java Code Walkthrough

`State.java`, `Preprocessor.java`, `CharacterReference.java`, and
`Check.java` are unchanged. `Token.java` gets one real change; `Tokenizer.java`
gains nine new methods and a field.

## `Attribute` loses `final`

```java
class Attribute {
    String name;   // was: final String name;
    String value;  // was: final String value;
    ...
}
```

Module 1 defined `Attribute` with `final` fields — reasonable at the time,
since nothing built an attribute incrementally yet. This module is the
first to actually construct one character-by-character, which needs
mutability. This is a real, small evolution of an earlier decision, not a
mistake being corrected — Module 1 had no way to know yet which fields
would need to change.

## `finishAttributeName` — where the Module 1 decision pays off

```java
private void finishAttributeName(State nextState) {
    TagToken tag = (TagToken) currentToken;
    boolean isDuplicate = false;
    for (Attribute a : tag.attributes) {
        if (a.name.equals(currentAttribute.name)) { isDuplicate = true; break; }
    }
    if (isDuplicate) {
        reportParseError("duplicate-attribute");
    } else {
        tag.attributes.add(currentAttribute);
    }
    state = nextState;
}
```

A plain linear scan, not a `HashSet` lookup — deliberately: the number of
attributes on a real tag is small (single digits, almost always), so a
`HashSet`'s overhead isn't worth it, and a linear scan keeps this method
readable without another data structure to maintain alongside the
`List<Attribute>` that already exists.

## The `Character`/`boolean atEof` pattern, nine more times

Every one of this module's nine new methods opens with the same
`boolean atEof = eof(); Character boxed = atEof ? null : consume();`
pair established back in Module 5. By this module, it's load-bearing
boilerplate rather than a novel idea — worth noticing how consistently
reused it's been across six modules now.

## Try it yourself

Same experiment as the JS walkthrough: remove the `if (isDuplicate)`
branch in `finishAttributeName` so it always adds. Recompile, rerun — the
duplicate-attribute check should now show two `Attribute` objects named
`"a"` in the list, exactly the silent-overwrite-avoided-by-a-List
scenario Module 1 anticipated four modules before this one was built.
