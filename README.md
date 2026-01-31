# Teacher Daily Tool UI

UI Components for Teacher Daily Tool.

## Environment & Installation
 
 ### Requirements
 - Node.js: >= 18
 - NPM: >= 9
 
 ### Installation
 ```bash
 # Install dependencies (use legacy-peer-deps if encountering conflicts)
 npm install --legacy-peer-deps
 ```
 
 ### Major Dependencies
 - React: ^18.2.0
 - Vite: ^7.3.0
 - Storybook: ^10.1.11 (Test package pinned to ^8.6.15 for compatibility)
 - Tailwind CSS: ^4.0.0
 - Vitest: ^4.0.16
 
 ### Scripts
 - `npm run dev`: Start development server
 - `npm run build`: Build for production
 - `npm run test`: Run tests
 - `npm run storybook`: Start Storybook server
 
 ## Path Mapping Guide

This project uses Path Mapping to ensure cleaner imports and type safety.

### Configuration
The `@/` alias is configured to point to the `src/` directory.

- **tsconfig.json**:
  ```json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@/*": ["src/*"]
      }
    }
  }
  ```
- **vite.config.ts**:
  ```typescript
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  }
  ```

### Usage
Always use the `@/` alias for imports within the `src` directory instead of relative paths like `../../`.

**Correct:**
```typescript
import { BaseCard } from '@/components/core/BaseCard';
import { geminiService } from '@/services/geminiService';
```

**Incorrect:**
```typescript
import { BaseCard } from '../components/core/BaseCard';
import { geminiService } from '../../services/geminiService';
```

### Verification
Run the type checker to ensure no path issues:
```bash
npm run type-check
```
