import java.util.List;

public class TokenizerTest {
    private static boolean hasParseError(Tokenizer t, String description) {
        for (String e : t.getParseErrors()) {
            if (e.endsWith(description)) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        System.out.println("Module 12: Markup Declaration Open & Bogus Comment -- Java");
        System.out.println();

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        Tokenizer t1 = new Tokenizer("<!--x");
        boolean threw1 = false;
        try {
            t1.run();
        } catch (NotImplementedException e) {
            threw1 = e.moduleNumber == 13;
        }
        Check.that("<!-- consumes both dashes, starts a comment token, and hands off to Module 13",
            threw1 && t1.currentToken instanceof CommentToken
                && ((CommentToken) t1.currentToken).data.equals("") && t1.state == State.COMMENT_START);

        boolean allDoctypeOk = true;
        for (String spelling : new String[]{"DOCTYPE", "doctype", "DocType"}) {
            Tokenizer t = new Tokenizer("<!" + spelling + " html>");
            boolean threw = false;
            try {
                t.run();
            } catch (NotImplementedException e) {
                threw = e.moduleNumber == 14;
            }
            if (!threw || t.state != State.DOCTYPE) allDoctypeOk = false;
        }
        Check.that("<!DOCTYPE hands off to Module 14, case-insensitively", allDoctypeOk);

        Tokenizer t2 = new Tokenizer("<![CDATA[x]]>");
        boolean threw2 = false;
        try {
            t2.run();
        } catch (NotImplementedException e) {
            threw2 = e.moduleNumber == 15;
        }
        Check.that("<![CDATA[ hands off to Module 15", threw2 && t2.state == State.CDATA_SECTION);

        List<Token> tokens3 = new Tokenizer("<!weird>rest").run();
        Check.that("an unrecognized <! declaration becomes a bogus comment",
            tokens3.get(0) instanceof CommentToken && ((CommentToken) tokens3.get(0)).data.equals("weird"));

        Tokenizer t4 = new Tokenizer("<!weird>");
        t4.run();
        Check.that("a bogus comment reports incorrectly-opened-comment",
            hasParseError(t4, "incorrectly-opened-comment"));

        List<Token> tokens5 = new Tokenizer("<?xml version=\"1.0\"?>rest").run();
        Check.that("<? routes through Tag Open (Module 9) into a bogus comment here",
            tokens5.get(0) instanceof CommentToken
                && ((CommentToken) tokens5.get(0)).data.equals("?xml version=\"1.0\"?"));

        List<Token> tokens6 = new Tokenizer("</9text>rest").run();
        Check.that("</9 (invalid end tag start) also becomes a bogus comment",
            tokens6.get(0) instanceof CommentToken && ((CommentToken) tokens6.get(0)).data.equals("9text"));

        List<Token> tokens7 = new Tokenizer("<!a" + (char) 0 + "b>").run();
        Check.that("NUL inside a bogus comment becomes U+FFFD in the data",
            ((CommentToken) tokens7.get(0)).data.equals("a�b"));

        List<Token> tokens8 = new Tokenizer("<!unclosed").run();
        Check.that("EOF inside a bogus comment emits BOTH the comment and an EOF token",
            tokens8.size() == 2 && tokens8.get(0) instanceof CommentToken
                && ((CommentToken) tokens8.get(0)).data.equals("unclosed")
                && tokens8.get(1) instanceof EOFToken);

        List<Token> tokens9 = new Tokenizer("hi<?xml?>there").run();
        Check.that("a bogus comment inside a real document tokenizes correctly end to end",
            ((CharacterToken) tokens9.get(0)).data.equals("h")
                && tokens9.get(2) instanceof CommentToken
                && ((CommentToken) tokens9.get(2)).data.equals("?xml?"));

        Check.summary();
    }
}
