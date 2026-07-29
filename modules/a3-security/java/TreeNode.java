import java.util.ArrayList;
import java.util.List;

/**
 * A deliberately minimal DOM-like tree -- just enough to prove the
 * tokenizer/tree-constructor boundary, not a spec-complete tree
 * construction implementation (which has dozens of insertion modes and
 * the "adoption agency algorithm" for misnested tags -- explicitly out
 * of scope, see DECISIONS.md).
 */
abstract class TreeNode {
    final List<TreeNode> children = new ArrayList<>();
}

class DocumentNode extends TreeNode {
    Doctype doctype = null;
}

class Doctype {
    final String name;
    final String publicId;
    final String systemId;
    final boolean forceQuirks;

    Doctype(String name, String publicId, String systemId, boolean forceQuirks) {
        this.name = name;
        this.publicId = publicId;
        this.systemId = systemId;
        this.forceQuirks = forceQuirks;
    }
}

class ElementNode extends TreeNode {
    final String tagName;
    final List<Attribute> attributes;

    ElementNode(String tagName, List<Attribute> attributes) {
        this.tagName = tagName;
        this.attributes = attributes;
    }
}

class TextNode extends TreeNode {
    String data;

    TextNode(String data) {
        this.data = data;
    }
}

class CommentNode extends TreeNode {
    final String data;

    CommentNode(String data) {
        this.data = data;
    }
}
