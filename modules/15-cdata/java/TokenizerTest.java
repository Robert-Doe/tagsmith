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
        System.out.println("Module 15: CDATA Section State -- Java");
        System.out.println();

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        List<Token> t1 = new Tokenizer("<![CDATA[hello]]>rest").run();
        Check.that("a full CDATA section tokenizes end to end from real markup",
            dataOf(t1).equals("hellorest"));

        List<Token> t2 = new Tokenizer("<![CDATA[]]>rest").run();
        Check.that("an empty CDATA section produces no character tokens for it",
            dataOf(t2).equals("rest"));

        Tokenizer t3 = new Tokenizer("a]b]]>c");
        t3.state = State.CDATA_SECTION;
        List<Token> tokens3 = t3.run();
        Check.that("a ] not followed by ]> is just literal content",
            dataOf(tokens3).equals("a]bc") && t3.state == State.DATA);

        Tokenizer t4 = new Tokenizer("a" + (char) 0 + "b]]>");
        t4.state = State.CDATA_SECTION;
        List<Token> tokens4 = t4.run();
        Check.that("NUL inside CDATA is a parse error but still literal, like Data state",
            dataOf(tokens4).equals("a" + (char) 0 + "b") && hasParseError(t4, "unexpected-null-character"));

        Tokenizer t5 = new Tokenizer("unclosed");
        t5.state = State.CDATA_SECTION;
        List<Token> tokens5 = t5.run();
        Check.that("EOF mid-CDATA-section is a parse error, and still emits an EOF token",
            dataOf(tokens5).equals("unclosed") && tokens5.get(tokens5.size() - 1) instanceof EOFToken
                && hasParseError(t5, "eof-in-cdata"));

        Check.summary();
    }
}
