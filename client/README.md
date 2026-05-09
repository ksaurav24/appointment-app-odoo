# Next.js template

This is a Next.js template with shadcn/ui.

## Environment setup

Create `.env.local` from `.env.local.example` and configure:

- `NEXT_PUBLIC_API_URL` — backend base URL
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` — unsigned upload preset used for organizer logo/gallery uploads
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — key for organizer location lookup on Google Maps

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```
