import java.util.List;

public class TokenizerTest {
    public static void main(String[] args) {
        System.out.println("Module 9: Tag Open / End Tag Open / Tag Name -- Java");
        System.out.println();

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        List<Token> t1 = new Tokenizer("<div>").run();
        Check.that("a simple start tag produces a real StartTagToken",
            t1.size() == 2 && t1.get(0) instanceof StartTagToken
                && ((StartTagToken) t1.get(0)).tagName.equals("div") && t1.get(1) instanceof EOFToken);

        List<Token> t2 = new Tokenizer("</div>").run();
        Check.that("a simple end tag produces a real EndTagToken",
            t2.get(0) instanceof EndTagToken && ((EndTagToken) t2.get(0)).tagName.equals("div"));

        List<Token> t3 = new Tokenizer("<DIV>").run();
        Check.that("tag names are lowercased regardless of source case",
            ((StartTagToken) t3.get(0)).tagName.equals("div"));

        List<Token> t4 = new Tokenizer("hi<div>there").run();
        Check.that("a full sentence with a tag in the middle tokenizes end to end",
            t4.size() == 9
                && ((CharacterToken) t4.get(0)).data.equals("h")
                && t4.get(2) instanceof StartTagToken
                && ((StartTagToken) t4.get(2)).tagName.equals("div")
                && t4.get(8) instanceof EOFToken);

        Tokenizer t5 = new Tokenizer("<div>");
        t5.run();
        Tokenizer t5b = new Tokenizer("</span>");
        t5b.run();
        Check.that("lastStartTagName is updated for start tags, not end tags",
            "div".equals(t5.lastStartTagName) && t5b.lastStartTagName == null);

        List<Token> t6 = new Tokenizer("<a" + (char) 0 + "b>").run();
        Check.that("NUL inside a tag name is replaced with U+FFFD IN THE NAME, not a separate token",
            t6.size() == 2 && ((StartTagToken) t6.get(0)).tagName.equals("a�b"));

        Tokenizer t7 = new Tokenizer("<di");
        List<Token> tokens7 = t7.run();
        Check.that("EOF mid-tag-name discards the half-built tag -- only EOF is emitted",
            tokens7.size() == 1 && tokens7.get(0) instanceof EOFToken
                && t7.getParseErrors().stream().anyMatch(e -> e.endsWith("eof-in-tag")));

        Tokenizer t8 = new Tokenizer("</>rest");
        List<Token> tokens8 = t8.run();
        boolean hasEndTag8 = false;
        for (Token tok : tokens8) if (tok instanceof EndTagToken) hasEndTag8 = true;
        Check.that("</> with no name at all emits nothing, just a parse error",
            !hasEndTag8 && t8.getParseErrors().stream().anyMatch(e -> e.endsWith("missing-end-tag-name")));

        List<Token> tokens9 = new Tokenizer("</").run();
        Check.that("</ at EOF emits literal < and / characters, then EOF",
            tokens9.size() == 3
                && ((CharacterToken) tokens9.get(0)).data.equals("<")
                && ((CharacterToken) tokens9.get(1)).data.equals("/")
                && tokens9.get(2) instanceof EOFToken);

        Tokenizer t10 = new Tokenizer("<div class>");
        boolean threw10 = false;
        try {
            t10.run();
        } catch (NotImplementedException e) {
            threw10 = e.moduleNumber == 10;
        }
        Check.that("a space after a tag name hands off to BEFORE_ATTRIBUTE_NAME (Module 10)", threw10);

        Tokenizer t11 = new Tokenizer("<br/>");
        boolean threw11 = false;
        try {
            t11.run();
        } catch (NotImplementedException e) {
            threw11 = e.moduleNumber == 10;
        }
        Check.that("a / after a tag name hands off to SELF_CLOSING_START_TAG (Module 10)", threw11);

        Tokenizer t12 = new Tokenizer("<!DOCTYPE html>");
        boolean threw12 = false;
        try {
            t12.run();
        } catch (NotImplementedException e) {
            threw12 = e.moduleNumber == 12;
        }
        Check.that("<! hands off to MARKUP_DECLARATION_OPEN (Module 12)", threw12);

        Tokenizer t13 = new Tokenizer("<?xml");
        boolean threw13 = false;
        try {
            t13.run();
        } catch (NotImplementedException e) {
            threw13 = e.moduleNumber == 12;
        }
        Check.that("<? hands off to BOGUS_COMMENT (Module 12)", threw13);

        List<Token> tokens14 = new Tokenizer("<textarea>x</textarea>").run();
        Check.that("the tokenizer does NOT auto-switch to RCDATA for <textarea>",
            tokens14.size() == 4
                && tokens14.get(0) instanceof StartTagToken
                && ((StartTagToken) tokens14.get(0)).tagName.equals("textarea")
                && tokens14.get(1) instanceof CharacterToken
                && ((CharacterToken) tokens14.get(1)).data.equals("x")
                && tokens14.get(2) instanceof EndTagToken
                && ((EndTagToken) tokens14.get(2)).tagName.equals("textarea")
                && tokens14.get(3) instanceof EOFToken);

        Tokenizer t15 = new Tokenizer("<textarea><b></textarea>");
        t15.run();
        Check.that("without tree construction, a nested tag inside would-be RCDATA content overwrites lastStartTagName",
            "b".equals(t15.lastStartTagName));

        Check.summary();
    }
}
