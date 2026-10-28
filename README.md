# zhaoren

A standalone frontend starter extracted from the current SOKE interface. React, TypeScript, Vite and Less. No backend is required. Use Node.js 22.6 or later.

## Run

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## Included

- Responsive navigation and SOKE visual assets.
- Conversation empty state, starter prompts, message bubbles and composer.
- New conversations, history, archive / restore, local browser persistence.
- Simulated replies, cancel generation, character limit, keyboard send and browser-native voice input.
- Presentation-only secondary pages and feedback interactions.

## Integration boundary

All replies are deterministic local demo text in `src/demo.ts`. Conversation state is stored only in this browser's localStorage under `zhaoren.frontend.demo.v1`. There are no API clients, authentication services, model SDKs, real customer records, payment integration, scraping, outreach, or server source files.

Voice input uses the browser's native speech recognition API when available and requires microphone permission. Depending on the browser, speech recognition may use the browser vendor's speech service. It can be removed from `src/App.tsx` if not needed.

Replace demo state and replies with your own product capabilities. The secondary pages are deliberately presentation-only, not copies of the previous product's business implementation.

The layout, colors, navigation labels, empty-state copy and safe brand assets are derived from the existing SOKE frontend. The application shell and local demonstration state are isolated from the original business repository. No original Git history is included.

## Checks

```sh
npm test
npm run build
```

GitHub Actions runs the same tests and production build on pushes and pull requests.
