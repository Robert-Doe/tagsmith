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

    public static void main(String[] args) {
        System.out.println("Module 6: Script Data Base States -- Java");
        System.out.println();

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        Tokenizer t0 = new Tokenizer("hi");
        t0.state = State.RAWTEXT;
        Check.that("RCDATA/RAWTEXT/PLAINTEXT from Module 5 still work unchanged",
            dataOf(t0.run()).equals("hi"));

        Tokenizer t1 = new Tokenizer("var x=1&2;");
        t1.state = State.SCRIPT_DATA;
        List<Token> tokens1 = t1.run();
        Check.that("script data tokenizes plain code as literal characters, no entity decoding",
            dataOf(tokens1).equals("var x=1&2;") && tokens1.get(tokens1.size() - 1) instanceof EOFToken);

        Tokenizer t2 = new Tokenizer("a" + (char) 0 + "b");
        t2.state = State.SCRIPT_DATA;
        List<Token> tokens2 = t2.run();
        Check.that("script data reports a parse error for NUL but still emits it literally",
            tokens2.size() == 4 && t2.getParseErrors().stream().anyMatch(e -> e.endsWith("unexpected-null-character")));

        Tokenizer t3 = new Tokenizer("a<b");
        t3.state = State.SCRIPT_DATA;
        Check.that("a lone < in script data (not / or !) is just literal", dataOf(t3.run()).equals("a<b"));

        Tokenizer t4 = new Tokenizer("a<!--b");
        t4.state = State.SCRIPT_DATA;
        boolean threwRight = false;
        try {
            t4.run();
        } catch (NotImplementedException e) {
            threwRight = e.moduleNumber == 7;
        }
        Check.that("<! emits both characters and switches to SCRIPT_DATA_ESCAPE_START",
            threwRight && dataOf(t4.tokensSoFar()).equals("a<!") && t4.state == State.SCRIPT_DATA_ESCAPE_START);

        Tokenizer t5 = new Tokenizer("code</script>after");
        t5.state = State.SCRIPT_DATA;
        t5.setLastStartTagName("script");
        List<Token> tokens5 = t5.run();
        boolean hasScriptEndTag = false;
        for (Token tok : tokens5) if (tok instanceof EndTagToken && ((EndTagToken) tok).tagName.equals("script")) hasScriptEndTag = true;
        Check.that("a matching end tag name closes script data and emits a real EndTagToken",
            dataOf(tokens5).equals("code</script>after") && hasScriptEndTag && t5.state == State.DATA);

        Tokenizer t6 = new Tokenizer("code</style>after");
        t6.state = State.SCRIPT_DATA;
        t6.setLastStartTagName("script");
        List<Token> tokens6 = t6.run();
        boolean hasAnyEndTag = false;
        for (Token tok : tokens6) if (tok instanceof EndTagToken) hasAnyEndTag = true;
        Check.that("a NON-matching end tag name does not close script data",
            dataOf(tokens6).equals("code</style>after") && !hasAnyEndTag);

        Check.summary();
    }
}
