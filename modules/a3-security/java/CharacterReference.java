import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Spec section 8.2.4.69, "Tokenizing character references" -- the shared
 * algorithm every "Character reference in X state" invokes. Not itself a
 * switch-target state (see State.java's header comment).
 *
 * Deliberately scoped down from the full spec for this course -- see
 * DECISIONS.md. Mirrors CharacterReference.js exactly; read that file's
 * header comment for the specifics of what's scoped out and why.
 */
class CharacterReference {

    private static final Map<String, String> NAMED_REFERENCES = new HashMap<>();
    private static final int LONGEST_NAME_LENGTH;
    private static final Map<Integer, Integer> WINDOWS_1252_REPLACEMENTS = new HashMap<>();
    private static final Set<Character> NOT_A_REFERENCE_TERMINATORS = new HashSet<>();

    static {
        NAMED_REFERENCES.put("amp;", "&");
        NAMED_REFERENCES.put("amp", "&");
        NAMED_REFERENCES.put("lt;", "<");
        NAMED_REFERENCES.put("lt", "<");
        NAMED_REFERENCES.put("gt;", ">");
        NAMED_REFERENCES.put("gt", ">");
        NAMED_REFERENCES.put("quot;", "\"");
        NAMED_REFERENCES.put("quot", "\"");
        NAMED_REFERENCES.put("apos;", "'");
        NAMED_REFERENCES.put("nbsp;", " ");
        NAMED_REFERENCES.put("copy;", "©");
        NAMED_REFERENCES.put("reg;", "®");
        NAMED_REFERENCES.put("trade;", "™");
        NAMED_REFERENCES.put("mdash;", "—");
        NAMED_REFERENCES.put("ndash;", "–");
        NAMED_REFERENCES.put("hellip;", "…");
        NAMED_REFERENCES.put("euro;", "€");
        NAMED_REFERENCES.put("times;", "×");
        NAMED_REFERENCES.put("divide;", "÷");
        NAMED_REFERENCES.put("plusmn;", "±");
        NAMED_REFERENCES.put("deg;", "°");
        NAMED_REFERENCES.put("sect;", "§");
        NAMED_REFERENCES.put("para;", "¶");
        NAMED_REFERENCES.put("micro;", "µ");
        NAMED_REFERENCES.put("laquo;", "«");
        NAMED_REFERENCES.put("raquo;", "»");

        int longest = 0;
        for (String key : NAMED_REFERENCES.keySet()) {
            longest = Math.max(longest, key.length());
        }
        LONGEST_NAME_LENGTH = longest;

        WINDOWS_1252_REPLACEMENTS.put(0x80, 0x20AC);
        WINDOWS_1252_REPLACEMENTS.put(0x82, 0x201A);
        WINDOWS_1252_REPLACEMENTS.put(0x83, 0x0192);
        WINDOWS_1252_REPLACEMENTS.put(0x84, 0x201E);
        WINDOWS_1252_REPLACEMENTS.put(0x85, 0x2026);
        WINDOWS_1252_REPLACEMENTS.put(0x86, 0x2020);
        WINDOWS_1252_REPLACEMENTS.put(0x87, 0x2021);
        WINDOWS_1252_REPLACEMENTS.put(0x88, 0x02C6);
        WINDOWS_1252_REPLACEMENTS.put(0x89, 0x2030);
        WINDOWS_1252_REPLACEMENTS.put(0x8A, 0x0160);
        WINDOWS_1252_REPLACEMENTS.put(0x8B, 0x2039);
        WINDOWS_1252_REPLACEMENTS.put(0x8C, 0x0152);
        WINDOWS_1252_REPLACEMENTS.put(0x8E, 0x017D);
        WINDOWS_1252_REPLACEMENTS.put(0x91, 0x2018);
        WINDOWS_1252_REPLACEMENTS.put(0x92, 0x2019);
        WINDOWS_1252_REPLACEMENTS.put(0x93, 0x201C);
        WINDOWS_1252_REPLACEMENTS.put(0x94, 0x201D);
        WINDOWS_1252_REPLACEMENTS.put(0x95, 0x2022);
        WINDOWS_1252_REPLACEMENTS.put(0x96, 0x2013);
        WINDOWS_1252_REPLACEMENTS.put(0x97, 0x2014);
        WINDOWS_1252_REPLACEMENTS.put(0x98, 0x02DC);
        WINDOWS_1252_REPLACEMENTS.put(0x99, 0x2122);
        WINDOWS_1252_REPLACEMENTS.put(0x9A, 0x0161);
        WINDOWS_1252_REPLACEMENTS.put(0x9B, 0x203A);
        WINDOWS_1252_REPLACEMENTS.put(0x9C, 0x0153);
        WINDOWS_1252_REPLACEMENTS.put(0x9E, 0x017E);
        WINDOWS_1252_REPLACEMENTS.put(0x9F, 0x0178);

        NOT_A_REFERENCE_TERMINATORS.add('\t');
        NOT_A_REFERENCE_TERMINATORS.add('\n');
        NOT_A_REFERENCE_TERMINATORS.add('\f');
        NOT_A_REFERENCE_TERMINATORS.add(' ');
        NOT_A_REFERENCE_TERMINATORS.add('<');
        NOT_A_REFERENCE_TERMINATORS.add('&');
    }

    private static boolean isHexDigit(Character c) {
        return c != null && ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'));
    }

    private static boolean isDecimalDigit(Character c) {
        return c != null && c >= '0' && c <= '9';
    }

    private static boolean isAlphanumeric(Character c) {
        return c != null && (Character.isLetter(c) || Character.isDigit(c)) && c < 128;
    }

    private static int mapNumericCodePoint(Tokenizer tokenizer, long codePoint) {
        if (codePoint == 0) {
            tokenizer.reportParseError("null-character-reference");
            return 0xFFFD;
        }
        if (codePoint > 0x10FFFF) {
            tokenizer.reportParseError("character-reference-outside-unicode-range");
            return 0xFFFD;
        }
        if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
            tokenizer.reportParseError("surrogate-character-reference");
            return 0xFFFD;
        }
        Integer replacement = WINDOWS_1252_REPLACEMENTS.get((int) codePoint);
        if (replacement != null) {
            tokenizer.reportParseError("control-character-reference");
            return replacement;
        }
        return (int) codePoint;
    }

    private static String consumeNumericReference(Tokenizer tokenizer, int startPos) {
        tokenizer.consume(); // the '#'
        boolean isHex = false;
        Character maybeX = tokenizer.peek();
        if (maybeX != null && (maybeX == 'x' || maybeX == 'X')) {
            tokenizer.consume();
            isHex = true;
        }
        StringBuilder digits = new StringBuilder();
        while (isHex ? isHexDigit(tokenizer.peek()) : isDecimalDigit(tokenizer.peek())) {
            digits.append(tokenizer.consume());
        }
        if (digits.length() == 0) {
            tokenizer.pos = startPos;
            tokenizer.reportParseError("absence-of-digits-in-numeric-character-reference");
            return null;
        }
        Character semicolon = tokenizer.peek();
        if (semicolon != null && semicolon == ';') {
            tokenizer.consume();
        } else {
            tokenizer.reportParseError("missing-semicolon-after-character-reference");
        }
        long raw = Long.parseLong(digits.toString(), isHex ? 16 : 10);
        int finalCodePoint = mapNumericCodePoint(tokenizer, raw);
        return new String(Character.toChars(finalCodePoint));
    }

    /**
     * isInAttribute (new in Module 11) enables the "ambiguous ampersand"
     * exception: a legacy no-semicolon named match is undone entirely --
     * as if it were never attempted -- if it's immediately followed by
     * '=' or an alphanumeric character, but ONLY when consumed as part
     * of an attribute value. Outside attributes (Data/RCDATA, Module 4),
     * the exact same input decodes normally; this is a real, deliberate
     * asymmetry the spec draws for historical reasons (protecting things
     * like href="?a=1&amp=2" from being wrongly decoded). See DECISIONS.md.
     */
    private static String consumeNamedReference(Tokenizer tokenizer, int startPos, boolean isInAttribute) {
        int end = Math.min(tokenizer.pos + LONGEST_NAME_LENGTH, tokenizer.input.length());
        String lookahead = tokenizer.input.substring(tokenizer.pos, end);
        for (int len = lookahead.length(); len > 0; len--) {
            String candidate = lookahead.substring(0, len);
            String value = NAMED_REFERENCES.get(candidate);
            if (value != null) {
                boolean hasSemicolon = candidate.endsWith(";");
                if (!hasSemicolon && isInAttribute) {
                    int nextPos = tokenizer.pos + len;
                    Character next = nextPos < tokenizer.input.length() ? tokenizer.input.charAt(nextPos) : null;
                    if (next != null && (next == '=' || Character.isLetterOrDigit(next))) {
                        tokenizer.pos = startPos;
                        return null; // ambiguous ampersand: not a reference at all
                    }
                }
                tokenizer.pos += len;
                if (!hasSemicolon) {
                    tokenizer.reportParseError("missing-semicolon-after-character-reference");
                }
                return value;
            }
        }
        tokenizer.pos = startPos;
        return null;
    }

    /**
     * Returns the decoded string on success, or null if '&' was not the
     * start of a valid character reference (caller treats '&' literally).
     * additionalAllowedCharacter and isInAttribute are used from
     * attribute-value context (Module 11) -- Data/RCDATA (Module 4)
     * always pass null/false.
     */
    static String consumeCharacterReference(Tokenizer tokenizer, Character additionalAllowedCharacter, boolean isInAttribute) {
        int startPos = tokenizer.pos;
        if (tokenizer.eof()) return null;
        char c = tokenizer.peek();
        if (NOT_A_REFERENCE_TERMINATORS.contains(c)
                || (additionalAllowedCharacter != null && c == additionalAllowedCharacter)) {
            return null;
        }
        if (c == '#') {
            return consumeNumericReference(tokenizer, startPos);
        }
        if (isAlphanumeric(c)) {
            return consumeNamedReference(tokenizer, startPos, isInAttribute);
        }
        return null;
    }
}
