# JUSTIA Website Description and Components

## Site Description

The project is a React + TypeScript single-page application built with Vite for the **JUSTIA LegalTech platform**.
Its goal is to present JUSTIA's legal and LegalTech services through a modern, multilingual, and responsive website.

Core themes of the site:

- Legal advisory and legal operations support
- LegalTech product showcase (JURE, JURIA, LOCARIS, COMPANIA)
- Online consultation workflow with scheduling and document upload
- Compliance focus (GDPR/CNDP, AI governance, cybersecurity)
- Multilingual UX (French, English, Arabic) with dark mode support

---

## Routing and Page Structure

Routes are defined in `src/App.tsx`:

- `/` -> `Home`
- `/services` -> `ServicesPage`
- `/solutions` -> `SolutionsPage`
- `/consultation` -> `ConsultationEnLignePage`

Application bootstrap:

- `src/main.tsx` mounts `<App />` inside `React.StrictMode`.

---

## Global Shared Components

### `src/components/Header.tsx`

Main top navigation component, used across pages.

Responsibilities:

- Displays brand/logo
- Desktop and mobile navigation menus
- Language selector (`FR`, `EN`, `AR`)
- Dark/light theme toggle
- "Client Area" CTA button
- Sets `document.documentElement.lang` and `document.documentElement.dir` based on language

Notable behavior:

- Sticky header
- Mobile drawer with accessible menu controls
- Language-specific navigation labels

### `src/components/Footer.tsx`

Site-wide footer component.

Responsibilities:

- Brand block and platform short description
- Footer navigation links
- Social links (LinkedIn, X, Instagram)
- Newsletter signup UI
- Localized footer labels (via `footerStrings` prop or shared data)

### `src/hooks/useTheme.ts`

Reusable hook for dark mode state management.

Responsibilities:

- Reads saved theme from `localStorage`
- Falls back to OS preference when no saved value exists
- Toggles `dark` class on `<html>`
- Persists current theme in `localStorage`

### `src/data/footerStrings.ts`

Localization data source for footer labels and text in:

- French
- English
- Arabic

---

## Page Components

### `src/pages/Home.tsx` (`Home`)

Landing page that introduces JUSTIA's value proposition.

Main sections rendered on the page:

- `Hero`: headline, subtitle, primary and secondary CTAs
- `Domains`: legal expertise areas grid
- `Solutions`: LegalTech solution cards (mobile carousel behavior)
- `Consultation`: 3-step consultation process
- `Publications`: article-style cards
- `Testimonials`: testimonial carousel

Additional notes:

- Uses in-file i18n strings (`FR/EN/AR`)
- Includes reusable in-file primitives (`Container`, `SectionTitle`, `Button`, `Icon`)
- Integrates global `Header` and `Footer`

### `src/pages/ServicesPage.tsx` (`ServicesPage`)

Dedicated services page describing legal, compliance, and training offerings.

Main blocks:

- Hero section
- Legal advisory block
- LegalTech solutions block
- Publishing and legal watch block
- Training and webinars block
- Strategy and compliance block
- FAQ accordion
- Final CTA banner

Additional notes:

- Uses shared `Header`, `Footer`, and `useTheme`
- Includes in-file UI primitives (`Section`, `Container`, `Card`, `Badge`, buttons, accordion item)
- Language parameter support exists (`fr/en/ar`) with French content fallback for untranslated blocks

### `src/pages/SolutionsPage.tsx` (`SolutionsPage`)

Showcase page for JUSTIA's LegalTech products.

Main content:

- Hero with product positioning
- Product cards generated from `SOLUTIONS_DATA`
- Comparison table
- Demo/screenshot placeholders
- Trust/logos section
- Technical FAQ
- Final CTA section

Key page-level components inside the file:

- `ProductCard`
- `FeatureList`
- `ComparisonTable`
- `DemoMock`
- `Logos`

Additional notes:

- CTA actions are currently mocked (`console.log` + `alert`)
- Structured for future API/analytics integration

### `src/pages/ConsultationEnLignePage.tsx` (`ConsultationEnLignePage`)

Online legal consultation flow page.

Main features:

- Multilingual hero and process explanation
- Consultation request form
- Domain selection chips
- Text description with validation
- Urgency selection
- Drag-and-drop file upload
- Calendar slot selection
- Contact details and consent switch
- Backend-ready `POST /api/consultation` submission
- Pricing, guarantees, testimonials, and final CTA sections

Key page-level components inside the file:

- `SectionTitle`
- `Calendar`
- `DateButton`
- `FileDropzone`

Additional notes:

- Uses shadcn UI primitives from `src/components/ui`
- Uses Framer Motion for animated entrance effects

---

## UI Primitive Components (`src/components/ui`)

These are reusable low-level building blocks (mostly shadcn/Radix style wrappers):

- `button.tsx` -> `Button`, variant system (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) and size variants
- `card.tsx` -> `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `input.tsx` -> styled `Input`
- `textarea.tsx` -> styled `Textarea`
- `label.tsx` -> Radix-based `Label`
- `switch.tsx` -> Radix-based `Switch`
- `badge.tsx` -> `Badge` with variant support
- `separator.tsx` -> Radix-based `Separator`

Supporting utility:

- `src/lib/utils.ts` -> `cn()` helper combining `clsx` + `tailwind-merge`

---

## Design System / Branding

Brand tokens are defined in `src/config/colors.ts`:

- Primary: `#001A33`
- Secondary/Cyan: `#00B2FF`
- Teal accent: `#00D4AA`
- Additional dark/light/text variants and hover colors
- `withOpacity(color, opacity)` helper for RGBA conversion

This color system is used throughout pages and shared components to keep a consistent JUSTIA visual identity.

---

## Component Inventory Summary

Reusable global components:

- `Header`
- `Footer`
- `useTheme` hook
- Footer strings data module

Page components:

- `Home`
- `ServicesPage`
- `SolutionsPage`
- `ConsultationEnLignePage`

Reusable UI primitives:

- `Button`
- `Card` (+ subcomponents)
- `Input`
- `Textarea`
- `Label`
- `Switch`
- `Badge`
- `Separator`

