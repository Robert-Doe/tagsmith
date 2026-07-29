'use strict';

/**
 * Every named state from HTML5 tokenization spec section 8.2.4, as plain
 * strings. 68 states total (the spec's 69th subsection, "Tokenizing
 * character references," is a shared subroutine invoked BY states like
 * CHARACTER_REFERENCE_IN_DATA — it is not itself a switch-target state).
 *
 * The value of each entry is the exact spec section title, minus the
 * trailing "state" — so an error message that names a state doubles as a
 * search string you can paste into the spec page to land on its definition.
 */
const State = Object.freeze({
  DATA: 'Data',
  CHARACTER_REFERENCE_IN_DATA: 'Character reference in data',
  RCDATA: 'RCDATA',
  CHARACTER_REFERENCE_IN_RCDATA: 'Character reference in RCDATA',
  RAWTEXT: 'RAWTEXT',
  SCRIPT_DATA: 'Script data',
  PLAINTEXT: 'PLAINTEXT',
  TAG_OPEN: 'Tag open',
  END_TAG_OPEN: 'End tag open',
  TAG_NAME: 'Tag name',
  RCDATA_LESS_THAN_SIGN: 'RCDATA less-than sign',
  RCDATA_END_TAG_OPEN: 'RCDATA end tag open',
  RCDATA_END_TAG_NAME: 'RCDATA end tag name',
  RAWTEXT_LESS_THAN_SIGN: 'RAWTEXT less-than sign',
  RAWTEXT_END_TAG_OPEN: 'RAWTEXT end tag open',
  RAWTEXT_END_TAG_NAME: 'RAWTEXT end tag name',
  SCRIPT_DATA_LESS_THAN_SIGN: 'Script data less-than sign',
  SCRIPT_DATA_END_TAG_OPEN: 'Script data end tag open',
  SCRIPT_DATA_END_TAG_NAME: 'Script data end tag name',
  SCRIPT_DATA_ESCAPE_START: 'Script data escape start',
  SCRIPT_DATA_ESCAPE_START_DASH: 'Script data escape start dash',
  SCRIPT_DATA_ESCAPED: 'Script data escaped',
  SCRIPT_DATA_ESCAPED_DASH: 'Script data escaped dash',
  SCRIPT_DATA_ESCAPED_DASH_DASH: 'Script data escaped dash dash',
  SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN: 'Script data escaped less-than sign',
  SCRIPT_DATA_ESCAPED_END_TAG_OPEN: 'Script data escaped end tag open',
  SCRIPT_DATA_ESCAPED_END_TAG_NAME: 'Script data escaped end tag name',
  SCRIPT_DATA_DOUBLE_ESCAPE_START: 'Script data double escape start',
  SCRIPT_DATA_DOUBLE_ESCAPED: 'Script data double escaped',
  SCRIPT_DATA_DOUBLE_ESCAPED_DASH: 'Script data double escaped dash',
  SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: 'Script data double escaped dash dash',
  SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN: 'Script data double escaped less-than sign',
  SCRIPT_DATA_DOUBLE_ESCAPE_END: 'Script data double escape end',
  BEFORE_ATTRIBUTE_NAME: 'Before attribute name',
  ATTRIBUTE_NAME: 'Attribute name',
  AFTER_ATTRIBUTE_NAME: 'After attribute name',
  BEFORE_ATTRIBUTE_VALUE: 'Before attribute value',
  ATTRIBUTE_VALUE_DOUBLE_QUOTED: 'Attribute value (double-quoted)',
  ATTRIBUTE_VALUE_SINGLE_QUOTED: 'Attribute value (single-quoted)',
  ATTRIBUTE_VALUE_UNQUOTED: 'Attribute value (unquoted)',
  CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE: 'Character reference in attribute value',
  AFTER_ATTRIBUTE_VALUE_QUOTED: 'After attribute value (quoted)',
  SELF_CLOSING_START_TAG: 'Self-closing start tag',
  BOGUS_COMMENT: 'Bogus comment',
  MARKUP_DECLARATION_OPEN: 'Markup declaration open',
  COMMENT_START: 'Comment start',
  COMMENT_START_DASH: 'Comment start dash',
  COMMENT: 'Comment',
  COMMENT_END_DASH: 'Comment end dash',
  COMMENT_END: 'Comment end',
  COMMENT_END_BANG: 'Comment end bang',
  DOCTYPE: 'DOCTYPE',
  BEFORE_DOCTYPE_NAME: 'Before DOCTYPE name',
  DOCTYPE_NAME: 'DOCTYPE name',
  AFTER_DOCTYPE_NAME: 'After DOCTYPE name',
  AFTER_DOCTYPE_PUBLIC_KEYWORD: 'After DOCTYPE public keyword',
  BEFORE_DOCTYPE_PUBLIC_IDENTIFIER: 'Before DOCTYPE public identifier',
  DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED: 'DOCTYPE public identifier (double-quoted)',
  DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED: 'DOCTYPE public identifier (single-quoted)',
  AFTER_DOCTYPE_PUBLIC_IDENTIFIER: 'After DOCTYPE public identifier',
  BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS: 'Between DOCTYPE public and system identifiers',
  AFTER_DOCTYPE_SYSTEM_KEYWORD: 'After DOCTYPE system keyword',
  BEFORE_DOCTYPE_SYSTEM_IDENTIFIER: 'Before DOCTYPE system identifier',
  DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED: 'DOCTYPE system identifier (double-quoted)',
  DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED: 'DOCTYPE system identifier (single-quoted)',
  AFTER_DOCTYPE_SYSTEM_IDENTIFIER: 'After DOCTYPE system identifier',
  BOGUS_DOCTYPE: 'Bogus DOCTYPE',
  CDATA_SECTION: 'CDATA section',
});

module.exports = { State };
