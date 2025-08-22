# Overview

This is a temperature management voting application that allows users to vote on whether different zones feel too hot or too cold. The app displays real-time temperature data and voting statistics for various zones (standing area, seating zones, recharge zone), helping facility managers understand comfort preferences across different areas. Users can submit votes for each zone, view current temperature readings, and see aggregated voting data to inform climate control decisions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling and development
- **UI Components**: Comprehensive component library using Radix UI primitives with shadcn/ui styling
- **Styling**: Tailwind CSS with custom CSS variables for theming and design consistency
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod for validation and type safety

## Backend Architecture
- **Server**: Express.js with TypeScript for RESTful API endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Data Storage**: In-memory storage implementation with interface for future database integration
- **API Structure**: RESTful endpoints for zones and voting operations with proper error handling
- **Development**: Hot module replacement and middleware logging for development experience

## Data Models
- **Zones**: Represents different areas with temperature readings, vote counts, and active voter statistics
- **Votes**: Individual vote records linking to zones with vote type (hot/cold) and timestamps
- **Schema Validation**: Zod schemas for runtime type checking and API request validation

## Authentication & Session Management
- **Session Storage**: Connect-pg-simple for PostgreSQL-based session storage
- **Middleware**: Express session handling with credential-based requests from frontend

# External Dependencies

## Core Framework Dependencies
- **Frontend**: React 18 with TypeScript, Vite build system, Wouter routing
- **Backend**: Express.js server with TypeScript compilation via tsx
- **Database**: Drizzle ORM with Neon Database serverless PostgreSQL driver

## UI and Styling
- **Component Library**: Complete Radix UI primitive set for accessible components
- **Styling Framework**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React icon library
- **Fonts**: Inter font family from Google Fonts

## Development and Build Tools
- **Build System**: Vite with React plugin and ESBuild for production builds
- **Database Migrations**: Drizzle Kit for schema management and migrations
- **Development Experience**: Replit-specific plugins for cartographer and runtime error overlays
- **Type Safety**: Comprehensive TypeScript configuration with strict mode enabled

## Data Management
- **State Management**: TanStack React Query for server state synchronization
- **Validation**: Zod for runtime type validation and schema generation
- **Session Management**: Express sessions with PostgreSQL storage backend
- **Date Handling**: date-fns library for date manipulation and formatting