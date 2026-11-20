# World Quiz

A challenging and customizable geography quiz, fully open, non-commercial and offline.

It covers every country in the world (UN members, observers, partially recognized states and dependent territories) and, over time, regions, cities, mountains, rivers, lakes, seas and historic sites. You choose how many questions to play, which kinds of questions, and how hard each kind should be.

The app is in Italian. It is a Progressive Web App: install it from the browser on Android, iOS or desktop, and it keeps working without a connection.

Live version: <https://sognamgnam.github.io/geography-quiz/>

> Status: early development. See [`BACKLOG.md`](BACKLOG.md) for progress and [`CONTEXT.md`](CONTEXT.md) for the design.

## Privacy

World Quiz collects no personal data: there are no accounts, no analytics and no tracking. The app makes no network requests at runtime. All data, fonts and libraries ship inside the app. The only thing it stores is your quiz settings, in your browser's `localStorage`.

The static hosting provider may keep standard technical logs (such as visitor IP addresses) that are outside this project's control.

## Data

Country and geography data comes from [Wikidata](https://www.wikidata.org/) (CC0). A build-time script regenerates it from Wikidata, and a scheduled job runs that script regularly. Questions about data that changes over time, such as leaders and capitals, show the date of the data snapshot. Full attributions are in [`THIRD_PARTY.md`](THIRD_PARTY.md).

## Development

Requires Node.js 22 or newer (npm comes with it).

```sh
npm install        # install dependencies
npm run dev        # start the dev server
npm run build      # production build into dist/
npm run preview    # serve the production build (test the offline/PWA behaviour here)
npm run check      # typecheck
npm run lint       # ESLint + Prettier check (npm run format to fix)
npm test           # unit tests (Vitest)
```

Stack: TypeScript, Svelte, Vite and `vite-plugin-pwa`.

## License

- Code: [GPL-3.0](LICENSE)
- Generated data under `data/`: [CC0-1.0](data/LICENSE)
- Third-party assets keep their own licenses, listed in [`THIRD_PARTY.md`](THIRD_PARTY.md)
