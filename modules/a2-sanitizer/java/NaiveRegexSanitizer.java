import java.util.regex.Pattern;

/**
 * A deliberately realistic "obvious first attempt" at an HTML sanitizer:
 * strip anything that looks like a <script>...</script> span using a
 * regular expression directly against the raw source text. This is not
 * a strawman -- pattern-matching sanitizers of roughly this shape have
 * shipped in real software. It exists in this module ONLY to be compared
 * against Sanitizer.java's tokenizer-based approach in TokenizerTest.java;
 * it is not itself considered a safe or recommended implementation
 * anywhere else in this course. See DECISIONS.md for the verified,
 * concrete case where this diverges from a real browser's behavior.
 */
public class NaiveRegexSanitizer {
    private static final Pattern SCRIPT_SPAN = Pattern.compile(
            "<script\\b[^>]*>.*?</script\\s*>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    public static String naiveStripScript(String html) {
        return SCRIPT_SPAN.matcher(html).replaceAll("");
    }
}
