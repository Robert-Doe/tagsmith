import java.util.List;

public class TokenizerTest {
    private static String dataOf(List<Token> tokens) {
        StringBuilder sb = new StringBuilder();
        for (Token t : tokens) {
            if (t instanceof EndTagToken) {
                sb.append("</").append(((EndTagToken) t).tagName).append(">");
            } else if (t instanceof CharacterToken) {
                sb.append(((CharacterToken) t).data);
            }
        }
        return sb.toString();
    }

    private static boolean hasParseError(Tokenizer t, String description) {
        for (String e : t.getParseErrors()) {
            if (e.endsWith(description)) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        System.out.println("Module 7: Script Data Escaped States -- Java");
        System.out.println();

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        Tokenizer t0 = new Tokenizer("a<b");
        t0.state = State.SCRIPT_DATA;
        Check.that("script data base states from Module 6 still work unchanged", dataOf(t0.run()).equals("a<b"));

        Tokenizer t1 = new Tokenizer("abc");
        t1.state = State.SCRIPT_DATA_ESCAPE_START;
        Check.that("escape-start with no dash bails out to plain script data", dataOf(t1.run()).equals("abc"));

        Tokenizer t2 = new Tokenizer("-x");
        t2.state = State.SCRIPT_DATA_ESCAPE_START;
        Check.that("escape-start-dash with only one dash bails out, dash already emitted",
            dataOf(t2.run()).equals("-x"));

        Tokenizer t3 = new Tokenizer("--comment-->rest");
        t3.state = State.SCRIPT_DATA_ESCAPE_START;
        List<Token> tokens3 = t3.run();
        Check.that("a full \"--comment-->\" round trip emits every character and exits to SCRIPT_DATA",
            dataOf(tokens3).equals("--comment-->rest") && t3.state == State.SCRIPT_DATA);

        Tokenizer t4 = new Tokenizer("a" + (char) 0 + "b");
        t4.state = State.SCRIPT_DATA_ESCAPED;
        List<Token> tokens4 = t4.run();
        Check.that("NUL inside SCRIPT_DATA_ESCAPED is a parse error but still literal",
            tokens4.size() == 4 && hasParseError(t4, "unexpected-null-character"));

        Tokenizer t5 = new Tokenizer((char) 0 + "x");
        t5.state = State.SCRIPT_DATA_ESCAPED_DASH;
        t5.run();
        Check.that("NUL inside SCRIPT_DATA_ESCAPED_DASH breaks the dash run and returns to ESCAPED",
            t5.state == State.SCRIPT_DATA_ESCAPED);

        Tokenizer t6 = new Tokenizer("");
        t6.state = State.SCRIPT_DATA_ESCAPED;
        List<Token> tokens6 = t6.run();
        Check.that("EOF while still inside SCRIPT_DATA_ESCAPED is a parse error",
            tokens6.size() == 1 && tokens6.get(0) instanceof EOFToken
                && hasParseError(t6, "eof-in-script-html-comment-like-text"));

        Tokenizer t7 = new Tokenizer("text</script>after");
        t7.state = State.SCRIPT_DATA_ESCAPED;
        t7.setLastStartTagName("script");
        List<Token> tokens7 = t7.run();
        boolean hasScriptEndTag = false;
        for (Token tok : tokens7) if (tok instanceof EndTagToken && ((EndTagToken) tok).tagName.equals("script")) hasScriptEndTag = true;
        Check.that("a matching end tag closes even from deep inside escaped mode, landing in DATA",
            dataOf(tokens7).equals("text</script>after") && hasScriptEndTag && t7.state == State.DATA);

        Tokenizer t8 = new Tokenizer("text</style>after");
        t8.state = State.SCRIPT_DATA_ESCAPED;
        t8.setLastStartTagName("script");
        List<Token> tokens8 = t8.run();
        Check.that("a non-matching end tag falls back to SCRIPT_DATA_ESCAPED, not plain SCRIPT_DATA",
            dataOf(tokens8).equals("text</style>after") && hasParseError(t8, "eof-in-script-html-comment-like-text"));

        Tokenizer t9 = new Tokenizer("<script>");
        t9.state = State.SCRIPT_DATA_ESCAPED;
        boolean threwRight = false;
        try {
            t9.run();
        } catch (NotImplementedException e) {
            threwRight = e.moduleNumber == 8;
        }
        Check.that("a nested \"<script\" inside escaped mode hands off to SCRIPT_DATA_DOUBLE_ESCAPE_START",
            threwRight && dataOf(t9.tokensSoFar()).equals("<") && t9.state == State.SCRIPT_DATA_DOUBLE_ESCAPE_START);

        Check.summary();
    }
}
