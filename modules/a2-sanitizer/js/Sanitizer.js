'use strict';

const { TreeBuilder } = require('./TreeBuilder');
const { DocumentNode, ElementNode, TextNode, CommentNode } = require('./TreeNode');

/**
 * Two real, distinct attack surfaces a sanitizer must close, both built
 * directly on machinery this course already has: dangerous ELEMENTS
 * (script -- Modules 6-8's RAWTEXT/script-data family) and dangerous
 * ATTRIBUTES on otherwise-safe elements (event handlers, javascript:
 * URLs -- Module 10's parsed attribute list). Deliberately not a
 * complete real-world sanitizer's rule set (see DECISIONS.md).
 */
const DROPPED_ELEMENTS = new Set(['script']);
const EVENT_HANDLER_ATTR = /^on/i;
const URL_ATTRS = new Set(['href', 'src']);
const DANGEROUS_URL_SCHEME = /^\s*javascript:/i;
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
]);

function escapeText(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function escapeAttrValue(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function sanitizeAttributes(attributes) {
  return attributes.filter((attr) => {
    const name = attr.name.toLowerCase();
    if (EVENT_HANDLER_ATTR.test(name)) return false;
    if (URL_ATTRS.has(name) && DANGEROUS_URL_SCHEME.test(attr.value)) return false;
    return true;
  });
}

/** Returns a sanitized copy of the tree -- never mutates the input tree,
 * so the same parsed document could in principle be sanitized more than
 * once with different rules. */
function sanitizeNode(node) {
  if (node instanceof ElementNode) {
    if (DROPPED_ELEMENTS.has(node.tagName)) {
      return null; // the whole element AND its content is gone -- not just unwrapped
    }
    const clean = new ElementNode(node.tagName, sanitizeAttributes(node.attributes));
    for (const child of node.children) {
      const cleanChild = sanitizeNode(child);
      if (cleanChild !== null) clean.children.push(cleanChild);
    }
    return clean;
  }
  if (node instanceof TextNode) {
    return new TextNode(node.data);
  }
  if (node instanceof CommentNode) {
    return new CommentNode(node.data);
  }
  return node;
}

function serializeNode(node) {
  if (node instanceof TextNode) {
    return escapeText(node.data);
  }
  if (node instanceof CommentNode) {
    return `<!--${node.data}-->`;
  }
  if (node instanceof ElementNode) {
    const attrs = node.attributes
      .map((a) => ` ${a.name}="${escapeAttrValue(a.value)}"`)
      .join('');
    if (VOID_ELEMENTS.has(node.tagName)) {
      return `<${node.tagName}${attrs}>`;
    }
    const inner = node.children.map(serializeNode).join('');
    return `<${node.tagName}${attrs}>${inner}</${node.tagName}>`;
  }
  return '';
}

/** The whole point of this module: parse with the REAL tokenizer (so
 * RCDATA/RAWTEXT/script-data boundaries are respected exactly the way a
 * browser respects them), sanitize the resulting tree structurally, then
 * serialize back to a string. Never touches the raw source text with a
 * pattern match. */
function sanitize(html) {
  const doc = new TreeBuilder(html).run();
  const clean = new DocumentNode();
  clean.doctype = doc.doctype;
  for (const child of doc.children) {
    const cleanChild = sanitizeNode(child);
    if (cleanChild !== null) clean.children.push(cleanChild);
  }
  return clean.children.map(serializeNode).join('');
}

module.exports = { sanitize, sanitizeNode, DROPPED_ELEMENTS, EVENT_HANDLER_ATTR, URL_ATTRS, DANGEROUS_URL_SCHEME };
