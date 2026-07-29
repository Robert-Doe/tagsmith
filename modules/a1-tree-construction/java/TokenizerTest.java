import java.util.List;

public class TokenizerTest {

    static String tagName(TreeNode node) {
        return node instanceof ElementNode ? ((ElementNode) node).tagName : null;
    }

    public static void main(String[] args) {

        // --- The payoff: resolving Module 16's demonstrated divergence ---

        {
            DocumentNode doc = new TreeBuilder("<textarea>x&amp;<b>y</textarea>after").run();
            ElementNode textarea = (ElementNode) doc.children.get(0);
            Check.that("textarea tag name is textarea", textarea.tagName.equals("textarea"));
            Check.that("textarea has exactly one child", textarea.children.size() == 1);
            Check.that("textarea child is a TextNode", textarea.children.get(0) instanceof TextNode);
            // '<b>' stayed literal text (RCDATA doesn't parse tags); '&amp;' still decoded (RCDATA DOES decode entities)
            Check.that("textarea content is 'x&<b>y' (tags literal, entities decoded)",
                    ((TextNode) textarea.children.get(0)).data.equals("x&<b>y"));
            Check.that("text after textarea is a sibling 'after'",
                    ((TextNode) doc.children.get(1)).data.equals("after"));
        }

        {
            DocumentNode doc = new TreeBuilder("<script>if (a<b) { console.log(\"hi\"); }</script>").run();
            ElementNode script = (ElementNode) doc.children.get(0);
            Check.that("script tag name is script", script.tagName.equals("script"));
            Check.that("script has exactly one child", script.children.size() == 1);
            // This exact string was independently verified against a real browser's
            // DOMParser in Module 16's DECISIONS.md.
            Check.that("script content matches the real browser exactly (Module 16)",
                    ((TextNode) script.children.get(0)).data.equals("if (a<b) { console.log(\"hi\"); }"));
        }

        {
            DocumentNode doc = new TreeBuilder("<script>x</script><p>after</p>").run();
            Check.that("a real </script> end tag now correctly closes the element (2 children)",
                    doc.children.size() == 2);
            Check.that("first child is script", "script".equals(tagName(doc.children.get(0))));
            Check.that("second child is p", "p".equals(tagName(doc.children.get(1))));
        }

        // --- Confirms Java never had the JS-side method-collision bug ---
        // (see DECISIONS.md "A real discovery" section: Java's overloading
        // rules -- endTagOpenState() and endTagOpenState(State, State) are
        // genuinely distinct methods -- meant this was correct here even
        // before the JS fix. These checks lock that in.)

        {
            DocumentNode doc = new TreeBuilder("<title><script>alert(1)</script></title>after").run();
            ElementNode title = (ElementNode) doc.children.get(0);
            Check.that("title tag name is title", title.tagName.equals("title"));
            Check.that("title has exactly one child", title.children.size() == 1);
            Check.that("MISMATCHED end tag inside RCDATA stays literal text",
                    ((TextNode) title.children.get(0)).data.equals("<script>alert(1)</script>"));
            Check.that("text after title is a sibling 'after'",
                    ((TextNode) doc.children.get(1)).data.equals("after"));
        }

        {
            DocumentNode doc = new TreeBuilder("<style></title>still style text</style>after").run();
            ElementNode style = (ElementNode) doc.children.get(0);
            Check.that("style tag name is style", style.tagName.equals("style"));
            Check.that("style has exactly one child", style.children.size() == 1);
            Check.that("MISMATCHED end tag inside RAWTEXT stays literal text",
                    ((TextNode) style.children.get(0)).data.equals("</title>still style text"));
            Check.that("text after style is a sibling 'after'",
                    ((TextNode) doc.children.get(1)).data.equals("after"));
        }

        // --- General tree-building correctness ---

        {
            DocumentNode doc = new TreeBuilder(
                    "<!DOCTYPE html><html><head><title>Hi</title></head><body><div class=\"a\"><p>text</p></div></body></html>")
                    .run();
            Check.that("doctype name is html", doc.doctype.name.equals("html"));
            ElementNode html = (ElementNode) doc.children.get(0);
            Check.that("root element is html", html.tagName.equals("html"));
            ElementNode head = (ElementNode) html.children.get(0);
            ElementNode body = (ElementNode) html.children.get(1);
            Check.that("head is head", head.tagName.equals("head"));
            ElementNode title = (ElementNode) head.children.get(0);
            Check.that("title is title", title.tagName.equals("title"));
            Check.that("title text is Hi", ((TextNode) title.children.get(0)).data.equals("Hi"));
            Check.that("body is body", body.tagName.equals("body"));
            ElementNode div = (ElementNode) body.children.get(0);
            Check.that("div is div", div.tagName.equals("div"));
            Check.that("div has exactly one attribute", div.attributes.size() == 1);
            Check.that("div attribute is class=a",
                    div.attributes.get(0).name.equals("class") && div.attributes.get(0).value.equals("a"));
            ElementNode p = (ElementNode) div.children.get(0);
            Check.that("p is p", p.tagName.equals("p"));
            Check.that("p text is text", ((TextNode) p.children.get(0)).data.equals("text"));
        }

        {
            DocumentNode doc = new TreeBuilder("<div><!-- note --></div>").run();
            ElementNode div = (ElementNode) doc.children.get(0);
            Check.that("comment becomes a real CommentNode", div.children.get(0) instanceof CommentNode);
            Check.that("comment data is ' note '", ((CommentNode) div.children.get(0)).data.equals(" note "));
        }

        {
            DocumentNode doc = new TreeBuilder("<div><br><p>after br</p></div>").run();
            ElementNode div = (ElementNode) doc.children.get(0);
            Check.that("br is the first child", "br".equals(tagName(div.children.get(0))));
            Check.that("br (void element) has no children", div.children.get(0).children.size() == 0);
            Check.that("p is br's sibling, NOT br's child", "p".equals(tagName(div.children.get(1))));
        }

        {
            DocumentNode doc = new TreeBuilder("<div/><p>after</p>").run();
            Check.that("self-closing div is first child", "div".equals(tagName(doc.children.get(0))));
            Check.that("self-closing div has no children", doc.children.get(0).children.size() == 0);
            Check.that("p is div's sibling, not div's child", "p".equals(tagName(doc.children.get(1))));
        }

        {
            DocumentNode doc = new TreeBuilder("<div><p>text</div>after").run();
            // </div> closes <div> even though <p> was never explicitly closed --
            // popping the stack down to (and including) the matching element.
            Check.that("unmatched end tag doesn't crash -- 2 top-level children", doc.children.size() == 2);
            Check.that("first child is div", "div".equals(tagName(doc.children.get(0))));
            Check.that("second child is text 'after'", ((TextNode) doc.children.get(1)).data.equals("after"));
        }

        {
            DocumentNode doc = new TreeBuilder("<p>a&amp;b&lt;c</p>").run();
            ElementNode p = (ElementNode) doc.children.get(0);
            Check.that("adjacent character tokens coalesce into one TextNode", p.children.size() == 1);
            Check.that("coalesced text is 'a&b<c'", ((TextNode) p.children.get(0)).data.equals("a&b<c"));
        }

        Check.summary();
    }
}
