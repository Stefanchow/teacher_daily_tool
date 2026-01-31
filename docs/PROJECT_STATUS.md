# Project Status Snapshot

**Date:** 2025-12-31
**Version:** 1.0.0 (Initial Architecture)

## 1. Directory Structure

### `src/` Overview

```
src/
├── components/
│   ├── business/
│   │   └── LessonPlanCard.tsx       # Core business component displaying lesson plans
│   ├── core/
│   │   ├── Badge.tsx                # UI Component: Status badge
│   │   ├── BaseCard.tsx             # UI Component: Generic card container
│   │   ├── BaseCard.module.css      # Styles for BaseCard
│   │   ├── BaseCard.types.ts        # Type definitions for BaseCard
│   │   ├── LessonPhases.tsx         # UI Component: Lesson phase visualization
│   │   └── LessonPhases.module.css  # Styles for LessonPhases
│   └── home/
│       ├── GenerateButton.tsx       # UI Component: Main action button
│       ├── GenerateButton.module.css# Styles for GenerateButton
│       ├── HomeInput.tsx            # UI Component: Input field for lesson topic
│       └── HomeInput.module.css     # Styles for HomeInput
├── services/
│   ├── geminiService.ts             # Service: AI generation logic (Gemini API)
│   └── geminiService.test.ts        # Tests for GeminiService
├── styles/
│   └── AppColors.ts                 # Global color tokens (Morandi palette)
├── templates/
│   └── system_prompt.ejs            # EJS Template for AI system prompt
├── utils/
│   ├── lessonMapper.ts              # Utility: Maps API response to UI models
│   └── lessonMapper.test.ts         # Tests for mapper
├── App.tsx                          # Main Application Entry (State & Layout)
├── App.css                          # Global App Styles
├── App.test.tsx                     # Integration tests for App component
└── global.d.ts                      # Global type declarations
```

## 2. Configuration Analysis

### `tsconfig.json`
*   **Path Mappings (`paths`)**:
    *   `@/*`: Maps to `src/*` (Enables absolute imports like `@/components/...`)
*   **Include/Exclude**:
    *   Include: `src/**/*`, `src/global.d.ts`
    *   Exclude: Default (node_modules, etc.)
*   **Key Compiler Options**:
    *   `strict`: `true` (Full type safety)
    *   `noEmit`: `true` (Vite handles build, TSC only for checking)
    *   `baseUrl`: `.`
    *   `jsx`: `react-jsx`

### `BaseCard.module.css`
*   **Key Style Parameters**:
    *   `border-radius`: **16px** (Unified card radius)
    *   `padding`: **16px** (Standard content padding)
    *   `box-shadow`: `0 2px 8px rgba(0, 0, 0, 0.08)` (Subtle elevation)
    *   `font-family`: `'Noto Sans SC', -apple-system, sans-serif`
*   **Main Classes**:
    *   `.card`: Flex container, white background, hover effects (lift -2px).
    *   `.header`: Grid layout (Badge | Title | Duration).
    *   `.title`: Line clamped to 2 lines (`-webkit-line-clamp: 2`).
    *   `.duration`: Monospace font for time display.
    *   `.body`: Content area with standard line height (1.5).

## 3. Component & Service Status

### Component: `LessonPlanCard` (consuming `BaseCard`)
*   **Role**: Business component that connects data to UI.
*   **Interaction with Service**:
    *   Does **not** call `GeminiService` directly.
    *   Receives `LessonPlan` data via props (passed down from `App.tsx`).
    *   Uses `mapLessonPlanToCardData` utility to transform raw API data into `BaseCard` compatible props (title, grade, duration, activities).
*   **Data Flow**: `App.tsx` (State) -> `LessonPlanCard` (Props) -> `BaseCard` (UI Render).

### Service: `GeminiService`
*   **API Endpoint**: `https://generativelanguage.googleapis.com/v1beta` (Google Gemini API).
*   **Model**: `gemini-1.5-pro` (Configurable via `VITE_GEMINI_MODEL`).
*   **Mock Mode**: Supported via `VITE_USE_MOCK=true` or `mockData` import.
*   **Logic**:
    *   Fetches AI response based on user topic.
    *   Validates response structure against `LessonPlan` interface.
    *   Handles errors and retries (basic fetch implementation).

## 4. Environment Status

*   **Type Check**: ✅ **Passed** (0 Errors via `npm run type-check`)
*   **Unit Tests**:
    *   ✅ `App.test.tsx` (8 tests passed)
    *   ✅ `geminiService.test.ts` (Passed)
    *   ✅ `lessonMapper.test.ts` (Passed)
    *   ⚠️ **Storybook Tests**: Failed due to environment configuration (`expect is not defined` in setup).
*   **Build**: Pending full build verification (Type check confirms code validity).

