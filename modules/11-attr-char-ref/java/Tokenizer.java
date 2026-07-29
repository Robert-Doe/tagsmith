import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Thrown by any state that isn't implemented yet. Carries the exact spec
 * state name and the number of the course module that will implement it,
 * so tests (and you, reading a stack trace) can tell "not built yet" apart
 * from "actually broken."
 */
class NotImplementedException extends RuntimeException {
    final String stateName;
    final int moduleNumber;

    NotImplementedException(String stateName, int moduleNumber) {
        super("[" + stateName + " state] is not implemented yet. It arrives in Module " + moduleNumber + ".");
        this.stateName = stateName;
        this.moduleNumber = moduleNumber;
    }
}

public class Tokenizer {
    // Package-private (not `private`): CharacterReference, a sibling class
    // in this same default package, needs direct read/write access to
    // back up and restore `pos` when a candidate reference turns out not
    // to be one, and to read `state` for parse-error bookkeeping.
    final String input;
    int pos = 0;
    State state = State.DATA;
    private final List<Token> tokens = new ArrayList<>();
    private boolean halted = false;

    /**
     * Maps every one of the 68 states to the module that will give it real
     * behavior. This map is scaffolding specific to this COURSE — a
     * production tokenizer would never ship it — but it's what lets
     * Module 1 prove the dispatch structure can already address all 68
     * rooms on the board.
     */
    private static final Map<State, Integer> STATE_MODULE_MAP = new EnumMap<>(State.class);
    static {
        STATE_MODULE_MAP.put(State.DATA, 3);
        STATE_MODULE_MAP.put(State.CHARACTER_REFERENCE_IN_DATA, 4);
        STATE_MODULE_MAP.put(State.RCDATA, 5);
        STATE_MODULE_MAP.put(State.CHARACTER_REFERENCE_IN_RCDATA, 4);
        STATE_MODULE_MAP.put(State.RAWTEXT, 5);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA, 6);
        STATE_MODULE_MAP.put(State.PLAINTEXT, 5);
        STATE_MODULE_MAP.put(State.TAG_OPEN, 9);
        STATE_MODULE_MAP.put(State.END_TAG_OPEN, 9);
        STATE_MODULE_MAP.put(State.TAG_NAME, 9);
        STATE_MODULE_MAP.put(State.RCDATA_LESS_THAN_SIGN, 5);
        STATE_MODULE_MAP.put(State.RCDATA_END_TAG_OPEN, 5);
        STATE_MODULE_MAP.put(State.RCDATA_END_TAG_NAME, 5);
        STATE_MODULE_MAP.put(State.RAWTEXT_LESS_THAN_SIGN, 5);
        STATE_MODULE_MAP.put(State.RAWTEXT_END_TAG_OPEN, 5);
        STATE_MODULE_MAP.put(State.RAWTEXT_END_TAG_NAME, 5);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_LESS_THAN_SIGN, 6);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_END_TAG_OPEN, 6);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_END_TAG_NAME, 6);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_ESCAPE_START, 7);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_ESCAPE_START_DASH, 7);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_ESCAPED, 7);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_ESCAPED_DASH, 7);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_ESCAPED_DASH_DASH, 7);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN, 7);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN, 7);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_ESCAPED_END_TAG_NAME, 7);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_DOUBLE_ESCAPE_START, 8);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_DOUBLE_ESCAPED, 8);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH, 8);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH, 8);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN, 8);
        STATE_MODULE_MAP.put(State.SCRIPT_DATA_DOUBLE_ESCAPE_END, 8);
        STATE_MODULE_MAP.put(State.BEFORE_ATTRIBUTE_NAME, 10);
        STATE_MODULE_MAP.put(State.ATTRIBUTE_NAME, 10);
        STATE_MODULE_MAP.put(State.AFTER_ATTRIBUTE_NAME, 10);
        STATE_MODULE_MAP.put(State.BEFORE_ATTRIBUTE_VALUE, 10);
        STATE_MODULE_MAP.put(State.ATTRIBUTE_VALUE_DOUBLE_QUOTED, 10);
        STATE_MODULE_MAP.put(State.ATTRIBUTE_VALUE_SINGLE_QUOTED, 10);
        STATE_MODULE_MAP.put(State.ATTRIBUTE_VALUE_UNQUOTED, 10);
        STATE_MODULE_MAP.put(State.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE, 11);
        STATE_MODULE_MAP.put(State.AFTER_ATTRIBUTE_VALUE_QUOTED, 10);
        STATE_MODULE_MAP.put(State.SELF_CLOSING_START_TAG, 10);
        STATE_MODULE_MAP.put(State.BOGUS_COMMENT, 12);
        STATE_MODULE_MAP.put(State.MARKUP_DECLARATION_OPEN, 12);
        STATE_MODULE_MAP.put(State.COMMENT_START, 13);
        STATE_MODULE_MAP.put(State.COMMENT_START_DASH, 13);
        STATE_MODULE_MAP.put(State.COMMENT, 13);
        STATE_MODULE_MAP.put(State.COMMENT_END_DASH, 13);
        STATE_MODULE_MAP.put(State.COMMENT_END, 13);
        STATE_MODULE_MAP.put(State.COMMENT_END_BANG, 13);
        STATE_MODULE_MAP.put(State.DOCTYPE, 14);
        STATE_MODULE_MAP.put(State.BEFORE_DOCTYPE_NAME, 14);
        STATE_MODULE_MAP.put(State.DOCTYPE_NAME, 14);
        STATE_MODULE_MAP.put(State.AFTER_DOCTYPE_NAME, 14);
        STATE_MODULE_MAP.put(State.AFTER_DOCTYPE_PUBLIC_KEYWORD, 14);
        STATE_MODULE_MAP.put(State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER, 14);
        STATE_MODULE_MAP.put(State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED, 14);
        STATE_MODULE_MAP.put(State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED, 14);
        STATE_MODULE_MAP.put(State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER, 14);
        STATE_MODULE_MAP.put(State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS, 14);
        STATE_MODULE_MAP.put(State.AFTER_DOCTYPE_SYSTEM_KEYWORD, 14);
        STATE_MODULE_MAP.put(State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER, 14);
        STATE_MODULE_MAP.put(State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED, 14);
        STATE_MODULE_MAP.put(State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED, 14);
        STATE_MODULE_MAP.put(State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER, 14);
        STATE_MODULE_MAP.put(State.BOGUS_DOCTYPE, 14);
        STATE_MODULE_MAP.put(State.CDATA_SECTION, 15);
    }

    private final List<String> parseErrors = new ArrayList<>();

    // New in Module 5:
    Token currentToken = null;       // the tag token being built, if any
    String tempBuffer = "";          // scratch space while trying to match an end tag
    String lastStartTagName = null;  // needed for "appropriate end tag token"

    // New in Module 10:
    Attribute currentAttribute = null; // not yet in currentToken's attributes list

    // New in Module 11:
    State attrValueReturnState = null; // which attribute-value state to resume after '&'
    Character additionalAllowedCharacter = null; // the closing quote, or null for unquoted

    public Tokenizer(String input) {
        this.input = Preprocessor.preprocess(input);
    }

    public void setLastStartTagName(String name) {
        this.lastStartTagName = name;
    }

    boolean eof() {
        return pos >= input.length();
    }

    char consume() {
        return input.charAt(pos++);
    }

    /** Look at a character without advancing pos, boxed so it can be null
     * past EOF -- mirrors the JS version's `undefined`. */
    Character peek() {
        return peek(0);
    }

    Character peek(int offset) {
        int p = pos + offset;
        return p < input.length() ? input.charAt(p) : null;
    }

    private void emit(Token token) {
        tokens.add(token);
    }

    /** Spec "parse error" notes don't stop tokenizing — they're recorded
     * and processing continues. Both branches that use this in Data state
     * still emit a token afterward. */
    void reportParseError(String description) {
        parseErrors.add(state.specName + ": " + description);
    }

    public List<String> getParseErrors() {
        return parseErrors;
    }

    /** Fully implemented, per spec section 8.2.4.1. '&' and '<' SWITCH the
     * state — they don't throw. Whatever happens next is decided on the
     * NEXT step() call, by whichever state we switched into. Right now
     * that's still an unimplemented state, so the next step() throws via
     * the generic fallback below — but the throw is no longer
     * dataState()'s own responsibility. */
    private void dataState() {
        if (eof()) {
            emit(new EOFToken());
            halted = true;
            return;
        }
        char c = consume();
        if (c == '&') {
            state = State.CHARACTER_REFERENCE_IN_DATA;
            return;
        }
        if (c == '<') {
            state = State.TAG_OPEN;
            return;
        }
        if (c == ' ') {
            reportParseError("unexpected-null-character");
            emit(new CharacterToken(c));
            return;
        }
        emit(new CharacterToken(c));
    }

    /** Shared by both character-reference states: run the algorithm, emit
     * whatever it decides, then hand control back to the state that
     * switched us here in the first place. */
    private void characterReferenceState(State returnState) {
        String decoded = CharacterReference.consumeCharacterReference(this, null, false);
        if (decoded == null) {
            emit(new CharacterToken('&'));
        } else {
            emit(new CharacterToken(decoded));
        }
        state = returnState;
    }

    private void characterReferenceInDataState() {
        characterReferenceState(State.DATA);
    }

    private void characterReferenceInRcdataState() {
        characterReferenceState(State.RCDATA);
    }

    /** Shared by RCDATA and RAWTEXT: identical except RCDATA also watches
     * for '&' (charRefState is null for RAWTEXT, which has no character
     * references at all). */
    private void textContentState(State charRefState, State lessThanState) {
        if (eof()) {
            emit(new EOFToken());
            halted = true;
            return;
        }
        char c = consume();
        if (charRefState != null && c == '&') {
            state = charRefState;
            return;
        }
        if (c == '<') {
            state = lessThanState;
            return;
        }
        if (c == 0) {
            reportParseError("unexpected-null-character");
            emit(new CharacterToken(c));
            return;
        }
        emit(new CharacterToken(c));
    }

    private void rcdataState() {
        textContentState(State.CHARACTER_REFERENCE_IN_RCDATA, State.RCDATA_LESS_THAN_SIGN);
    }

    private void rawtextState() {
        textContentState(null, State.RAWTEXT_LESS_THAN_SIGN);
    }

    /** PLAINTEXT never switches state again, ever -- there is no way back
     * out once entered, matching the legacy <plaintext> tag's real
     * behavior. Every character (even '<' and '&') is literal from here on. */
    private void plaintextState() {
        if (eof()) {
            emit(new EOFToken());
            halted = true;
            return;
        }
        char c = consume();
        if (c == 0) {
            reportParseError("unexpected-null-character");
            emit(new CharacterToken(c));
            return;
        }
        emit(new CharacterToken(c));
    }

    /** Shared by RCDATA/RAWTEXT/script-data less-than-sign states: '/'
     * commits to trying an end tag; anything else is just a literal '<',
     * with the current character reconsumed (never actually consumed
     * here, only peeked). bangState is new in Module 6 -- only script
     * data has a third branch, for '!' (the entry point to the escape
     * mechanism built in Module 7). Pass null for RCDATA/RAWTEXT. */
    private void lessThanSignState(State endTagOpenState, State returnState, State bangState) {
        Character next = peek();
        if (next != null && next == '/') {
            tempBuffer = "";
            consume();
            state = endTagOpenState;
            return;
        }
        if (bangState != null && next != null && next == '!') {
            consume();
            emit(new CharacterToken('<'));
            emit(new CharacterToken('!'));
            state = bangState;
            return;
        }
        emit(new CharacterToken('<'));
        state = returnState;
    }

    private void rcdataLessThanSignState() {
        lessThanSignState(State.RCDATA_END_TAG_OPEN, State.RCDATA, null);
    }

    private void rawtextLessThanSignState() {
        lessThanSignState(State.RAWTEXT_END_TAG_OPEN, State.RAWTEXT, null);
    }

    private static boolean isAsciiLetter(char c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
    }

    /** Shared by RCDATA/RAWTEXT end-tag-open states: an ASCII letter
     * commits to building an end tag token; anything else bails out,
     * emitting the '<' and '/' literally and reconsuming whatever we just
     * read. */
    private void endTagOpenState(State endTagNameState, State returnState) {
        if (eof()) {
            emit(new CharacterToken('<'));
            emit(new CharacterToken('/'));
            state = returnState;
            return;
        }
        char c = consume();
        if (isAsciiLetter(c)) {
            EndTagToken tag = new EndTagToken();
            tag.tagName = String.valueOf(Character.toLowerCase(c));
            currentToken = tag;
            tempBuffer = String.valueOf(c);
            state = endTagNameState;
            return;
        }
        emit(new CharacterToken('<'));
        emit(new CharacterToken('/'));
        state = returnState;
        pos -= 1; // reconsume in returnState
    }

    private void rcdataEndTagOpenState() {
        endTagOpenState(State.RCDATA_END_TAG_NAME, State.RCDATA);
    }

    private void rawtextEndTagOpenState() {
        endTagOpenState(State.RAWTEXT_END_TAG_NAME, State.RAWTEXT);
    }

    /** Shared by RCDATA/RAWTEXT end-tag-name states. This is where
     * "appropriate end tag token" lives: tab/LF/FF/space, '/', and '>'
     * only do anything special if the tag name built so far exactly
     * matches lastStartTagName -- otherwise every one of them (including
     * '>') falls through to the same "not actually a closing tag" bailout
     * as any other character. */
    private void endTagNameState(State returnState) {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        boolean isAppropriate = !atEof && ((EndTagToken) currentToken).tagName.equals(lastStartTagName);
        if (isAppropriate) {
            char c = boxed;
            if (c == '\t' || c == '\n' || c == '\f' || c == ' ') {
                state = State.BEFORE_ATTRIBUTE_NAME;
                return;
            }
            if (c == '/') {
                state = State.SELF_CLOSING_START_TAG;
                return;
            }
            if (c == '>') {
                emit(currentToken);
                currentToken = null;
                state = State.DATA;
                return;
            }
        }
        if (!atEof && isAsciiLetter(boxed)) {
            EndTagToken tag = (EndTagToken) currentToken;
            tag.tagName += Character.toLowerCase(boxed);
            tempBuffer += boxed;
            return;
        }
        // Bail out: this wasn't actually a closing tag after all. Dump
        // '<', '/', and everything gathered in tempBuffer as literal
        // characters, discard the half-built tag token, and reconsume
        // whatever we just read (nothing to reconsume at EOF).
        emit(new CharacterToken('<'));
        emit(new CharacterToken('/'));
        for (char bufChar : tempBuffer.toCharArray()) {
            emit(new CharacterToken(bufChar));
        }
        currentToken = null;
        state = returnState;
        if (!atEof) {
            pos -= 1;
        }
    }

    private void rcdataEndTagNameState() {
        endTagNameState(State.RCDATA);
    }

    private void rawtextEndTagNameState() {
        endTagNameState(State.RAWTEXT);
    }

    /** Script data reuses every shared helper Module 5 already built --
     * no character references (like RAWTEXT), and the base text/end-tag
     * chain is identical. The only new wiring is the bangState argument
     * to lessThanSignState, for '<!' (Module 7's entry point). */
    private void scriptDataState() {
        textContentState(null, State.SCRIPT_DATA_LESS_THAN_SIGN);
    }

    private void scriptDataLessThanSignState() {
        lessThanSignState(State.SCRIPT_DATA_END_TAG_OPEN, State.SCRIPT_DATA, State.SCRIPT_DATA_ESCAPE_START);
    }

    private void scriptDataEndTagOpenState() {
        endTagOpenState(State.SCRIPT_DATA_END_TAG_NAME, State.SCRIPT_DATA);
    }

    private void scriptDataEndTagNameState() {
        endTagNameState(State.SCRIPT_DATA);
    }

    /** We arrive here right after Module 6 already emitted '<' and '!'
     * for us. A single '-' commits further toward the hidden-comment
     * opener "<!--"; anything else means this was never a comment at
     * all, and we silently rejoin plain script data. */
    private void scriptDataEscapeStartState() {
        Character next = peek();
        if (next != null && next == '-') {
            consume();
            emit(new CharacterToken('-'));
            state = State.SCRIPT_DATA_ESCAPE_START_DASH;
            return;
        }
        state = State.SCRIPT_DATA; // reconsume
    }

    /** We've seen "<!-". One more dash completes "<!--" and enters
     * escaped mode already primed to watch for a closing "-->"
     * (dash-dash state). */
    private void scriptDataEscapeStartDashState() {
        Character next = peek();
        if (next != null && next == '-') {
            consume();
            emit(new CharacterToken('-'));
            state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
            return;
        }
        state = State.SCRIPT_DATA; // reconsume
    }

    /** Inside the hidden comment. EOF here is itself a parse error: a
     * hidden comment that never closes. */
    private void scriptDataEscapedState() {
        if (eof()) {
            reportParseError("eof-in-script-html-comment-like-text");
            emit(new EOFToken());
            halted = true;
            return;
        }
        char c = consume();
        if (c == '-') {
            emit(new CharacterToken('-'));
            state = State.SCRIPT_DATA_ESCAPED_DASH;
            return;
        }
        if (c == '<') {
            state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
            return;
        }
        if (c == 0) {
            reportParseError("unexpected-null-character");
            emit(new CharacterToken(c));
            return;
        }
        emit(new CharacterToken(c));
    }

    /** We've seen one '-' while escaped. A second dash advances toward
     * "-->"; anything else (including NUL) breaks the dash run and drops
     * back to plain escaped text. */
    private void scriptDataEscapedDashState() {
        if (eof()) {
            reportParseError("eof-in-script-html-comment-like-text");
            emit(new EOFToken());
            halted = true;
            return;
        }
        char c = consume();
        if (c == '-') {
            emit(new CharacterToken('-'));
            state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
            return;
        }
        if (c == '<') {
            state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
            return;
        }
        if (c == 0) {
            reportParseError("unexpected-null-character");
            emit(new CharacterToken(c));
            state = State.SCRIPT_DATA_ESCAPED;
            return;
        }
        emit(new CharacterToken(c));
        state = State.SCRIPT_DATA_ESCAPED;
    }

    /** We've seen two-or-more dashes in a row while escaped -- primed to
     * recognize "-->" as the comment's real close. Extra dashes just keep
     * emitting; '>' here is the ONLY way out of escaped mode entirely,
     * back to plain script data. */
    private void scriptDataEscapedDashDashState() {
        if (eof()) {
            reportParseError("eof-in-script-html-comment-like-text");
            emit(new EOFToken());
            halted = true;
            return;
        }
        char c = consume();
        if (c == '-') {
            emit(new CharacterToken('-'));
            return; // stay in this same state
        }
        if (c == '<') {
            state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
            return;
        }
        if (c == '>') {
            emit(new CharacterToken('>'));
            state = State.SCRIPT_DATA; // the hidden comment is over
            return;
        }
        if (c == 0) {
            reportParseError("unexpected-null-character");
            emit(new CharacterToken(c));
            state = State.SCRIPT_DATA_ESCAPED;
            return;
        }
        emit(new CharacterToken(c));
        state = State.SCRIPT_DATA_ESCAPED;
    }

    /** While escaped, '<' might start a real closing tag ('/') or might
     * start a NESTED, literal "<script" -- which flips into the double-
     * escape mechanism (Module 8). */
    private void scriptDataEscapedLessThanSignState() {
        Character next = peek();
        if (next != null && next == '/') {
            tempBuffer = "";
            consume();
            state = State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN;
            return;
        }
        if (next != null && isAsciiLetter(next)) {
            tempBuffer = "";
            emit(new CharacterToken('<'));
            state = State.SCRIPT_DATA_DOUBLE_ESCAPE_START; // reconsume the letter there
            return;
        }
        emit(new CharacterToken('<'));
        state = State.SCRIPT_DATA_ESCAPED; // reconsume
    }

    /** Identical shape to every other end-tag-open state -- reuses
     * Module 5's shared helper unchanged. */
    private void scriptDataEscapedEndTagOpenState() {
        endTagOpenState(State.SCRIPT_DATA_ESCAPED_END_TAG_NAME, State.SCRIPT_DATA_ESCAPED);
    }

    /** Same "appropriate end tag" mechanism as every other family -- a
     * failed match falls back to SCRIPT_DATA_ESCAPED, not plain
     * SCRIPT_DATA, since we're still logically inside the hidden
     * comment. */
    private void scriptDataEscapedEndTagNameState() {
        endTagNameState(State.SCRIPT_DATA_ESCAPED);
    }

    /** The six terminator characters shared by double-escape-start and
     * double-escape-end: tab, LF, FF, space, '/', '>'. */
    private static boolean isDoubleEscapeTerminator(char c) {
        return c == '\t' || c == '\n' || c == '\f' || c == ' ' || c == '/' || c == '>';
    }

    /** We arrive here mid-letter, reconsuming whatever letter
     * scriptDataEscapedLessThanSignState saw. This state and
     * scriptDataDoubleEscapeEndState are mirror images of each other:
     * this one watches for the temp buffer to spell "script" to ENTER
     * double-escaped mode; the other watches for the same to LEAVE it.
     * The comparison is an exact, case-SENSITIVE match against the
     * lowercase literal "script" -- typing "<SCRIPT>" inside the comment
     * does NOT trigger double-escaping, a real, easy-to-miss spec quirk. */
    private void scriptDataDoubleEscapeStartState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && isDoubleEscapeTerminator(boxed)) {
            state = tempBuffer.equals("script") ? State.SCRIPT_DATA_DOUBLE_ESCAPED : State.SCRIPT_DATA_ESCAPED;
            emit(new CharacterToken(boxed));
            return;
        }
        if (!atEof && isAsciiLetter(boxed)) {
            tempBuffer += boxed;
            emit(new CharacterToken(boxed));
            return; // stay -- keep building the candidate name
        }
        state = State.SCRIPT_DATA_ESCAPED;
        if (!atEof) {
            pos -= 1; // reconsume
        }
    }

    /** Same shape as scriptDataEscapedState, with one real difference:
     * '<' is emitted IMMEDIATELY here, not deferred -- see DECISIONS.md. */
    private void scriptDataDoubleEscapedState() {
        if (eof()) {
            reportParseError("eof-in-script-html-comment-like-text");
            emit(new EOFToken());
            halted = true;
            return;
        }
        char c = consume();
        if (c == '-') {
            emit(new CharacterToken('-'));
            state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH;
            return;
        }
        if (c == '<') {
            emit(new CharacterToken('<'));
            state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
            return;
        }
        if (c == 0) {
            reportParseError("unexpected-null-character");
            emit(new CharacterToken(c));
            return;
        }
        emit(new CharacterToken(c));
    }

    private void scriptDataDoubleEscapedDashState() {
        if (eof()) {
            reportParseError("eof-in-script-html-comment-like-text");
            emit(new EOFToken());
            halted = true;
            return;
        }
        char c = consume();
        if (c == '-') {
            emit(new CharacterToken('-'));
            state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH;
            return;
        }
        if (c == '<') {
            emit(new CharacterToken('<'));
            state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
            return;
        }
        if (c == 0) {
            reportParseError("unexpected-null-character");
            emit(new CharacterToken(c));
            state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
            return;
        }
        emit(new CharacterToken(c));
        state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
    }

    /** '>' here exits ALL the way back to plain SCRIPT_DATA -- not to
     * single-escaped mode. Seeing "-->" always means the OUTER hidden
     * comment is closing, no matter how deeply nested we currently are. */
    private void scriptDataDoubleEscapedDashDashState() {
        if (eof()) {
            reportParseError("eof-in-script-html-comment-like-text");
            emit(new EOFToken());
            halted = true;
            return;
        }
        char c = consume();
        if (c == '-') {
            emit(new CharacterToken('-'));
            return;
        }
        if (c == '<') {
            emit(new CharacterToken('<'));
            state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
            return;
        }
        if (c == '>') {
            emit(new CharacterToken('>'));
            state = State.SCRIPT_DATA;
            return;
        }
        if (c == 0) {
            reportParseError("unexpected-null-character");
            emit(new CharacterToken(c));
            state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
            return;
        }
        emit(new CharacterToken(c));
        state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
    }

    /** Only '/' matters here -- anything else just reconsumes back in
     * double-escaped mode. */
    private void scriptDataDoubleEscapedLessThanSignState() {
        Character next = peek();
        if (next != null && next == '/') {
            tempBuffer = "";
            consume();
            emit(new CharacterToken('/'));
            state = State.SCRIPT_DATA_DOUBLE_ESCAPE_END;
            return;
        }
        state = State.SCRIPT_DATA_DOUBLE_ESCAPED; // reconsume
    }

    /** Mirror image of scriptDataDoubleEscapeStartState: same exact,
     * case-sensitive "script" check, but success here means LEAVING
     * double-escaped mode (back to single-escaped), not entering it. */
    private void scriptDataDoubleEscapeEndState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && isDoubleEscapeTerminator(boxed)) {
            state = tempBuffer.equals("script") ? State.SCRIPT_DATA_ESCAPED : State.SCRIPT_DATA_DOUBLE_ESCAPED;
            emit(new CharacterToken(boxed));
            return;
        }
        if (!atEof && isAsciiLetter(boxed)) {
            tempBuffer += boxed;
            emit(new CharacterToken(boxed));
            return;
        }
        state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        if (!atEof) {
            pos -= 1;
        }
    }

    /** Entered from Data state's '<' branch. This is the tokenizer's ONLY
     * entry point into tag parsing -- notably, it has NO knowledge of
     * "special" tag names like textarea/script/style. Switching into
     * RCDATA/RAWTEXT/SCRIPT_DATA based on a tag's name is the tree
     * construction stage's job, one layer above this tokenizer, and
     * explicitly out of this course's Track 1 scope (see Track 2, Module
     * A1). This tokenizer always returns to plain DATA after any tag. */
    private void tagOpenState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && boxed == '!') {
            state = State.MARKUP_DECLARATION_OPEN;
            return;
        }
        if (!atEof && boxed == '/') {
            state = State.END_TAG_OPEN;
            return;
        }
        if (!atEof && isAsciiLetter(boxed)) {
            currentToken = new StartTagToken();
            state = State.TAG_NAME;
            pos -= 1; // reconsume the letter there
            return;
        }
        if (!atEof && boxed == '?') {
            reportParseError("unexpected-question-mark-instead-of-tag-name");
            currentToken = new CommentToken();
            state = State.BOGUS_COMMENT;
            pos -= 1; // reconsume
            return;
        }
        reportParseError("invalid-first-character-of-tag-name");
        emit(new CharacterToken('<'));
        state = State.DATA;
        if (!atEof) {
            pos -= 1; // reconsume
        }
    }

    /** Entered from Tag open state's '/' branch. */
    private void endTagOpenState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && isAsciiLetter(boxed)) {
            currentToken = new EndTagToken();
            state = State.TAG_NAME;
            pos -= 1; // reconsume
            return;
        }
        if (!atEof && boxed == '>') {
            reportParseError("missing-end-tag-name");
            state = State.DATA; // no token emitted at all
            return;
        }
        if (atEof) {
            reportParseError("eof-before-tag-name");
            emit(new CharacterToken('<'));
            emit(new CharacterToken('/'));
            state = State.DATA; // Data will see EOF itself on the next step
            return;
        }
        reportParseError("invalid-first-character-of-tag-name");
        currentToken = new CommentToken();
        state = State.BOGUS_COMMENT;
        pos -= 1; // reconsume
    }

    /** Emits currentToken and, if it's a StartTagToken, updates
     * lastStartTagName -- fulfilling the contract Module 5 established
     * before this producer existed. */
    private void emitCurrentTagToken() {
        emit(currentToken);
        if (currentToken instanceof StartTagToken) {
            lastStartTagName = ((StartTagToken) currentToken).tagName;
        }
        currentToken = null;
    }

    /** Entered by reconsuming a letter from tag-open or end-tag-open, with
     * currentToken already a fresh StartTagToken/EndTagToken. Unlike the
     * RCDATA/RAWTEXT/script-data end-tag-name states, there is NO
     * "appropriate end tag" check here -- once Data state has already
     * committed to tag-parsing via '<', '>' unconditionally closes
     * whatever tag is being built. */
    private void tagNameState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && (boxed == '\t' || boxed == '\n' || boxed == '\f' || boxed == ' ')) {
            state = State.BEFORE_ATTRIBUTE_NAME;
            return;
        }
        if (!atEof && boxed == '/') {
            state = State.SELF_CLOSING_START_TAG;
            return;
        }
        if (!atEof && boxed == '>') {
            emitCurrentTagToken();
            state = State.DATA;
            return;
        }
        if (!atEof && boxed >= 'A' && boxed <= 'Z') {
            appendToCurrentTagName(Character.toLowerCase(boxed));
            return;
        }
        if (!atEof && boxed == 0) {
            reportParseError("unexpected-null-character");
            appendToCurrentTagName('�'); // replaces IN THE NAME, not a separate char token
            return;
        }
        if (atEof) {
            reportParseError("eof-in-tag");
            emit(new EOFToken());
            halted = true; // the half-built tag token is discarded, not emitted
            return;
        }
        appendToCurrentTagName(boxed);
    }

    private void appendToCurrentTagName(char c) {
        ((TagToken) currentToken).tagName += c;
    }

    private static boolean isWhitespace(char c) {
        return c == '\t' || c == '\n' || c == '\f' || c == ' ';
    }

    private void beforeAttributeNameState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && isWhitespace(boxed)) {
            return; // ignore, stay
        }
        if (!atEof && boxed == '/') {
            state = State.SELF_CLOSING_START_TAG;
            return;
        }
        if (!atEof && boxed == '>') {
            emitCurrentTagToken();
            state = State.DATA;
            return;
        }
        if (!atEof && boxed == '=') {
            reportParseError("unexpected-equals-sign-before-attribute-name");
            currentAttribute = new Attribute("=", "");
            state = State.ATTRIBUTE_NAME;
            return;
        }
        // anything else, including EOF: start a new attribute
        currentAttribute = new Attribute("", "");
        state = State.ATTRIBUTE_NAME;
        if (!atEof) {
            pos -= 1; // reconsume
        }
    }

    /** The moment an attribute name is finished being built, it's
     * compared against every attribute already on the tag. A duplicate is
     * a parse error and gets silently dropped -- never pushed -- while
     * parsing continues normally. This is exactly the scenario Module 1's
     * DECISIONS.md flagged as the reason attributes are a LIST, not a
     * MAP: a Map would have let the second "class" silently overwrite the
     * first, which is the opposite of the spec-mandated keep-first rule. */
    private void finishAttributeName(State nextState) {
        TagToken tag = (TagToken) currentToken;
        boolean isDuplicate = false;
        for (Attribute a : tag.attributes) {
            if (a.name.equals(currentAttribute.name)) {
                isDuplicate = true;
                break;
            }
        }
        if (isDuplicate) {
            reportParseError("duplicate-attribute");
        } else {
            tag.attributes.add(currentAttribute);
        }
        state = nextState;
    }

    private void attributeNameState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && isWhitespace(boxed)) {
            finishAttributeName(State.AFTER_ATTRIBUTE_NAME);
            return;
        }
        if (atEof || boxed == '/' || boxed == '>') {
            finishAttributeName(State.AFTER_ATTRIBUTE_NAME);
            if (!atEof) {
                pos -= 1; // reconsume in after-attribute-name
            }
            return;
        }
        if (boxed == '=') {
            finishAttributeName(State.BEFORE_ATTRIBUTE_VALUE);
            return;
        }
        if (boxed >= 'A' && boxed <= 'Z') {
            currentAttribute.name += Character.toLowerCase(boxed);
            return;
        }
        if (boxed == 0) {
            reportParseError("unexpected-null-character");
            currentAttribute.name += '�';
            return;
        }
        if (boxed == '"' || boxed == '\'' || boxed == '<') {
            reportParseError("unexpected-character-in-attribute-name");
            currentAttribute.name += boxed; // still appended -- parse error, not fatal
            return;
        }
        currentAttribute.name += boxed;
    }

    private void afterAttributeNameState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && isWhitespace(boxed)) {
            return; // ignore, stay
        }
        if (!atEof && boxed == '/') {
            state = State.SELF_CLOSING_START_TAG;
            return;
        }
        if (!atEof && boxed == '=') {
            state = State.BEFORE_ATTRIBUTE_VALUE;
            return;
        }
        if (!atEof && boxed == '>') {
            emitCurrentTagToken();
            state = State.DATA;
            return;
        }
        if (atEof) {
            reportParseError("eof-in-tag");
            emit(new EOFToken());
            halted = true;
            return;
        }
        // anything else: a second (or third...) attribute is starting
        currentAttribute = new Attribute("", "");
        state = State.ATTRIBUTE_NAME;
        pos -= 1; // reconsume
    }

    private void beforeAttributeValueState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && isWhitespace(boxed)) {
            return; // ignore, stay
        }
        if (!atEof && boxed == '"') {
            state = State.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
            return;
        }
        if (!atEof && boxed == '\'') {
            state = State.ATTRIBUTE_VALUE_SINGLE_QUOTED;
            return;
        }
        if (!atEof && boxed == '>') {
            reportParseError("missing-attribute-value");
            emitCurrentTagToken();
            state = State.DATA;
            return;
        }
        // anything else, including EOF: unquoted value, reconsume
        state = State.ATTRIBUTE_VALUE_UNQUOTED;
        if (!atEof) {
            pos -= 1;
        }
    }

    /** Shared by the double- and single-quoted attribute value states --
     * identical shape, differing only in which character closes the
     * quote. '&' remembers where to come back to (attrValueReturnState)
     * and which character shouldn't be swallowed by a reference attempt
     * (additionalAllowedCharacter -- the quote itself), then hands off
     * to Module 11's real logic. */
    private void attributeValueQuotedState(char quoteChar, State returnState) {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && boxed == quoteChar) {
            state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
            return;
        }
        if (!atEof && boxed == '&') {
            attrValueReturnState = returnState;
            additionalAllowedCharacter = quoteChar;
            state = State.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE;
            return;
        }
        if (!atEof && boxed == 0) {
            reportParseError("unexpected-null-character");
            currentAttribute.value += '�';
            return;
        }
        if (atEof) {
            reportParseError("eof-in-tag");
            emit(new EOFToken());
            halted = true;
            return;
        }
        currentAttribute.value += boxed;
    }

    private void attributeValueDoubleQuotedState() {
        attributeValueQuotedState('"', State.ATTRIBUTE_VALUE_DOUBLE_QUOTED);
    }

    private void attributeValueSingleQuotedState() {
        attributeValueQuotedState('\'', State.ATTRIBUTE_VALUE_SINGLE_QUOTED);
    }

    private void attributeValueUnquotedState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && isWhitespace(boxed)) {
            state = State.BEFORE_ATTRIBUTE_NAME;
            return;
        }
        if (!atEof && boxed == '&') {
            attrValueReturnState = State.ATTRIBUTE_VALUE_UNQUOTED;
            additionalAllowedCharacter = null; // no quote to protect
            state = State.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE;
            return;
        }
        if (!atEof && boxed == '>') {
            emitCurrentTagToken();
            state = State.DATA;
            return;
        }
        if (!atEof && boxed == 0) {
            reportParseError("unexpected-null-character");
            currentAttribute.value += '�';
            return;
        }
        if (atEof) {
            reportParseError("eof-in-tag");
            emit(new EOFToken());
            halted = true;
            return;
        }
        // '"', '\'', '<', '=', '`' are all parse errors here but still literal
        currentAttribute.value += boxed;
    }

    private void afterAttributeValueQuotedState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && isWhitespace(boxed)) {
            state = State.BEFORE_ATTRIBUTE_NAME;
            return;
        }
        if (!atEof && boxed == '/') {
            state = State.SELF_CLOSING_START_TAG;
            return;
        }
        if (!atEof && boxed == '>') {
            emitCurrentTagToken();
            state = State.DATA;
            return;
        }
        if (atEof) {
            reportParseError("eof-in-tag");
            emit(new EOFToken());
            halted = true;
            return;
        }
        reportParseError("missing-whitespace-between-attributes");
        state = State.BEFORE_ATTRIBUTE_NAME;
        pos -= 1; // reconsume
    }

    private void selfClosingStartTagState() {
        boolean atEof = eof();
        Character boxed = atEof ? null : consume();
        if (!atEof && boxed == '>') {
            ((TagToken) currentToken).selfClosing = true;
            emitCurrentTagToken();
            state = State.DATA;
            return;
        }
        if (atEof) {
            reportParseError("eof-in-tag");
            emit(new EOFToken());
            halted = true;
            return;
        }
        reportParseError("unexpected-solidus-in-tag");
        state = State.BEFORE_ATTRIBUTE_NAME;
        pos -= 1; // reconsume
    }

    /** Reuses Module 4's shared algorithm, with two real differences from
     * Data/RCDATA's use of it: the decoded result (or literal '&' on
     * failure) is appended to currentAttribute.value, NOT emitted as a
     * token -- and isInAttribute=true enables the ambiguous-ampersand
     * exception inside CharacterReference.java. */
    private void characterReferenceInAttributeValueState() {
        String decoded = CharacterReference.consumeCharacterReference(this, additionalAllowedCharacter, true);
        if (decoded == null) {
            currentAttribute.value += '&';
        } else {
            currentAttribute.value += decoded;
        }
        state = attrValueReturnState;
    }

    void step() {
        if (state == State.DATA) {
            dataState();
            return;
        }
        if (state == State.CHARACTER_REFERENCE_IN_DATA) {
            characterReferenceInDataState();
            return;
        }
        if (state == State.CHARACTER_REFERENCE_IN_RCDATA) {
            characterReferenceInRcdataState();
            return;
        }
        if (state == State.RCDATA) {
            rcdataState();
            return;
        }
        if (state == State.RAWTEXT) {
            rawtextState();
            return;
        }
        if (state == State.PLAINTEXT) {
            plaintextState();
            return;
        }
        if (state == State.RCDATA_LESS_THAN_SIGN) {
            rcdataLessThanSignState();
            return;
        }
        if (state == State.RAWTEXT_LESS_THAN_SIGN) {
            rawtextLessThanSignState();
            return;
        }
        if (state == State.RCDATA_END_TAG_OPEN) {
            rcdataEndTagOpenState();
            return;
        }
        if (state == State.RAWTEXT_END_TAG_OPEN) {
            rawtextEndTagOpenState();
            return;
        }
        if (state == State.RCDATA_END_TAG_NAME) {
            rcdataEndTagNameState();
            return;
        }
        if (state == State.RAWTEXT_END_TAG_NAME) {
            rawtextEndTagNameState();
            return;
        }
        if (state == State.SCRIPT_DATA) {
            scriptDataState();
            return;
        }
        if (state == State.SCRIPT_DATA_LESS_THAN_SIGN) {
            scriptDataLessThanSignState();
            return;
        }
        if (state == State.SCRIPT_DATA_END_TAG_OPEN) {
            scriptDataEndTagOpenState();
            return;
        }
        if (state == State.SCRIPT_DATA_END_TAG_NAME) {
            scriptDataEndTagNameState();
            return;
        }
        if (state == State.SCRIPT_DATA_ESCAPE_START) {
            scriptDataEscapeStartState();
            return;
        }
        if (state == State.SCRIPT_DATA_ESCAPE_START_DASH) {
            scriptDataEscapeStartDashState();
            return;
        }
        if (state == State.SCRIPT_DATA_ESCAPED) {
            scriptDataEscapedState();
            return;
        }
        if (state == State.SCRIPT_DATA_ESCAPED_DASH) {
            scriptDataEscapedDashState();
            return;
        }
        if (state == State.SCRIPT_DATA_ESCAPED_DASH_DASH) {
            scriptDataEscapedDashDashState();
            return;
        }
        if (state == State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN) {
            scriptDataEscapedLessThanSignState();
            return;
        }
        if (state == State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN) {
            scriptDataEscapedEndTagOpenState();
            return;
        }
        if (state == State.SCRIPT_DATA_ESCAPED_END_TAG_NAME) {
            scriptDataEscapedEndTagNameState();
            return;
        }
        if (state == State.SCRIPT_DATA_DOUBLE_ESCAPE_START) {
            scriptDataDoubleEscapeStartState();
            return;
        }
        if (state == State.SCRIPT_DATA_DOUBLE_ESCAPED) {
            scriptDataDoubleEscapedState();
            return;
        }
        if (state == State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH) {
            scriptDataDoubleEscapedDashState();
            return;
        }
        if (state == State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH) {
            scriptDataDoubleEscapedDashDashState();
            return;
        }
        if (state == State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN) {
            scriptDataDoubleEscapedLessThanSignState();
            return;
        }
        if (state == State.SCRIPT_DATA_DOUBLE_ESCAPE_END) {
            scriptDataDoubleEscapeEndState();
            return;
        }
        if (state == State.TAG_OPEN) {
            tagOpenState();
            return;
        }
        if (state == State.END_TAG_OPEN) {
            endTagOpenState();
            return;
        }
        if (state == State.TAG_NAME) {
            tagNameState();
            return;
        }
        if (state == State.BEFORE_ATTRIBUTE_NAME) {
            beforeAttributeNameState();
            return;
        }
        if (state == State.ATTRIBUTE_NAME) {
            attributeNameState();
            return;
        }
        if (state == State.AFTER_ATTRIBUTE_NAME) {
            afterAttributeNameState();
            return;
        }
        if (state == State.BEFORE_ATTRIBUTE_VALUE) {
            beforeAttributeValueState();
            return;
        }
        if (state == State.ATTRIBUTE_VALUE_DOUBLE_QUOTED) {
            attributeValueDoubleQuotedState();
            return;
        }
        if (state == State.ATTRIBUTE_VALUE_SINGLE_QUOTED) {
            attributeValueSingleQuotedState();
            return;
        }
        if (state == State.ATTRIBUTE_VALUE_UNQUOTED) {
            attributeValueUnquotedState();
            return;
        }
        if (state == State.AFTER_ATTRIBUTE_VALUE_QUOTED) {
            afterAttributeValueQuotedState();
            return;
        }
        if (state == State.SELF_CLOSING_START_TAG) {
            selfClosingStartTagState();
            return;
        }
        if (state == State.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE) {
            characterReferenceInAttributeValueState();
            return;
        }
        throw new NotImplementedException(state.specName, STATE_MODULE_MAP.get(state));
    }

    public List<Token> run() {
        while (!halted) {
            step();
        }
        return tokens;
    }

    /** Lets tests inspect what was emitted so far even after run() throws
     * partway through -- the exception unwinds the stack, but `tokens`
     * itself was already mutated by every emit() call before the throw. */
    public List<Token> tokensSoFar() {
        return tokens;
    }

    static Integer moduleFor(State s) {
        return STATE_MODULE_MAP.get(s);
    }

    /** Test-only hook: force a state without running the loop up to it. */
    void forceState(State s) {
        this.state = s;
    }

    void stepOnce() {
        step();
    }
}
