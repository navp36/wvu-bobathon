# Client HTML Pages

When creating any HTML page for a client, start from `templates/client_page_template.html`.

- Keep the layout, typography, spacing, components, animations, header/footer, and script behavior identical to the template.
- Only change the colour theme, by editing the CSS variables in the `:root` block (`--accent`, `--accent-rgb`, `--accent-secondary`, `--accent-tint`, `--accent-border`, `--accent-border-hover`, `--accent-border-frame`). Derive the tint/border shades from the client's primary colour.
- Neutral colours (text, greys, borders, backgrounds) stay unchanged.
- Replace the `{{PLACEHOLDERS}}`, swap `client_logo.png` for the client's logo, and remove sections that are not needed.
- Keep the "Made with IBM Bob" footer.
