import java.util.ArrayList;
import java.util.List;

/*
 * The six token types the spec defines in the 8.2.4 preamble, before any
 * state is described. Field names and initial values below are taken
 * directly from that preamble, not invented:
 *   - DOCTYPE: name, public identifier, system identifier (each starts
 *     "missing," not empty string), and a force-quirks flag (off).
 *   - Start/end tag: a tag name, a self-closing flag (unset), and a list
 *     of attributes (each with a name and a value).
 *   - Comment: data (starts empty string).
 *   - Character: data (spec: exactly ONE character per token).
 *   - EOF: no fields.
 *
 * All package-private on purpose: this module directory is self-contained,
 * so nothing here needs to be visible outside it.
 */

abstract class Token {
}

class DoctypeToken extends Token {
    String name = null; // null = "missing" per spec, distinct from ""
    String publicIdentifier = null;
    String systemIdentifier = null;
    boolean forceQuirks = false;
}

class Attribute {
    final String name;
    final String value;

    Attribute(String name, String value) {
        this.name = name;
        this.value = value;
    }
}

abstract class TagToken extends Token {
    String tagName = "";
    boolean selfClosing = false;
    List<Attribute> attributes = new ArrayList<>();
}

class StartTagToken extends TagToken {
}

class EndTagToken extends TagToken {
}

class CommentToken extends Token {
    String data = "";
}

class CharacterToken extends Token {
    // One UTF-16 code unit, per this module's documented simplification —
    // see prerequisites/unicode-codepoints-vs-utf16.html and DECISIONS.md.
    final char data;

    CharacterToken(char data) {
        this.data = data;
    }
}

class EOFToken extends Token {
}
