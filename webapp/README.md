# tagsmith webapp — HTML Tokenizer Playground

An interactive, in-browser demo of tagsmith's real HTML5 tokenizer. It is
not a mockup: `src/Tokenizer.ts` (plus `State.ts`, `Token.ts`,
`Preprocess.ts`, `CharacterReference.ts`) is a direct TypeScript port of
the course's own final, fully-implemented JavaScript tokenizer
(`modules/16-integration/js/*.js`) — every one of its 68 WHATWG-spec
states is transliterated method-for-method: same branches, same parse-error
names, same reconsume-via-`pos -= 1` trick, same character-reference and
attribute handling.

Type raw HTML in the textarea and the app runs the real state machine
client-side, showing:

- **Token Stream** — every start-tag, end-tag, character, comment, and
  DOCTYPE token the tokenizer actually emitted (character tokens are
  visually coalesced into runs for readability; the underlying token list
  still holds the spec's real one-token-per-character granularity)
- **State Trace** — the exact sequence of named states the machine visited
  while producing that stream (e.g. "Tag name state", "Before attribute
  name state"), with consecutive repeats collapsed and counted

Three example snippets are included via the chip buttons: a basic page,
an "unquoted attribute gotcha" (unquoted attribute values plus an
ambiguous ampersand that must NOT be decoded per spec), and a bogus
comment / script-data-escape example.

## Local development

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
```

Output is written to `webapp/dist/`.

## Deploying

Deploy `webapp/` as a static site (Vercel/Netlify/Cloudflare Pages): set the
project root directory to `webapp`, build command to `npm run build`, and
output directory to `dist`.
