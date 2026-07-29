public class TokenizerTest {

    public static void main(String[] args) {

        // --- Core sanitizer behavior ---

        {
            String out = Sanitizer.sanitize("<p>hi</p><script>alert(1)</script><p>bye</p>");
            Check.that("a real <script> element is removed entirely, surrounding content preserved",
                    out.equals("<p>hi</p><p>bye</p>"));
            Check.that("removed script content does not leak into output", !out.contains("alert"));
        }

        {
            String out = Sanitizer.sanitize("<img src=\"x.png\" onerror=\"alert(1)\">");
            Check.that("event handler attribute stripped, other attributes survive",
                    out.equals("<img src=\"x.png\">"));
        }

        {
            String out = Sanitizer.sanitize("<a href=\"javascript:alert(1)\">click</a>");
            Check.that("javascript: URL href is dropped entirely, not just neutered",
                    out.equals("<a>click</a>"));
        }

        {
            String out = Sanitizer.sanitize("<a href=\"https://example.com\">click</a>");
            Check.that("an ordinary https:// href is left completely untouched",
                    out.equals("<a href=\"https://example.com\">click</a>"));
        }

        {
            String out = Sanitizer.sanitize("<br><p>after</p>");
            Check.that("void elements and plain nesting survive unchanged",
                    out.equals("<br><p>after</p>"));
        }

        {
            String out = Sanitizer.sanitize("<div class=\"a\" onclick=\"bad()\">safe &amp; text &lt;here&gt;</div>");
            Check.that("multiple dangerous attributes stripped, safe ones kept",
                    out.equals("<div class=\"a\">safe &amp; text &lt;here></div>"));
            Check.that("onclick does not appear anywhere in the output", !out.contains("onclick"));
        }

        // --- The payoff: the exact divergence ROADMAP.md predicted for this module ---
        // "A sanitizer that strips <script> while preserving surrounding text only
        // works correctly if it respects RAWTEXT/script-data state boundaries --
        // a hand-rolled regex sanitizer provably cannot."

        {
            String html = "<title><script>alert(1)</script></title>";
            String out = Sanitizer.sanitize(html);
            Check.that("the real, tokenizer-based sanitizer preserves literal \"<script>\" text inside RCDATA",
                    out.equals("<title>&lt;script>alert(1)&lt;/script></title>"));
        }

        {
            String html = "<title><script>alert(1)</script></title>";
            String naiveResult = NaiveRegexSanitizer.naiveStripScript(html);
            String realResult = Sanitizer.sanitize(html);
            Check.that("PROVEN: the naive regex sanitizer corrupts that exact same legitimate content",
                    naiveResult.equals("<title></title>"));
            Check.that("the naive result genuinely differs from the correct, real result",
                    !naiveResult.equals(realResult));
        }

        Check.summary();
    }
}
