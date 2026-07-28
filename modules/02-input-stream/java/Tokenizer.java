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
    private final String input;
    private int pos = 0;
    private State state = State.DATA;
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

    public Tokenizer(String input) {
        this.input = Preprocessor.preprocess(input);
    }

    private boolean eof() {
        return pos >= input.length();
    }

    private char consume() {
        return input.charAt(pos++);
    }

    private void emit(Token token) {
        tokens.add(token);
    }

    /** The ONLY state with real logic in this module. Only its EOF branch
     * is actually implemented — the '&' and '<' branches, and the plain
     * "emit a character" branch, are stubbed with a pointer to the module
     * that completes them. */
    private void dataState() {
        if (eof()) {
            emit(new EOFToken());
            halted = true;
            return;
        }
        char c = consume();
        if (c == '&') {
            throw new NotImplementedException(State.CHARACTER_REFERENCE_IN_DATA.specName, 4);
        }
        if (c == '<') {
            throw new NotImplementedException(State.TAG_OPEN.specName, 9);
        }
        throw new NotImplementedException("Data (character-emission branch)", 3);
    }

    private void step() {
        if (state == State.DATA) {
            dataState();
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
