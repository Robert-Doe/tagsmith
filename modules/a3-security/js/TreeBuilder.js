'use strict';

const { Tokenizer } = require('./Tokenizer');
const { State } = require('./State');
const { DoctypeToken, StartTagToken, EndTagToken, CommentToken, CharacterToken } = require('./Token');
const { DocumentNode, ElementNode, TextNode, CommentNode } = require('./TreeNode');

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
const RCDATA_ELEMENTS = new Set(['textarea', 'title']);
const RAWTEXT_ELEMENTS = new Set(['style', 'xmp']);
const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** The other half of the tag-name -> state table: real HTML fragment
 * parsing (what `element.innerHTML = str` actually runs) picks the
 * tokenizer's INITIAL state from the CONTEXT element BEFORE parsing
 * starts, instead of Module A1's mechanism (switching mid-stream, the
 * instant a matching start tag is seen). Same table, applied at a
 * different moment -- see Module A3's DECISIONS.md. */
function contextInitialState(contextTagName) {
  if (RCDATA_ELEMENTS.has(contextTagName)) return State.RCDATA;
  if (RAWTEXT_ELEMENTS.has(contextTagName)) return State.RAWTEXT;
  if (contextTagName === 'script') return State.SCRIPT_DATA;
  if (contextTagName === 'plaintext') return State.PLAINTEXT;
  return State.DATA;
}

class TreeBuilder {
  /** `contextTagName` (optional): parse `html` as a FRAGMENT, as if it
   * were being assigned to `contextElement.innerHTML` -- Module A3's
   * addition. Omitted entirely, this behaves exactly as Module A1 left
   * it: a normal, top-level DATA-state parse. */
  constructor(html, contextTagName) {
    this.tokenizer = new Tokenizer(html);
    if (contextTagName !== undefined) {
      this.tokenizer.state = contextInitialState(contextTagName);
      this.tokenizer.lastStartTagName = contextTagName;
    }
    this.document = new DocumentNode();
    this.stack = [this.document]; // stack of open elements; document is the permanent root
  }

  currentNode() {
    return this.stack[this.stack.length - 1];
  }

  /** Drives the tokenizer ONE STEP AT A TIME -- never calling its run()
   * loop -- specifically so tree construction can intervene between
   * tokenizer steps, exactly like a real browser's two-stage pipeline. */
  run() {
    while (!this.tokenizer.halted) {
      const before = this.tokenizer.tokens.length;
      this.tokenizer.step();
      for (let i = before; i < this.tokenizer.tokens.length; i++) {
        this.processToken(this.tokenizer.tokens[i]);
      }
    }
    return this.document;
  }

  processToken(token) {
    if (token instanceof DoctypeToken) {
      this.document.doctype = {
        name: token.name,
        publicId: token.publicIdentifier,
        systemId: token.systemIdentifier,
        forceQuirks: token.forceQuirks,
      };
      return;
    }
    if (token instanceof CommentToken) {
      this.currentNode().children.push(new CommentNode(token.data));
      return;
    }
    if (token instanceof CharacterToken) {
      const kids = this.currentNode().children;
      const last = kids[kids.length - 1];
      if (last instanceof TextNode) {
        last.data += token.data; // coalesce adjacent character tokens
      } else {
        kids.push(new TextNode(token.data));
      }
      return;
    }
    if (token instanceof StartTagToken) {
      this.insertStartTag(token);
      return;
    }
    if (token instanceof EndTagToken) {
      this.closeMatchingElement(token.tagName);
      return;
    }
    // EOFToken: nothing to build
  }

  insertStartTag(token) {
    const el = new ElementNode(token.tagName, token.attributes);
    this.currentNode().children.push(el);

    if (token.selfClosing || VOID_ELEMENTS.has(token.tagName)) {
      return; // never pushed -- has no children, per spec/convention
    }

    this.stack.push(el);

    // THE key moment: tell the tokenizer what this tag means, BEFORE it
    // consumes another character. This is the exact feedback loop
    // Module 9 proved the tokenizer alone cannot provide.
    if (RCDATA_ELEMENTS.has(token.tagName)) {
      this.tokenizer.state = State.RCDATA;
      this.tokenizer.lastStartTagName = token.tagName;
    } else if (RAWTEXT_ELEMENTS.has(token.tagName)) {
      this.tokenizer.state = State.RAWTEXT;
      this.tokenizer.lastStartTagName = token.tagName;
    } else if (token.tagName === 'script') {
      this.tokenizer.state = State.SCRIPT_DATA;
      this.tokenizer.lastStartTagName = token.tagName;
    } else if (token.tagName === 'plaintext') {
      this.tokenizer.state = State.PLAINTEXT;
    }
  }

  /** Deliberately simplified: pop the stack until a matching tag name is
   * found, or do nothing if none exists. The real spec's "adoption
   * agency algorithm" handles genuinely misnested tags (<b><i></b></i>)
   * far more carefully -- explicitly out of scope here, see
   * DECISIONS.md. */
  closeMatchingElement(tagName) {
    for (let i = this.stack.length - 1; i >= 1; i--) {
      if (this.stack[i] instanceof ElementNode && this.stack[i].tagName === tagName) {
        this.stack.length = i;
        return;
      }
    }
    // no match found -- ignored, per this module's simplified scope
  }
}

module.exports = { TreeBuilder, RCDATA_ELEMENTS, RAWTEXT_ELEMENTS, VOID_ELEMENTS, contextInitialState };
