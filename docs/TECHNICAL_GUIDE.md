# Teacher Daily Tool - Technical Guide

## 1. Project Architecture

This project is a React-based web application designed to help teachers generate and manage lesson plans. It leverages modern web technologies to provide a responsive, interactive, and efficient user experience.

### Technology Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **Testing**: Vitest + React Testing Library

### Directory Structure
```
src/
├── components/
│   ├── editor/       # Input and editing components (SyncInput)
│   └── preview/      # Preview and rendering components (TablePreview, DocPreview)
├── store/
│   ├── slices/       # Redux slices (lessonSlice, previewSlice)
│   └── index.ts      # Store configuration
├── services/         # External services (Gemini API)
├── styles/           # Global styles
├── App.tsx           # Main application layout
└── main.tsx          # Entry point
```

## 2. State Management (Redux)

The application uses Redux Toolkit for global state management, divided into two main slices:

### Lesson Slice (`lessonSlice`)
Manages the core content of the lesson plan.
- **State**:
  - `topic`: Current lesson topic.
  - `generatedPlan`: The structured lesson plan data (JSON).
  - `rawContent`: Raw text content for OCR sync.
  - `isLoading`, `error`: UI states.
- **Actions**: `setTopic`, `setGeneratedPlan`, `updateRawContent`.

### Preview Slice (`previewSlice`)
Manages the view state of the preview panel.
- **State**:
  - `mode`: 'table' (Excel-like) or 'flow' (Word-like).
  - `scale`: Zoom level (0.5 - 2.0).
  - `isExporting`: Export status.
- **Actions**: `setPreviewMode`, `setScale`, `setIsExporting`.

## 3. Key Components

### SyncInput (`src/components/editor/SyncInput.tsx`)
Handles the bidirectional synchronization between the raw text input (simulating OCR output) and the structured lesson plan.
- **Features**:
  - **Debounce**: Updates Redux state only after 300ms of inactivity to prevent performance issues.
  - **Bidirectional Binding**: Reflects external changes to `rawContent` and updates local state on user input.

### PreviewContainer (`src/components/preview/PreviewContainer.tsx`)
The main container for the preview panel.
- **Features**:
  - **View Switching**: Toggles between Table and Document views.
  - **Zoom Control**: Adjusts the scale of the rendered content.
  - **Export**: Simulates export functionality with validation (checks if plan exists).

### Renderers
- **TablePreview**: Renders the lesson plan as a structured table, mimicking Excel. Supports cell merging (`colSpan`) for headers and summaries.
- **DocPreview**: Renders the lesson plan as a document, mimicking Word. Supports flow layout, typography, and pagination simulation.

## 4. Data Flow

1.  **Input**: User enters a topic or OCR text is injected into `SyncInput`.
2.  **Generation**: `geminiService` generates a structured JSON lesson plan.
3.  **State Update**: The JSON plan is stored in Redux (`lessonSlice`).
4.  **Rendering**: `PreviewContainer` subscribes to the store and passes data to the active renderer (`TablePreview` or `DocPreview`).
5.  **Sync**: Changes in `SyncInput` update `rawContent` and partially update `generatedPlan` (e.g., title) via Redux actions.

## 5. API Reference

### `LessonPlan` Interface
```typescript
interface LessonPlan {
  title: string;
  duration: number; // minutes
  activities: Array<{
    name: string;
    description: string;
    materials: string;
    duration: number;
  }>;
}
```

### `geminiService`
- `generateLessonPlan(params: GenerationParams): Promise<LessonPlan>`
  - Generates a lesson plan based on topic, level, and other parameters.

## 6. Testing

The project uses **Vitest** for unit and integration testing.

- **Coverage Requirement**: ≥80%
- **Running Tests**: `npm test` or `npx vitest run`
- **Coverage Report**: `npx vitest run --coverage`

### Key Tests
- `App.test.tsx`: Integration tests for the full flow (Render -> Generate -> Preview -> Sync).
- `lessonSlice.test.ts`: Unit tests for Redux reducers and actions.
