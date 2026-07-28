import java.util.List;

public class TokenizerTest {
    private static String joinData(List<Token> tokens) {
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
        System.out.println("Module 4: Character Reference Consumption -- Java");
        System.out.println();

        // --- Carried forward ---
        Check.that("State enum has exactly 68 states", State.values().length == 68);
        List<Token> plain = new Tokenizer("hi").run();
        Check.that("plain text still tokenizes correctly (Module 3 behavior intact)",
            plain.size() == 3 && ((CharacterToken) plain.get(0)).data.equals("h"));

        // --- Named references ---
        List<Token> amp = new Tokenizer("&amp;").run();
        Check.that("a named reference with a semicolon decodes correctly",
            amp.size() == 2 && ((CharacterToken) amp.get(0)).data.equals("&") && amp.get(1) instanceof EOFToken);

        Tokenizer legacyAmp = new Tokenizer("&amp b");
        List<Token> legacyAmpTokens = legacyAmp.run();
        Check.that("a legacy named reference without a semicolon still decodes, with a parse error",
            joinData(legacyAmpTokens).equals("& b")
                && hasParseError(legacyAmp, "missing-semicolon-after-character-reference"));

        List<Token> xyz = new Tokenizer("&xyz;").run();
        Check.that("an unrecognized name is not a reference at all", joinData(xyz).equals("&xyz;"));

        List<Token> notit = new Tokenizer("&notit;").run();
        Check.that("an unmatched named reference falls back to literal characters", joinData(notit).equals("&notit;"));

        // --- Numeric references ---
        Check.that("a decimal numeric reference decodes correctly",
            ((CharacterToken) new Tokenizer("&#65;").run().get(0)).data.equals("A"));
        Check.that("a hex numeric reference decodes correctly (lower x)",
            ((CharacterToken) new Tokenizer("&#x41;").run().get(0)).data.equals("A"));
        Check.that("a hex numeric reference decodes correctly (upper X)",
            ((CharacterToken) new Tokenizer("&#X41;").run().get(0)).data.equals("A"));

        Tokenizer missingSemi = new Tokenizer("&#65b");
        Check.that("a numeric reference missing its semicolon still decodes, with a parse error",
            joinData(missingSemi.run()).equals("Ab")
                && hasParseError(missingSemi, "missing-semicolon-after-character-reference"));

        Tokenizer noDigits = new Tokenizer("&#;");
        Check.that("a numeric reference with no digits at all is not a reference",
            joinData(noDigits.run()).equals("&#;")
                && hasParseError(noDigits, "absence-of-digits-in-numeric-character-reference"));

        Tokenizer nullRef = new Tokenizer("&#0;");
        List<Token> nullRefTokens = nullRef.run();
        Check.that("&#0; is a parse error and becomes U+FFFD, not a literal NUL",
            ((CharacterToken) nullRefTokens.get(0)).data.equals("�")
                && hasParseError(nullRef, "null-character-reference"));

        Tokenizer tooHigh = new Tokenizer("&#1114112;");
        Check.that("a codepoint beyond U+10FFFF becomes U+FFFD",
            ((CharacterToken) tooHigh.run().get(0)).data.equals("�")
                && hasParseError(tooHigh, "character-reference-outside-unicode-range"));

        Tokenizer surrogate = new Tokenizer("&#55296;");
        Check.that("a surrogate codepoint becomes U+FFFD",
            ((CharacterToken) surrogate.run().get(0)).data.equals("�")
                && hasParseError(surrogate, "surrogate-character-reference"));

        Tokenizer win1252 = new Tokenizer("&#128;");
        Check.that("a Windows-1252-range codepoint is substituted via the legacy table",
            ((CharacterToken) win1252.run().get(0)).data.equals("€")
                && hasParseError(win1252, "control-character-reference"));

        List<Token> astral = new Tokenizer("&#128512;").run();
        String astralData = ((CharacterToken) astral.get(0)).data;
        Check.that("an astral numeric reference produces one CharacterToken holding a surrogate pair",
            astralData.length() == 2 && astralData.codePointCount(0, astralData.length()) == 1);

        // --- Bail-out conditions ---
        List<Token> bareAmp = new Tokenizer("&").run();
        Check.that("a bare & at EOF is just a literal character",
            ((CharacterToken) bareAmp.get(0)).data.equals("&") && bareAmp.get(1) instanceof EOFToken);

        List<Token> ampSpace = new Tokenizer("& ").run();
        Check.that("& followed by whitespace is not a reference attempt at all", joinData(ampSpace).equals("& "));

        // --- CHARACTER_REFERENCE_IN_RCDATA ---
        Tokenizer rcdataRef = new Tokenizer("amp;");
        rcdataRef.forceState(State.CHARACTER_REFERENCE_IN_RCDATA);
        rcdataRef.stepOnce();
        Check.that("character reference in RCDATA state decodes and returns to RCDATA",
            ((CharacterToken) rcdataRef.tokensSoFar().get(0)).data.equals("&")
                && rcdataRef.state == State.RCDATA);

        Check.summary();
    }
}
