import java.util.List;

public class TokenizerTest {
    private static String firstAttrValue(List<Token> tokens) {
        return ((StartTagToken) tokens.get(0)).attributes.get(0).value;
    }

    public static void main(String[] args) {
        System.out.println("Module 11: Character Reference in Attribute Value -- Java");
        System.out.println();

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        List<Token> t1 = new Tokenizer("<div a=\"x&amp;y\">").run();
        Check.that("a named reference with a semicolon decodes inside a double-quoted value",
            firstAttrValue(t1).equals("x&y"));

        List<Token> t2 = new Tokenizer("<div a='x&amp;y'>").run();
        Check.that("a named reference decodes inside a single-quoted value",
            firstAttrValue(t2).equals("x&y"));

        List<Token> t3 = new Tokenizer("<div a=x&amp;y>").run();
        Check.that("a named reference decodes inside an unquoted value, and the tag still closes",
            ((StartTagToken) t3.get(0)).tagName.equals("div") && firstAttrValue(t3).equals("x&y"));

        List<Token> t4 = new Tokenizer("<div a=\"x&#65;y\">").run();
        Check.that("a numeric reference decodes normally (ambiguous-ampersand only applies to named refs)",
            firstAttrValue(t4).equals("xAy"));

        List<Token> t5 = new Tokenizer("<div a=\"x&amp=y\">").run();
        Check.that("a legacy no-semicolon match followed by = is ambiguous -- NOT decoded",
            firstAttrValue(t5).equals("x&amp=y"));

        List<Token> t6 = new Tokenizer("<div a=\"x&amp1y\">").run();
        Check.that("a legacy no-semicolon match followed by an alphanumeric is also ambiguous",
            firstAttrValue(t6).equals("x&amp1y"));

        List<Token> t7 = new Tokenizer("<div a=\"x&amp y\">").run();
        Check.that("a legacy no-semicolon match followed by something else still decodes normally",
            firstAttrValue(t7).equals("x& y"));

        List<Token> t8 = new Tokenizer("<div a=\"x&\">").run();
        Check.that("& immediately before the closing quote is literal, not a reference attempt",
            firstAttrValue(t8).equals("x&"));

        List<Token> t9 = new Tokenizer("&amp b").run();
        StringBuilder sb = new StringBuilder();
        for (Token t : t9) if (t instanceof CharacterToken) sb.append(((CharacterToken) t).data);
        Check.that("Data state character reference decoding is unchanged by this module",
            sb.toString().equals("& b"));

        Check.summary();
    }
}
