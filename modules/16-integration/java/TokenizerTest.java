import java.util.List;
import java.util.stream.Collectors;

public class TokenizerTest {
    private static List<Token> structural(List<Token> tokens) {
        return tokens.stream().filter(t -> !(t instanceof CharacterToken)).collect(Collectors.toList());
    }

    private static String textOf(List<Token> tokens) {
        StringBuilder sb = new StringBuilder();
        for (Token t : tokens) if (t instanceof CharacterToken) sb.append(((CharacterToken) t).data);
        return sb.toString();
    }

    private static final String REALISTIC_PAGE =
        "<!DOCTYPE html>" +
        "<!-- page header -->" +
        "<html lang=\"en\">" +
        "<head><meta charset=\"utf-8\"><title>Test &amp; Page</title></head>" +
        "<body>" +
        "<div class=\"main\" data-id=\"42\">" +
        "<p>Hello &amp; welcome, &lt;friend&gt;!</p>" +
        "<br/>" +
        "<img src=\"x.png\" alt=\"An image\">" +
        "</div>" +
        "</body>" +
        "</html>";

    public static void main(String[] args) {
        System.out.println("Module 16: Full Integration & Differential Testing -- Java");
        System.out.println();

        Check.that("State enum has exactly 68 states", State.values().length == 68);

        boolean anyNotImplemented = false;
        for (State s : State.values()) {
            Tokenizer t = new Tokenizer("x");
            t.forceState(s);
            t.currentToken = new DoctypeToken();
            t.currentAttribute = new Attribute("", "");
            try {
                t.stepOnce();
            } catch (NotImplementedException e) {
                anyNotImplemented = true;
                System.out.println("  STILL UNIMPLEMENTED: " + s);
            } catch (Exception e) {
                // other exceptions from this minimal fixture are fine --
                // we only care whether NotImplementedException fires
            }
        }
        Check.that("every one of the 68 states is dispatchable -- none still throws NotImplementedException", !anyNotImplemented);

        Tokenizer pageTokenizer = new Tokenizer(REALISTIC_PAGE);
        List<Token> pageTokens = pageTokenizer.run();
        Check.that("a complete, realistic HTML page tokenizes with zero parse errors",
            pageTokenizer.getParseErrors().isEmpty());

        List<Token> struct = structural(pageTokens);
        StringBuilder shape = new StringBuilder();
        for (Token t : struct) {
            if (t instanceof DoctypeToken) shape.append("DOCTYPE:").append(((DoctypeToken) t).name).append(" ");
            else if (t instanceof CommentToken) shape.append("COMMENT:").append(((CommentToken) t).data.trim()).append(" ");
            else if (t instanceof StartTagToken) {
                StartTagToken st = (StartTagToken) t;
                shape.append("<").append(st.tagName).append(st.selfClosing ? "/" : "").append("> ");
            } else if (t instanceof EndTagToken) shape.append("</").append(((EndTagToken) t).tagName).append("> ");
            else if (t instanceof EOFToken) shape.append("EOF ");
        }
        String expected = "DOCTYPE:html COMMENT:page header <html> <head> <meta> <title> </title> </head> " +
            "<body> <div> <p> </p> <br/> <img> </div> </body> </html> EOF ";
        Check.that("the realistic page produces the exact expected structural token sequence",
            shape.toString().equals(expected));

        StartTagToken div = null;
        for (Token t : struct) {
            if (t instanceof StartTagToken && ((StartTagToken) t).tagName.equals("div")) { div = (StartTagToken) t; break; }
        }
        Check.that("attributes and entities inside the realistic page decode correctly",
            div.attributes.size() == 2
                && div.attributes.get(0).name.equals("class") && div.attributes.get(0).value.equals("main")
                && div.attributes.get(1).name.equals("data-id") && div.attributes.get(1).value.equals("42")
                && textOf(pageTokens).contains("Test & Page")
                && textOf(pageTokens).contains("Hello & welcome, <friend>!"));

        // --- The architectural payoff: WHY tree construction has to exist ---
        String scriptSrc = "<script>if (a<b) { console.log(\"hi\"); }</script>";
        List<Token> scriptTokens = new Tokenizer(scriptSrc).run();
        List<Token> scriptStruct = structural(scriptTokens);
        boolean hasScriptEndTag = false;
        for (Token t : scriptStruct) if (t instanceof EndTagToken && ((EndTagToken) t).tagName.equals("script")) hasScriptEndTag = true;
        Check.that("without tree construction, ordinary JS containing \"<\" corrupts the rest of tokenizing",
            scriptStruct.get(0) instanceof StartTagToken && ((StartTagToken) scriptStruct.get(0)).tagName.equals("script")
                && scriptStruct.get(1) instanceof StartTagToken && ((StartTagToken) scriptStruct.get(1)).tagName.equals("b)")
                && !hasScriptEndTag);

        // --- A grab-bag of features combined ---
        List<Token> inputTokens = new Tokenizer("<input type=\"text\" value=\"a&amp;b\" type=\"hidden\"/>after").run();
        StartTagToken input = (StartTagToken) structural(inputTokens).get(0);
        Check.that("a self-closing tag with a duplicate attribute and an entity in its value, mid-document",
            input.tagName.equals("input") && input.selfClosing
                && input.attributes.size() == 2
                && input.attributes.get(0).name.equals("type") && input.attributes.get(0).value.equals("text")
                && input.attributes.get(1).name.equals("value") && input.attributes.get(1).value.equals("a&b"));

        List<Token> cdataTokens = new Tokenizer("<p>before<![CDATA[<raw>&notdecoded;]]>after</p>").run();
        Check.that("a CDATA section embedded directly in an otherwise ordinary document",
            textOf(cdataTokens).equals("before<raw>&notdecoded;after"));

        Check.summary();
    }
}
