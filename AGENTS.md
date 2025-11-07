# Agent Configuration

This file contains instructions for agentic coding assistants working on this repository.

## Technology Stack
- Language: TypeScript
- Frontend Framework: To be determined (React, Vue, Svelte, etc.)
- Build Tool: To be determined (Vite, Webpack, etc.)
- Testing Framework: Vitest

## Code Style Guidelines
- Use descriptive variable and function names
- Follow the existing code formatting in the project
- Use meaningful comments for complex logic
- Maintain consistent indentation (2 or 4 spaces, depending on technology)
- Use camelCase for variables/functions, PascalCase for classes/components
- Use TypeScript types for all function parameters and return values
- Prefer interfaces over types for object definitions
- Use strict null checks and handle undefined/null values properly

## Naming Conventions
- Variables: descriptive and concise (e.g., `timerDuration`, `isPaused`)
- Functions: action-oriented (e.g., `startTimer`, `pauseTimer`)
- Components: PascalCase (e.g., `TimerDisplay`, `ControlButtons`)
- Files: kebab-case with .ts or .tsx extension (e.g., `timer-display.ts`, `control-buttons.tsx`)

## Error Handling
- Handle errors gracefully with try/catch blocks where appropriate
- Provide meaningful error messages to users
- Log errors for debugging purposes

## Testing
- Write unit tests for individual functions
- Test edge cases and error conditions
- Use descriptive test names that explain what is being tested
- Run single test: `npm run test path/to/test-file.ts` (to be configured)
- Run all tests: `npm run test` (to be configured)
- Run tests in watch mode: `npm run test:watch` (to be configured)

## Imports and Dependencies
- Group imports logically (standard library, third-party, local)
- Use absolute imports when possible for better readability
- Keep dependencies minimal and well-justified

## Build/Lint Commands
- Build project: `npm run build` (to be configured)
- Lint code: `npm run lint` (to be configured)
- Format code: `npm run format` (to be configured)
- Run development server: `npm run dev` (to be configured)

## Git Workflow
- Make small, focused commits with clear messages
- Follow conventional commit message format
- Push changes frequently to avoid large divergences