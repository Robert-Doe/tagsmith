import java.util.List;

public class TokenizerTest {
    public static void main(String[] args) {
        System.out.println("Module 2: Input Stream Preprocessing -- Java");
        System.out.println();

        Check.that("CRLF pairs become a single LF",
            Preprocessor.preprocess("a\r\nb").equals("a\nb"));
        Check.that("lone CR (no following LF) becomes LF",
            Preprocessor.preprocess("a\rb").equals("a\nb"));
        Check.that("a run of CRLF, CRLF, CR, LF all normalize correctly",
            Preprocessor.preprocess("a\r\n\r\n\r\nb").equals("a\n\n\nb")
                && Preprocessor.preprocess("x\ry\r\nz\n").equals("x\ny\nz\n"));
        Check.that("input with no CR is untouched",
            Preprocessor.preprocess("plain\ntext").equals("plain\ntext"));

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        boolean allMapped = true;
        for (State s : State.values()) {
            if (Tokenizer.moduleFor(s) == null) {
                allMapped = false;
            }
        }
        Check.that("every state has a module hint", allMapped);

        Tokenizer empty = new Tokenizer("");
        List<Token> tokens = empty.run();
        Check.that(
            "empty input immediately produces exactly one EOF token",
            tokens.size() == 1 && tokens.get(0) instanceof EOFToken
        );

        Check.throwsWithModule(
            "a plain character throws pointing at Module 3",
            () -> new Tokenizer("a").run(),
            3
        );

        Check.throwsWithModule(
            "an ampersand throws pointing at Module 4",
            () -> new Tokenizer("&amp;").run(),
            4
        );

        Check.throwsWithModule(
            "a less-than sign throws pointing at Module 9",
            () -> new Tokenizer("<div>").run(),
            9
        );

        Tokenizer forced = new Tokenizer("");
        forced.forceState(State.COMMENT_START);
        try {
            forced.stepOnce();
            Check.that("a non-DATA state throws naming its own module", false);
        } catch (NotImplementedException e) {
            Check.that(
                "a non-DATA state throws naming its own module",
                e.stateName.equals(State.COMMENT_START.specName) && e.moduleNumber == 13
            );
        }

        DoctypeToken d = new DoctypeToken();
        Check.that("DoctypeToken name starts null (missing), not empty string", d.name == null);
        Check.that("DoctypeToken forceQuirks starts false", !d.forceQuirks);

        StartTagToken s = new StartTagToken();
        s.tagName = "div";
        Check.that(
            "StartTagToken holds a tag name and an empty attribute list",
            s.tagName.equals("div") && s.attributes.isEmpty()
        );

        EndTagToken e = new EndTagToken();
        Check.that("EndTagToken constructs", e != null);

        CommentToken c = new CommentToken();
        Check.that("CommentToken data starts empty", c.data.equals(""));

        CharacterToken ch = new CharacterToken('x');
        Check.that("CharacterToken holds exactly one character", ch.data == 'x');

        EOFToken eof = new EOFToken();
        Check.that("EOFToken constructs", eof != null);

        Check.summary();
    }
}
