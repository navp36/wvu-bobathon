# WVU Bobathon house rules

Apply to every page or app you build in this workspace.

## Look and feel
- Use WVU Blue #002855 as the primary color and Old Gold #EAAA00 as the accent.
- Single self-contained HTML file: inline CSS and JS, no CDN links, no external fonts, no network requests.
- Use a system font stack. Keep layout simple and responsive.

## Honesty about data
- Every piece of data must be labeled either LIVE or SIMULATED in the UI.
- Show a visible "Simulated data" badge in the header whenever any data is simulated.
- Add a short "Where this data comes from" table: source, status, and what it would take to make it live.

## Student privacy
- Never collect, store, or transmit student information. No cookies, localStorage, analytics, or forms that post data.
- Add a short "How this protects student information" section in plain language.
- Use only fictional names and IDs. Emails, if any, use @example.com.

## Quality
- Meet WCAG 2.1 AA basics: labels on every input, visible keyboard focus, sufficient contrast, no color-only meaning.
- Include a loading, empty, and error state wherever data is shown.
- Never use eval() or innerHTML with user-provided text.
