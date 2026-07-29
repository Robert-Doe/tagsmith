import java.util.List;

public class TokenizerTest {
    private static boolean hasParseError(Tokenizer t, String description) {
        for (String e : t.getParseErrors()) {
            if (e.endsWith(description)) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        System.out.println("Module 14: DOCTYPE States -- Java");
        System.out.println();

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        List<Token> t1 = new Tokenizer("<!DOCTYPE html>rest").run();
        DoctypeToken d1 = (DoctypeToken) t1.get(0);
        Check.that("a plain <!DOCTYPE html> tokenizes correctly end to end",
            d1.name.equals("html") && d1.publicIdentifier == null && d1.systemIdentifier == null && !d1.forceQuirks);

        List<Token> t2 = new Tokenizer("<!DOCTYPE HTML>").run();
        Check.that("the doctype name is lowercased regardless of source case",
            ((DoctypeToken) t2.get(0)).name.equals("html"));

        Tokenizer t3 = new Tokenizer("<!DOCTYPE >");
        List<Token> tokens3 = t3.run();
        DoctypeToken d3 = (DoctypeToken) tokens3.get(0);
        Check.that("<!DOCTYPE > with no name at all forces quirks mode",
            d3.name == null && d3.forceQuirks && hasParseError(t3, "missing-doctype-name"));

        List<Token> t4 = new Tokenizer(
            "<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 4.01//EN\" \"http://www.w3.org/TR/html4/strict.dtd\">"
        ).run();
        DoctypeToken d4 = (DoctypeToken) t4.get(0);
        Check.that("PUBLIC with both a public and a system identifier",
            d4.name.equals("html") && d4.publicIdentifier.equals("-//W3C//DTD HTML 4.01//EN")
                && d4.systemIdentifier.equals("http://www.w3.org/TR/html4/strict.dtd") && !d4.forceQuirks);

        List<Token> t5 = new Tokenizer("<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 4.01//EN\">").run();
        DoctypeToken d5 = (DoctypeToken) t5.get(0);
        Check.that("PUBLIC with only a public identifier leaves systemIdentifier missing (null)",
            d5.publicIdentifier.equals("-//W3C//DTD HTML 4.01//EN") && d5.systemIdentifier == null && !d5.forceQuirks);

        List<Token> t6 = new Tokenizer("<!DOCTYPE html SYSTEM \"about:legacy-compat\">").run();
        DoctypeToken d6 = (DoctypeToken) t6.get(0);
        Check.that("SYSTEM with only a system identifier leaves publicIdentifier missing (null)",
            d6.systemIdentifier.equals("about:legacy-compat") && d6.publicIdentifier == null);

        List<Token> t7a = new Tokenizer("<!DOCTYPE html public \"x\">").run();
        List<Token> t7b = new Tokenizer("<!DOCTYPE html System \"y\">").run();
        Check.that("PUBLIC and SYSTEM keywords match case-insensitively",
            ((DoctypeToken) t7a.get(0)).publicIdentifier.equals("x")
                && ((DoctypeToken) t7b.get(0)).systemIdentifier.equals("y"));

        List<Token> t8 = new Tokenizer("<!DOCTYPE h" + (char) 0 + "tml>").run();
        Check.that("NUL in the doctype name becomes U+FFFD in the name",
            ((DoctypeToken) t8.get(0)).name.equals("h�tml"));

        Tokenizer t9 = new Tokenizer("<!DOCTYPE html FOO extra stuff>rest");
        List<Token> tokens9 = t9.run();
        DoctypeToken d9 = (DoctypeToken) tokens9.get(0);
        Check.that("an unrecognized keyword after the name forces quirks and is otherwise ignored",
            d9.name.equals("html") && d9.forceQuirks
                && hasParseError(t9, "invalid-character-sequence-after-doctype-name"));

        Tokenizer t10 = new Tokenizer("<!DOCTYPE html PUBLIC x>rest");
        List<Token> tokens10 = t10.run();
        DoctypeToken d10 = (DoctypeToken) tokens10.get(0);
        Check.that("a missing quote after PUBLIC forces quirks and discards everything until >",
            d10.forceQuirks && d10.publicIdentifier == null);

        Tokenizer t11 = new Tokenizer("<!DOCTYPE html SYSTEM \"x\" extra>rest");
        List<Token> tokens11 = t11.run();
        DoctypeToken d11 = (DoctypeToken) tokens11.get(0);
        Check.that("trailing garbage after a complete system identifier does not force quirks",
            d11.systemIdentifier.equals("x") && !d11.forceQuirks
                && hasParseError(t11, "unexpected-character-after-doctype-system-identifier"));

        List<Token> t12 = new Tokenizer("<!DOCTYPE html").run();
        DoctypeToken d12 = (DoctypeToken) t12.get(0);
        Check.that("EOF mid-doctype emits a force-quirks doctype token AND an EOF token",
            t12.size() == 2 && d12.name.equals("html") && d12.forceQuirks && t12.get(1) instanceof EOFToken);

        Check.summary();
    }
}
