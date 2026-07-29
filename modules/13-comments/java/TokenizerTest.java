import java.util.ArrayList;
import java.util.List;

public class TokenizerTest {
    private static List<CommentToken> commentTokens(List<Token> tokens) {
        List<CommentToken> result = new ArrayList<>();
        for (Token t : tokens) if (t instanceof CommentToken) result.add((CommentToken) t);
        return result;
    }

    private static boolean hasParseError(Tokenizer t, String description) {
        for (String e : t.getParseErrors()) {
            if (e.endsWith(description)) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        System.out.println("Module 13: Comment States -- Java");
        System.out.println();

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        List<Token> t1 = new Tokenizer("<!--hello-->rest").run();
        Check.that("a simple comment tokenizes end to end from real markup",
            t1.get(0) instanceof CommentToken && ((CommentToken) t1.get(0)).data.equals("hello")
                && t1.get(1) instanceof CharacterToken && ((CharacterToken) t1.get(1)).data.equals("r"));

        List<Token> t2 = new Tokenizer("<!---->rest").run();
        Check.that("an empty comment works", commentTokens(t2).get(0).data.equals(""));

        Tokenizer t3 = new Tokenizer("<!-->rest");
        List<Token> tokens3 = t3.run();
        Check.that("<!--> is an abrupt-closing-of-empty-comment",
            commentTokens(tokens3).get(0).data.equals("") && hasParseError(t3, "abrupt-closing-of-empty-comment"));

        Tokenizer t4 = new Tokenizer("<!--->rest");
        List<Token> tokens4 = t4.run();
        Check.that("<!---> is ALSO an abrupt-closing-of-empty-comment (one dash short)",
            commentTokens(tokens4).get(0).data.equals("") && hasParseError(t4, "abrupt-closing-of-empty-comment"));

        List<Token> t5 = new Tokenizer("<!--hi---->rest").run();
        Check.that("extra dashes right before the close become part of the data",
            commentTokens(t5).get(0).data.equals("hi--"));

        Tokenizer t6 = new Tokenizer("<!--hi--!>rest");
        List<Token> tokens6 = t6.run();
        Check.that("--!> closes the comment, with a parse error",
            commentTokens(tokens6).get(0).data.equals("hi") && hasParseError(t6, "incorrectly-closed-comment"));

        List<Token> t7 = new Tokenizer("<!--a--!b-->c").run();
        Check.that("--! NOT followed by > or - gives \"--!\" back to the data",
            commentTokens(t7).get(0).data.equals("a--!b"));

        List<Token> t8 = new Tokenizer("<!--a--!-->c").run();
        Check.that("--! followed by another - starts a fresh close attempt",
            commentTokens(t8).get(0).data.equals("a--!"));

        List<Token> t9 = new Tokenizer("<!--a" + (char) 0 + "b-->").run();
        Check.that("NUL inside a comment becomes U+FFFD in the data",
            commentTokens(t9).get(0).data.equals("a�b"));

        List<Token> t10 = new Tokenizer("<!--unclosed").run();
        Check.that("EOF mid-comment-body emits BOTH the partial comment and an EOF token",
            t10.size() == 2 && ((CommentToken) t10.get(0)).data.equals("unclosed") && t10.get(1) instanceof EOFToken);

        List<Token> t11 = new Tokenizer("<!--a--!").run();
        Check.that("EOF inside comment-end-bang still emits the partial comment",
            t11.size() == 2 && ((CommentToken) t11.get(0)).data.equals("a") && t11.get(1) instanceof EOFToken);

        Check.summary();
    }
}
