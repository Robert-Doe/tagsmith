import java.util.List;

public class TokenizerTest {
    private static String dataOf(List<Token> tokens) {
        StringBuilder sb = new StringBuilder();
        for (Token t : tokens) {
            if (t instanceof CharacterToken) sb.append(((CharacterToken) t).data);
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
        System.out.println("Module 8: Script Data Double Escaped States -- Java");
        System.out.println();

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        Tokenizer t1 = new Tokenizer("<script>x</script>-->rest");
        t1.state = State.SCRIPT_DATA_ESCAPED;
        List<Token> tokens1 = t1.run();
        Check.that("a full nested <script>...</script> inside a hidden comment round-trips completely",
            dataOf(tokens1).equals("<script>x</script>-->rest") && t1.state == State.SCRIPT_DATA);

        Tokenizer t2 = new Tokenizer("<script>");
        t2.state = State.SCRIPT_DATA_ESCAPED;
        List<Token> tokens2 = t2.run();
        Check.that("lowercase \"script\" enters double-escaped mode",
            dataOf(tokens2).equals("<script>") && t2.state == State.SCRIPT_DATA_DOUBLE_ESCAPED);

        Tokenizer t3 = new Tokenizer("<SCRIPT>");
        t3.state = State.SCRIPT_DATA_ESCAPED;
        List<Token> tokens3 = t3.run();
        Check.that("uppercase \"SCRIPT\" does NOT enter double-escaped mode",
            dataOf(tokens3).equals("<SCRIPT>") && t3.state == State.SCRIPT_DATA_ESCAPED);

        Tokenizer t4 = new Tokenizer("<script></SCRIPT>");
        t4.state = State.SCRIPT_DATA_ESCAPED;
        List<Token> tokens4 = t4.run();
        Check.that("the mirror quirk applies to double-escape-END too",
            dataOf(tokens4).equals("<script></SCRIPT>") && t4.state == State.SCRIPT_DATA_DOUBLE_ESCAPED);

        Tokenizer t5 = new Tokenizer("a<b");
        t5.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        List<Token> tokens5 = t5.run();
        Check.that("a lone < in double-escaped mode is emitted immediately, not deferred",
            dataOf(tokens5).equals("a<b") && tokens5.size() == 4);

        Tokenizer t6 = new Tokenizer("a" + (char) 0 + "b");
        t6.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        List<Token> tokens6 = t6.run();
        Check.that("NUL inside SCRIPT_DATA_DOUBLE_ESCAPED is a parse error but still literal",
            tokens6.size() == 4 && hasParseError(t6, "unexpected-null-character"));

        Tokenizer t7 = new Tokenizer("");
        t7.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        List<Token> tokens7 = t7.run();
        Check.that("EOF while still inside SCRIPT_DATA_DOUBLE_ESCAPED is a parse error",
            tokens7.size() == 1 && tokens7.get(0) instanceof EOFToken
                && hasParseError(t7, "eof-in-script-html-comment-like-text"));

        Tokenizer t8 = new Tokenizer("--x-->rest");
        t8.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        List<Token> tokens8 = t8.run();
        Check.that("\"-->\" from double-escaped mode exits straight to SCRIPT_DATA",
            dataOf(tokens8).equals("--x-->rest") && t8.state == State.SCRIPT_DATA);

        Check.summary();
    }
}
