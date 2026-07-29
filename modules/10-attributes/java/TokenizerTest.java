import java.util.List;

public class TokenizerTest {
    private static boolean attrsEqual(List<Attribute> attrs, String[][] expected) {
        if (attrs.size() != expected.length) return false;
        for (int i = 0; i < attrs.size(); i++) {
            if (!attrs.get(i).name.equals(expected[i][0])) return false;
            if (!attrs.get(i).value.equals(expected[i][1])) return false;
        }
        return true;
    }

    private static boolean hasParseError(Tokenizer t, String description) {
        for (String e : t.getParseErrors()) {
            if (e.endsWith(description)) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        System.out.println("Module 10: Attribute Name & Value States -- Java");
        System.out.println();

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        List<Token> t1 = new Tokenizer("<div>").run();
        Check.that("a plain tag with no attributes still works",
            ((StartTagToken) t1.get(0)).attributes.isEmpty());

        List<Token> t2 = new Tokenizer("<div class=\"x\">").run();
        Check.that("a double-quoted attribute value parses correctly",
            attrsEqual(((StartTagToken) t2.get(0)).attributes, new String[][]{{"class", "x"}}));

        List<Token> t3 = new Tokenizer("<div class='x'>").run();
        Check.that("a single-quoted attribute value parses correctly",
            attrsEqual(((StartTagToken) t3.get(0)).attributes, new String[][]{{"class", "x"}}));

        List<Token> t4 = new Tokenizer("<div class=x>").run();
        Check.that("an unquoted attribute value parses correctly",
            attrsEqual(((StartTagToken) t4.get(0)).attributes, new String[][]{{"class", "x"}}));

        List<Token> t5 = new Tokenizer("<div disabled>").run();
        Check.that("a boolean attribute gets an empty string value",
            attrsEqual(((StartTagToken) t5.get(0)).attributes, new String[][]{{"disabled", ""}}));

        List<Token> t6 = new Tokenizer("<div a=\"1\" b=\"2\" c=\"3\">").run();
        Check.that("multiple attributes are collected in order",
            attrsEqual(((StartTagToken) t6.get(0)).attributes,
                new String[][]{{"a", "1"}, {"b", "2"}, {"c", "3"}}));

        Tokenizer t7 = new Tokenizer("<div a=\"1\" a=\"2\">");
        List<Token> tokens7 = t7.run();
        Check.that("a duplicate attribute name is dropped -- first occurrence wins",
            attrsEqual(((StartTagToken) tokens7.get(0)).attributes, new String[][]{{"a", "1"}})
                && hasParseError(t7, "duplicate-attribute"));

        List<Token> t8 = new Tokenizer("<br/>").run();
        Check.that("a self-closing tag sets selfClosing and still emits correctly",
            ((StartTagToken) t8.get(0)).tagName.equals("br") && ((StartTagToken) t8.get(0)).selfClosing);

        List<Token> t9 = new Tokenizer("<input type=\"text\"/>").run();
        Check.that("a self-closing tag with an attribute works too",
            ((StartTagToken) t9.get(0)).selfClosing
                && attrsEqual(((StartTagToken) t9.get(0)).attributes, new String[][]{{"type", "text"}}));

        List<Token> t10 = new Tokenizer("<div a" + (char) 0 + "b=\"1\">").run();
        Check.that("NUL in an attribute name becomes U+FFFD in the name",
            ((StartTagToken) t10.get(0)).attributes.get(0).name.equals("a�b"));

        List<Token> t11 = new Tokenizer("<div a=\"1" + (char) 0 + "2\">").run();
        Check.that("NUL in an attribute value becomes U+FFFD in the value",
            ((StartTagToken) t11.get(0)).attributes.get(0).value.equals("1�2"));

        List<Token> tokens12 = new Tokenizer("<div a=\"1").run();
        Check.that("EOF mid-attribute-value discards the entire tag token",
            tokens12.size() == 1 && tokens12.get(0) instanceof EOFToken);

        Tokenizer t13 = new Tokenizer("<div a=\"1\"b=\"2\">");
        List<Token> tokens13 = t13.run();
        Check.that("missing whitespace between attributes is a parse error but still parses both",
            attrsEqual(((StartTagToken) tokens13.get(0)).attributes, new String[][]{{"a", "1"}, {"b", "2"}})
                && hasParseError(t13, "missing-whitespace-between-attributes"));

        Tokenizer t14 = new Tokenizer("<div =x>");
        List<Token> tokens14 = t14.run();
        Check.that("a bare = before any attribute name is a parse error but still parses",
            ((StartTagToken) tokens14.get(0)).attributes.get(0).name.equals("=x")
                && hasParseError(t14, "unexpected-equals-sign-before-attribute-name"));

        Tokenizer t15 = new Tokenizer("<div class=>");
        List<Token> tokens15 = t15.run();
        Check.that("class= with no value at all is a parse error but still emits the tag",
            attrsEqual(((StartTagToken) tokens15.get(0)).attributes, new String[][]{{"class", ""}})
                && hasParseError(t15, "missing-attribute-value"));

        Tokenizer t16 = new Tokenizer("<div a=\"x&amp;y\">");
        boolean threw16 = false;
        try {
            t16.run();
        } catch (NotImplementedException e) {
            threw16 = e.moduleNumber == 11;
        }
        Check.that("an & inside a quoted attribute value hands off to Module 11", threw16);

        Check.summary();
    }
}
