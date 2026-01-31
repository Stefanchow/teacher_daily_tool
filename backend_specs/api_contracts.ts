/**
 * Teacher Daily Tool - Enterprise API Contracts
 * Language: TypeScript
 * Style: RESTful
 */

// ==========================================
// 1. Unified Response Structure
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  code: number; // Custom error code (e.g., 20000, 40001)
  message: string;
  data?: T;
  timestamp: number;
  requestId: string; // Trace ID for debugging
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==========================================
// 2. Data Models (Mirroring DB & Frontend)
// ==========================================

export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  role: 'teacher' | 'admin' | 'premium';
  createdAt: string;
}

// Importing core logic from frontend types (conceptually)
export interface LessonPlanContent {
  teachingPreparation: {
    objectives: string[];
    keyWords: string[];
    duration: number;
    teachingAids?: string;
    studentAnalysis?: string;
    audienceAnalysis?: Array<{
      type?: string;
      description: string;
      [key: string]: any;
    }>;
  };
  procedures: Array<{
    step: string;
    teachersTalk: string;
    studentsOutput: string;
    justification: string;
    duration?: number;
  }>;
}

export interface LessonPlanDTO {
  id: string; // BigInt serialized as string
  title: string;
  grade: string;
  topic: string;
  durationMinutes: number;
  content: LessonPlanContent;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDTO {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  providerTxId: string;
  createdAt: string;
}

// ==========================================
// 3. API Request Payloads
// ==========================================

// POST /api/v1/auth/login
export interface LoginRequest {
  email: string;
  password?: string; // If using password auth
  oauthToken?: string; // If using Google/SSO
  provider?: 'email' | 'google';
}

// POST /api/v1/lesson-plans
export interface CreateLessonPlanRequest {
  title: string;
  grade: string;
  topic: string;
  durationMinutes: number;
  // Content can be partial initially if generated step-by-step, 
  // but usually full for a save operation.
  content: LessonPlanContent;
  status?: 'draft' | 'published';
}

// PATCH /api/v1/lesson-plans/:id
export interface UpdateLessonPlanRequest {
  title?: string;
  content?: Partial<LessonPlanContent>;
  status?: 'draft' | 'published';
}
