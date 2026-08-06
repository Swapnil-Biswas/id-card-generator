# HH Goa 2026 Frame / ID Card Generator

A deployment-ready Next.js application that produces branded social images in one browser flow. It includes profile-frame and builder-ID-card modes, smart Sharp cropping, optional manual positioning, text fitting, PNG/JPG export, and sharing to X.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Builder ID Card cutouts use MediaPipe's free, on-device portrait segmentation model. The small model and its runtime are preloaded in the background and then run locally in the visitor's browser. No API key is required.

For a production check:

```bash
npm run typecheck
npm run build
```

## Replace branding

Add provided files to `assets/` or `public/assets/`:

```text
frame.png          # transparent profile overlay, drawn last
card-template.svg  # ID-card background template
card-overlay.svg   # optional ID-card layer above the photo
background.png     # optional profile-frame background
logo.png            # optional card logo
fonts/*.ttf         # optional custom font files
```

Then edit only `config/template.ts`:

- Set the `canvas` dimensions to the native template size.
- Set the `photo`, `name`, `role`, `title`, and `logo` boxes in that coordinate system.
- Set `fontFile` where a custom typeface is required.
- Update `ShareConfig` for the prefilled X caption or hosted URL.

The rendering pipeline remains unchanged. Card templates are composited behind the user photo, the optional card overlay is added above it, then text/logo are placed. On profile-frame mode the optional background sits behind the photo and the frame is added last.

## Image processing

`renderer/image-renderer.ts` uses Sharp with EXIF rotation, attention-based cover cropping, Lanczos resampling, circular/rounded masks, and 94-quality 4:4:4 JPEG export. The manual controls switch to a deterministic crop to honor zoom and positioning. Sharp supports HEIF/HEIC when the deployment binary includes libheif; the standard Vercel Sharp runtime does.

## Deploy to Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Import the repository into Vercel.
3. Keep the default build command (`npm run build`) and Node.js runtime.
4. Deploy. No environment variables or database are required.

The generator uses a Server Action. The action body limit is configured as 15 MB in `next.config.ts`; change it only if your desired maximum upload size changes as well.

## Project layout

```text
app/          pages and Server Action
components/   UI and client-side generator flow
config/       replaceable layout and share configuration
renderer/     Sharp-based image composition engine
lib/          assets and shared browser/server utilities
assets/       replaceable brand assets
```
