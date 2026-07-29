import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * The tag-name-to-tokenizer-state table Module 9 explicitly said this
 * course's Track 1 tokenizer could never own -- this table, and the
 * moment it gets applied (right after pushing a StartTagToken's element,
 * BEFORE the tokenizer consumes another character), is the entire
 * missing piece Module 16 proved was necessary by watching it fail.
 * Deliberately small: the real HTML5 list of RAWTEXT elements is longer
 * (iframe, noembed, noframes, noscript, xmp...) -- this covers enough to
 * demonstrate the mechanism, not the complete spec list.
 */
public class TreeBuilder {
    private static final Set<String> RCDATA_ELEMENTS = new HashSet<>(Arrays.asList("textarea", "title"));
    private static final Set<String> RAWTEXT_ELEMENTS = new HashSet<>(Arrays.asList("style", "xmp"));
    private static final Set<String> VOID_ELEMENTS = new HashSet<>(Arrays.asList(
            "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"));

    private final Tokenizer tokenizer;
    final DocumentNode document = new DocumentNode();
    private final List<TreeNode> stack = new ArrayList<>();

    public TreeBuilder(String html) {
        this(html, null);
    }

    /** `contextTagName` (nullable): parse `html` as a FRAGMENT, as if it
     * were being assigned to `contextElement.innerHTML` -- Module A3's
     * addition. Null behaves exactly as Module A1 left it: a normal,
     * top-level DATA-state parse. */
    public TreeBuilder(String html, String contextTagName) {
        this.tokenizer = new Tokenizer(html);
        if (contextTagName != null) {
            this.tokenizer.state = contextInitialState(contextTagName);
            this.tokenizer.setLastStartTagName(contextTagName);
        }
        this.stack.add(document); // stack of open elements; document is the permanent root
    }

    /** The other half of the tag-name -> state table: real HTML fragment
     * parsing (what `element.innerHTML = str` actually runs) picks the
     * tokenizer's INITIAL state from the CONTEXT element BEFORE parsing
     * starts, instead of Module A1's mechanism (switching mid-stream, the
     * instant a matching start tag is seen). Same table, applied at a
     * different moment -- see Module A3's DECISIONS.md. */
    static State contextInitialState(String contextTagName) {
        if (RCDATA_ELEMENTS.contains(contextTagName)) return State.RCDATA;
        if (RAWTEXT_ELEMENTS.contains(contextTagName)) return State.RAWTEXT;
        if (contextTagName.equals("script")) return State.SCRIPT_DATA;
        if (contextTagName.equals("plaintext")) return State.PLAINTEXT;
        return State.DATA;
    }

    private TreeNode currentNode() {
        return stack.get(stack.size() - 1);
    }

    /** Drives the tokenizer ONE STEP AT A TIME -- never calling its run()
     * loop -- specifically so tree construction can intervene between
     * tokenizer steps, exactly like a real browser's two-stage pipeline. */
    public DocumentNode run() {
        while (!tokenizer.isHalted()) {
            int before = tokenizer.tokensSoFar().size();
            tokenizer.step();
            List<Token> tokens = tokenizer.tokensSoFar();
            for (int i = before; i < tokens.size(); i++) {
                processToken(tokens.get(i));
            }
        }
        return document;
    }

    private void processToken(Token token) {
        if (token instanceof DoctypeToken) {
            DoctypeToken d = (DoctypeToken) token;
            document.doctype = new Doctype(d.name, d.publicIdentifier, d.systemIdentifier, d.forceQuirks);
            return;
        }
        if (token instanceof CommentToken) {
            currentNode().children.add(new CommentNode(((CommentToken) token).data));
            return;
        }
        if (token instanceof CharacterToken) {
            List<TreeNode> kids = currentNode().children;
            TreeNode last = kids.isEmpty() ? null : kids.get(kids.size() - 1);
            if (last instanceof TextNode) {
                ((TextNode) last).data += ((CharacterToken) token).data; // coalesce adjacent character tokens
            } else {
                kids.add(new TextNode(((CharacterToken) token).data));
            }
            return;
        }
        if (token instanceof StartTagToken) {
            insertStartTag((StartTagToken) token);
            return;
        }
        if (token instanceof EndTagToken) {
            closeMatchingElement(((EndTagToken) token).tagName);
            return;
        }
        // EOFToken: nothing to build
    }

    private void insertStartTag(StartTagToken token) {
        ElementNode el = new ElementNode(token.tagName, token.attributes);
        currentNode().children.add(el);

        if (token.selfClosing || VOID_ELEMENTS.contains(token.tagName)) {
            return; // never pushed -- has no children, per spec/convention
        }

        stack.add(el);

        // THE key moment: tell the tokenizer what this tag means, BEFORE it
        // consumes another character. This is the exact feedback loop
        // Module 9 proved the tokenizer alone cannot provide.
        if (RCDATA_ELEMENTS.contains(token.tagName)) {
            tokenizer.state = State.RCDATA;
            tokenizer.setLastStartTagName(token.tagName);
        } else if (RAWTEXT_ELEMENTS.contains(token.tagName)) {
            tokenizer.state = State.RAWTEXT;
            tokenizer.setLastStartTagName(token.tagName);
        } else if (token.tagName.equals("script")) {
            tokenizer.state = State.SCRIPT_DATA;
            tokenizer.setLastStartTagName(token.tagName);
        } else if (token.tagName.equals("plaintext")) {
            tokenizer.state = State.PLAINTEXT;
        }
    }

    /** Deliberately simplified: pop the stack until a matching tag name is
     * found, or do nothing if none exists. The real spec's "adoption
     * agency algorithm" handles genuinely misnested tags (<b><i></b></i>)
     * far more carefully -- explicitly out of scope here, see
     * DECISIONS.md. */
    private void closeMatchingElement(String tagName) {
        for (int i = stack.size() - 1; i >= 1; i--) {
            TreeNode node = stack.get(i);
            if (node instanceof ElementNode && ((ElementNode) node).tagName.equals(tagName)) {
                while (stack.size() > i) {
                    stack.remove(stack.size() - 1);
                }
                return;
            }
        }
        // no match found -- ignored, per this module's simplified scope
    }
}
