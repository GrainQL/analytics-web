# Grain Analytics SDK - Mini App

This is a development mini-app for testing and previewing Grain Analytics SDK components and features. It's excluded from the published package and is intended for development and testing purposes only.

## Features

- **Analytics Testing**: Test event tracking, heartbeat monitoring, and page view detection
- **React Components**: Preview React hooks, providers, and privacy components
- **Privacy Components**: Test consent banners, preference centers, and privacy management
- **Event Inspector**: Monitor and inspect all analytics events in real-time
- **Configuration Testing**: Test remote configuration, caching, and real-time updates (coming soon)
- **Performance Testing**: Test bundle size, loading performance, and memory usage (coming soon)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

## Usage

1. Start the development server: `npm run dev`
2. Open [http://localhost:3000](http://localhost:3000) in your browser
3. Navigate through the different testing sections:
   - **Analytics Testing**: Test event tracking and heartbeat functionality
   - **React Components**: Preview React hooks and components
   - **Privacy Components**: Test consent management and privacy features
   - **Event Inspector**: Monitor events in real-time

## Integration with SDK

To test with the actual SDK:

1. Build the SDK first: `npm run build` (from the root directory)
2. Import the built SDK in the mini-app components
3. Test real functionality instead of mock implementations

## Development Notes

- This app uses Next.js 15 with App Router
- Styled with Tailwind CSS
- TypeScript enabled
- ESLint configured
- Excluded from package publishing via `.npmignore`

## File Structure

```
mini-app/
├── src/
│   └── app/
│       ├── page.tsx                 # Home page
│       ├── analytics-testing/       # Event tracking tests
│       ├── react-components/        # React components showcase
│       ├── privacy-components/      # Privacy components tests
│       ├── event-inspector/         # Event monitoring
│       ├── config-testing/          # Configuration tests (coming soon)
│       └── performance/             # Performance tests (coming soon)
├── public/                          # Static assets
├── package.json                     # Dependencies and scripts
├── tailwind.config.js              # Tailwind configuration
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This file
```

## Contributing

When adding new features to the SDK:

1. Add corresponding test pages to the mini-app
2. Update the home page with new navigation links
3. Test functionality thoroughly before publishing
4. Update this README with new features

## License

Same as the main SDK - MIT License