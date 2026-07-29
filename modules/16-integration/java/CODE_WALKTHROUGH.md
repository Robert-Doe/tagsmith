# Module 16 — Java Code Walkthrough

No source files changed — `Tokenizer.java` is the same file Module 15
finished with. This module's entire content is `TokenizerTest.java`.

## The completeness meta-test, Java-style

```java
for (State s : State.values()) {
    Tokenizer t = new Tokenizer("x");
    t.forceState(s);
    t.currentToken = new DoctypeToken();
    t.currentAttribute = new Attribute("", "");
    try {
        t.stepOnce();
    } catch (NotImplementedException e) {
        anyNotImplemented = true;
        System.out.println("  STILL UNIMPLEMENTED: " + s);
    } catch (Exception e) {
        // other exceptions from this minimal fixture are fine
    }
}
```

Same idea as the JS version, using the package-private `forceState`/
`stepOnce` test hooks Module 1 built specifically for this kind of
direct, per-state probing. The broad `catch (Exception e)` is
deliberate and specific in scope: this test has exactly one job (did
`NotImplementedException` fire anywhere), and every other exception a
mismatched fixture object might throw (`ClassCastException`,
`NullPointerException`) is expected noise, not a signal.

## The differential test that isn't in this file

Same real evidence as the JS walkthrough describes — the exact
`REALISTIC_PAGE` HTML string and the `<script>if (a<b)...` snippet were
both run through a live browser's `DOMParser` in this session, and the
results are transcribed verbatim in this module's `DECISIONS.md`. Java
has no equivalent in-process browser oracle available in this course's
zero-dependency, zero-build-tool setup, so this differential check was
performed once, using the JS side's access to a real browser, and its
conclusions apply equally to the Java implementation since both were
independently verified to produce identical token sequences for the same
inputs throughout every earlier module in this course.

## Try it yourself — and a real difference this uncovered

Delete the `CDATA_SECTION` dispatch branch from `step()`, recompile, and
rerun. The result is *not* simply "two checks fail" the way the JS
version's equivalent experiment behaves — verified directly, this is more
interesting: the completeness check correctly reports
`STILL UNIMPLEMENTED: CDATA_SECTION` and fails, but the *next* check (the
CDATA integration test) throws that same `NotImplementedException`
**uncaught**, which crashes the entire `main()` method before
`Check.summary()` — or any check after it — ever runs. Node's `node:test`
runner isolates each `test()` block automatically, so Module 16's JS
suite still reports a clean 7-pass/2-fail summary even with a state
missing. This hand-rolled `Check`-based harness has no such isolation: one
uncaught exception mid-run silently truncates everything after it. Neither
harness is "wrong" — they were both deliberate zero-dependency choices
(Module 1's DECISIONS.md) — but this module is where that structural
difference becomes directly, concretely observable for the first time
in this course, rather than just a design note.
