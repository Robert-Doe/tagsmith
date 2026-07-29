'use strict';

/**
 * Spec section 8.2.4.69, "Tokenizing character references" -- the shared
 * algorithm every "Character reference in X state" invokes. Not itself a
 * switch-target state (see State.js's header comment).
 *
 * Deliberately scoped down from the full spec for this course:
 *  - NAMED_REFERENCES below is a documented SUBSET of the real named
 *    character reference table (which has hundreds of entries). This is a
 *    scope decision, not an oversight -- see DECISIONS.md.
 *  - Only 'amp', 'lt', 'gt', and 'quot' get the legacy semicolon-optional
 *    form modeled; the real table allows this for a larger, specific set.
 *  - The full "disallowed character reference code points" enumeration
 *    (a long fixed list of control characters / noncharacters that get a
 *    parse error but are NOT substituted) is not exhaustively implemented.
 *    The four cases that change OUTPUT (NUL, out-of-range, surrogate,
 *    Windows-1252 range) are fully implemented.
 */

const NAMED_REFERENCES = {
  'amp;': '&', amp: '&',
  'lt;': '<', lt: '<',
  'gt;': '>', gt: '>',
  'quot;': '"', quot: '"',
  'apos;': "'",
  'nbsp;': ' ',
  'copy;': '©',
  'reg;': '®',
  'trade;': '™',
  'mdash;': '—',
  'ndash;': '–',
  'hellip;': '…',
  'euro;': '€',
  'times;': '×',
  'divide;': '÷',
  'plusmn;': '±',
  'deg;': '°',
  'sect;': '§',
  'para;': '¶',
  'micro;': 'µ',
  'laquo;': '«',
  'raquo;': '»',
};

const LONGEST_NAME_LENGTH = Math.max(...Object.keys(NAMED_REFERENCES).map((k) => k.length));

// The exact legacy Windows-1252-derived replacement table for numeric
// references that land in the C1 control range (0x80-0x9F).
const WINDOWS_1252_REPLACEMENTS = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e,
  0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6,
  0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152,
  0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c,
  0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a,
  0x9c: 0x0153, 0x9e: 0x017e, 0x9f: 0x0178,
};

const NOT_A_REFERENCE_TERMINATORS = new Set(['\t', '\n', '\f', ' ', '<', '&']);

function isHexDigit(c) {
  return c !== undefined && /[0-9a-fA-F]/.test(c);
}

function isDecimalDigit(c) {
  return c !== undefined && /[0-9]/.test(c);
}

function isAlphanumeric(c) {
  return c !== undefined && /[a-zA-Z0-9]/.test(c);
}

function mapNumericCodePoint(tokenizer, codePoint) {
  if (codePoint === 0) {
    tokenizer.reportParseError('null-character-reference');
    return 0xfffd;
  }
  if (codePoint > 0x10ffff) {
    tokenizer.reportParseError('character-reference-outside-unicode-range');
    return 0xfffd;
  }
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
    tokenizer.reportParseError('surrogate-character-reference');
    return 0xfffd;
  }
  if (WINDOWS_1252_REPLACEMENTS[codePoint] !== undefined) {
    tokenizer.reportParseError('control-character-reference');
    return WINDOWS_1252_REPLACEMENTS[codePoint];
  }
  return codePoint;
}

function consumeNumericReference(tokenizer, startPos) {
  tokenizer.consume(); // the '#'
  let isHex = false;
  if (tokenizer.peek() === 'x' || tokenizer.peek() === 'X') {
    tokenizer.consume();
    isHex = true;
  }
  const digitTest = isHex ? isHexDigit : isDecimalDigit;
  let digits = '';
  while (digitTest(tokenizer.peek())) {
    digits += tokenizer.consume();
  }
  if (digits.length === 0) {
    tokenizer.pos = startPos;
    tokenizer.reportParseError('absence-of-digits-in-numeric-character-reference');
    return null;
  }
  if (tokenizer.peek() === ';') {
    tokenizer.consume();
  } else {
    tokenizer.reportParseError('missing-semicolon-after-character-reference');
  }
  const raw = parseInt(digits, isHex ? 16 : 10);
  const finalCodePoint = mapNumericCodePoint(tokenizer, raw);
  return String.fromCodePoint(finalCodePoint);
}

function consumeNamedReference(tokenizer, startPos) {
  const lookahead = tokenizer.input.slice(tokenizer.pos, tokenizer.pos + LONGEST_NAME_LENGTH);
  for (let len = lookahead.length; len > 0; len--) {
    const candidate = lookahead.slice(0, len);
    if (Object.prototype.hasOwnProperty.call(NAMED_REFERENCES, candidate)) {
      tokenizer.pos += len;
      if (!candidate.endsWith(';')) {
        tokenizer.reportParseError('missing-semicolon-after-character-reference');
      }
      return NAMED_REFERENCES[candidate];
    }
  }
  tokenizer.pos = startPos;
  return null;
}

/**
 * Returns the decoded string on success (one code point's worth of UTF-16
 * code units), or null if the '&' was not the start of a valid character
 * reference at all (caller should then treat '&' as a literal character).
 * additionalAllowedCharacter is used from attribute-value context
 * (Module 11) -- this module always passes null/undefined.
 */
function consumeCharacterReference(tokenizer, additionalAllowedCharacter) {
  const startPos = tokenizer.pos;
  if (tokenizer.eof()) return null;
  const c = tokenizer.peek();
  if (
    NOT_A_REFERENCE_TERMINATORS.has(c) ||
    (additionalAllowedCharacter !== undefined && c === additionalAllowedCharacter)
  ) {
    return null;
  }
  if (c === '#') {
    return consumeNumericReference(tokenizer, startPos);
  }
  if (isAlphanumeric(c)) {
    return consumeNamedReference(tokenizer, startPos);
  }
  return null;
}

module.exports = { consumeCharacterReference, NAMED_REFERENCES, WINDOWS_1252_REPLACEMENTS };
