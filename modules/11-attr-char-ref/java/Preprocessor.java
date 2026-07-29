/**
 * "Preprocessing the input stream": before a single state runs, newlines
 * are normalized. Every CRLF pair becomes one LF, and every remaining lone
 * CR also becomes an LF. After this runs, no state anywhere in the
 * tokenizer ever needs to think about '\r' again — it simply cannot occur.
 *
 * Order matters: the CRLF pass must run BEFORE the lone-CR pass. Swap them
 * and every "\r\n" becomes "\n\n" instead of "\n" (see DECISIONS.md).
 */
public class Preprocessor {
    public static String preprocess(String input) {
        return input.replace("\r\n", "\n").replace("\r", "\n");
    }
}
