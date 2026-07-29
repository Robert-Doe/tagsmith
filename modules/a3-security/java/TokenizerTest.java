public class TokenizerTest {

    private static final String PAYLOAD = "<img src=x onerror=alert(1)>";

    public static void main(String[] args) {

        // --- The core mechanism: context picks the tokenizer's INITIAL state ---

        {
            DocumentNode doc = new TreeBuilder("<b>hi</b>").run();
            TreeNode b = doc.children.get(0);
            Check.that("fragment parsing with no context behaves like Module A1 (DATA state)",
                    b instanceof ElementNode && ((ElementNode) b).tagName.equals("b"));
        }

        {
            DocumentNode doc = new TreeBuilder(PAYLOAD, "textarea").run();
            Check.that("context=textarea (RCDATA) keeps a real-looking tag as inert literal text",
                    doc.children.size() == 1 && doc.children.get(0) instanceof TextNode);
            Check.that("the literal text matches the payload exactly",
                    ((TextNode) doc.children.get(0)).data.equals(PAYLOAD));
        }

        {
            DocumentNode doc = new TreeBuilder(PAYLOAD, "div").run();
            Check.that("context=div (DATA) parses the identical string as a REAL, live element",
                    doc.children.size() == 1 && doc.children.get(0) instanceof ElementNode);
            ElementNode img = (ElementNode) doc.children.get(0);
            Check.that("the real element is img", img.tagName.equals("img"));
            Check.that("it has both attributes, src and onerror",
                    img.attributes.size() == 2
                            && img.attributes.get(0).name.equals("src") && img.attributes.get(0).value.equals("x")
                            && img.attributes.get(1).name.equals("onerror") && img.attributes.get(1).value.equals("alert(1)"));
        }

        {
            DocumentNode doc = new TreeBuilder(PAYLOAD, "script").run();
            Check.that("context=script (SCRIPT_DATA) also keeps the payload as inert literal text",
                    doc.children.size() == 1 && doc.children.get(0) instanceof TextNode
                            && ((TextNode) doc.children.get(0)).data.equals(PAYLOAD));
        }

        // --- The payoff: the exact mutation-XSS mechanism, live-verified against a real browser ---
        // (see DECISIONS.md for the transcribed javascript_tool session against a
        // real DOM: textarea.innerHTML = PAYLOAD, then textarea.value, then a
        // SECOND div's innerHTML set to that captured text -- all matched exactly.)

        {
            DocumentNode safelyStored = new TreeBuilder(PAYLOAD, "textarea").run();
            String capturedText = ((TextNode) safelyStored.children.get(0)).data;
            Check.that("captured text is bit-for-bit identical to the original payload",
                    capturedText.equals(PAYLOAD));

            DocumentNode reinserted = new TreeBuilder(capturedText, "div").run();
            ElementNode img = (ElementNode) reinserted.children.get(0);
            Check.that("PROVEN: the SAME captured text becomes a real element with a real event handler in a new context",
                    img.tagName.equals("img")
                            && img.attributes.stream().anyMatch(a -> a.name.equals("onerror") && a.value.equals("alert(1)")));
        }

        Check.summary();
    }
}
