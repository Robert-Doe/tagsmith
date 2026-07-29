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
    // Not final, as of Module 10: an attribute's name and value are both
    // built up one character at a time while tokenizing, so both fields
    // need to stay mutable for the lifetime of the tag being parsed.
    String name;
    String value;

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
    // One Unicode CODE POINT, per spec -- represented as a String because
    // Java's `char` is exactly one 16-bit UTF-16 code unit and literally
    // cannot hold an astral code point (e.g. an emoji produced by a
    // numeric character reference like &#128512;), which needs a
    // surrogate PAIR: two chars. Module 1 modeled this field as a single
    // `char` as a documented simplification; Module 4 is where that
    // simplification is revisited, because numeric character references
    // can reference any code point up to U+10FFFF. See the Unicode
    // prerequisite page.
    final String data;

    CharacterToken(String data) {
        this.data = data;
    }

    // Convenience constructor: the common case is still a single BMP
    // character (plain text, most named references, most numeric
    // references in practice).
    CharacterToken(char data) {
        this.data = String.valueOf(data);
    }
}

class EOFToken extends Token {
}
