'use strict';

/**
 * A deliberately minimal DOM-like tree -- just enough to prove the
 * tokenizer/tree-constructor boundary, not a spec-complete tree
 * construction implementation (which has dozens of insertion modes and
 * the "adoption agency algorithm" for misnested tags -- explicitly out
 * of scope, see DECISIONS.md).
 */

class DocumentNode {
  constructor() {
    this.doctype = null; // { name, publicId, systemId, forceQuirks }
    this.children = [];
  }
}

class ElementNode {
  constructor(tagName, attributes) {
    this.tagName = tagName;
    this.attributes = attributes;
    this.children = [];
  }
}

class TextNode {
  constructor(data) {
    this.data = data;
  }
}

class CommentNode {
  constructor(data) {
    this.data = data;
  }
}

module.exports = { DocumentNode, ElementNode, TextNode, CommentNode };
