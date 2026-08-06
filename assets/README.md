# Branding assets

Place final brand files in this folder (or `public/assets/`). The renderer checks both locations.

```text
assets/
  frame.png
  card-template.svg
  card-overlay.svg
  logo.png
  background.png
  fonts/
    YourFont.ttf
```

`frame.png` is composited last, so transparent areas reveal the user photo. `card-template.svg` and `background.png` are rendered beneath the photo; `card-overlay.svg` is drawn above it for details such as name strips. Set native canvas dimensions and all photo/text positions in `config/template.ts`; no renderer changes are needed.

If using a custom font, add its font filename to each applicable `fontFile` property in `config/template.ts`.
