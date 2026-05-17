# JUSTIA LegalTech Platform

A comprehensive LegalTech platform built with React, TypeScript, and Tailwind CSS for legal consultation, compliance, and LegalTech solutions.

## Features

- 🏛️ **Legal Consultation Platform** - Online consultation booking and management
- 🤖 **AI-Powered Solutions** - JURIA AI assistant for legal research and analysis
- 📋 **Compliance Management** - RGPD, AI Act, and regulatory compliance tools
- 🏢 **Corporate Solutions** - JURE for law firms, COMPANIA for corporate governance
- 🏠 **Real Estate Legal** - LOCARIS for property and real estate legal matters
- 🌐 **Multilingual Support** - French, English, and Arabic (RTL support)
- 🎨 **Modern UI/UX** - Responsive design with dark/light mode
- ♿ **Accessibility First** - WCAG compliant with keyboard navigation

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/
│   └── ui/           # shadcn/ui components
├── pages/            # Page components
│   ├── Home.tsx
│   ├── ServicesPage.tsx
│   ├── SolutionsPage.tsx
│   └── ConsultationEnLignePage.tsx
├── lib/
│   └── utils.ts      # Utility functions
├── App.tsx           # Main app component
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## Pages

- **Home** (`/`) - Landing page with hero, services overview, and testimonials
- **Services** (`/services`) - Detailed services and expertise areas
- **Solutions** (`/solutions`) - LegalTech solutions (JURE, JURIA, COMPANIA, LOCARIS)
- **Consultation** (`/consultation`) - Online consultation booking form

## Brand Colors

- **Primary**: #64499D (Purple)
- **Secondary**: #8B6FD1 (Light Purple)
- **Muted**: #f5f5f5 (Light Gray)
- **Text**: #1e1e1e (Dark) / #ffffff (Light)

## Features in Detail

### LegalTech Solutions

1. **JURE** - Law firm management system
   - Case management
   - Client relationship management
   - Document automation
   - Time tracking and billing

2. **JURIA** - AI Legal Assistant
   - Natural language legal queries
   - Document analysis and summarization
   - Legal research with RAG (Retrieval Augmented Generation)
   - Compliance checking

3. **COMPANIA** - Corporate Governance
   - Board meeting management
   - Compliance tracking
   - Subsidiary management
   - Audit trails

4. **LOCARIS** - Real Estate Legal
   - Property management
   - Lease agreements
   - Condominium management
   - Legal documentation

### Consultation Platform

- Multi-step consultation booking
- File upload with drag & drop
- Calendar integration
- Multi-language support
- Secure video conferencing
- Payment processing

## Development

### Adding New Components

Use the shadcn/ui CLI to add new components:

```bash
npx shadcn-ui@latest add [component-name]
```

### Styling

The project uses Tailwind CSS with custom brand colors. Key classes:

- `bg-brand-primary` - Primary purple
- `bg-brand-secondary` - Secondary purple
- `text-brand-primary` - Primary text color
- `dark:` - Dark mode variants

### Internationalization

The platform supports French (default), English, and Arabic with RTL support. Language switching is handled in each page component.

## Deployment

The project is configured for Vite and can be deployed to any static hosting service:

1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting service

## License

MIT License - see LICENSE file for details.

## Support

For technical support or questions about the platform, please contact the development team.

CHAIMAE Support:
git checkout main
git pull
git checkout -b chaimae
git push -u origin chaimae
