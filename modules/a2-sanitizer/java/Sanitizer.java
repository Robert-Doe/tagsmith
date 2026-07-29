import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Two real, distinct attack surfaces a sanitizer must close, both built
 * directly on machinery this course already has: dangerous ELEMENTS
 * (script -- Modules 6-8's RAWTEXT/script-data family) and dangerous
 * ATTRIBUTES on otherwise-safe elements (event handlers, javascript:
 * URLs -- Module 10's parsed attribute list). Deliberately not a
 * complete real-world sanitizer's rule set (see DECISIONS.md).
 */
public class Sanitizer {
    private static final Set<String> DROPPED_ELEMENTS = new HashSet<>(java.util.Arrays.asList("script"));
    private static final Set<String> URL_ATTRS = new HashSet<>(java.util.Arrays.asList("href", "src"));
    private static final Pattern DANGEROUS_URL_SCHEME = Pattern.compile("^\\s*javascript:.*", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Set<String> VOID_ELEMENTS = new HashSet<>(java.util.Arrays.asList(
            "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"));

    private static String escapeText(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;");
    }

    private static String escapeAttrValue(String s) {
        return s.replace("&", "&amp;").replace("\"", "&quot;");
    }

    private static boolean isDangerousAttribute(Attribute attr) {
        String name = attr.name.toLowerCase();
        if (name.startsWith("on")) {
            return true;
        }
        if (URL_ATTRS.contains(name) && DANGEROUS_URL_SCHEME.matcher(attr.value).matches()) {
            return true;
        }
        return false;
    }

    /** Returns a sanitized copy of the tree -- never mutates the input
     * tree. Returns null if the whole node (element AND its content) must
     * be dropped. */
    static TreeNode sanitizeNode(TreeNode node) {
        if (node instanceof ElementNode) {
            ElementNode el = (ElementNode) node;
            if (DROPPED_ELEMENTS.contains(el.tagName)) {
                return null;
            }
            java.util.List<Attribute> cleanAttrs = new java.util.ArrayList<>();
            for (Attribute a : el.attributes) {
                if (!isDangerousAttribute(a)) {
                    cleanAttrs.add(a);
                }
            }
            ElementNode clean = new ElementNode(el.tagName, cleanAttrs);
            for (TreeNode child : el.children) {
                TreeNode cleanChild = sanitizeNode(child);
                if (cleanChild != null) {
                    clean.children.add(cleanChild);
                }
            }
            return clean;
        }
        if (node instanceof TextNode) {
            return new TextNode(((TextNode) node).data);
        }
        if (node instanceof CommentNode) {
            return new CommentNode(((CommentNode) node).data);
        }
        return node;
    }

    private static String serializeNode(TreeNode node) {
        if (node instanceof TextNode) {
            return escapeText(((TextNode) node).data);
        }
        if (node instanceof CommentNode) {
            return "<!--" + ((CommentNode) node).data + "-->";
        }
        if (node instanceof ElementNode) {
            ElementNode el = (ElementNode) node;
            StringBuilder attrs = new StringBuilder();
            for (Attribute a : el.attributes) {
                attrs.append(' ').append(a.name).append("=\"").append(escapeAttrValue(a.value)).append('"');
            }
            if (VOID_ELEMENTS.contains(el.tagName)) {
                return "<" + el.tagName + attrs + ">";
            }
            StringBuilder inner = new StringBuilder();
            for (TreeNode child : el.children) {
                inner.append(serializeNode(child));
            }
            return "<" + el.tagName + attrs + ">" + inner + "</" + el.tagName + ">";
        }
        return "";
    }

    /** The whole point of this module: parse with the REAL tokenizer (so
     * RCDATA/RAWTEXT/script-data boundaries are respected exactly the way
     * a browser respects them), sanitize the resulting tree structurally,
     * then serialize back to a string. Never touches the raw source text
     * with a pattern match. */
    public static String sanitize(String html) {
        DocumentNode doc = new TreeBuilder(html).run();
        StringBuilder out = new StringBuilder();
        for (TreeNode child : doc.children) {
            TreeNode cleanChild = sanitizeNode(child);
            if (cleanChild != null) {
                out.append(serializeNode(cleanChild));
            }
        }
        return out.toString();
    }
}
