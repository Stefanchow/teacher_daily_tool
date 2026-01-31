/**
 * Teacher Daily Tool - Backend Logic Simulation
 * Implements: Validation, Transaction Management, Security, and Business Logic
 */

import * as yup from 'yup';
import { LessonPlanDTO, LoginRequest } from './api_contracts';

// ==========================================
// 1. Validation Schemas (Security Layer)
// ==========================================

export const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).when('provider', {
    is: 'email',
    then: (schema) => schema.required(),
    otherwise: (schema) => schema.optional(),
  }),
  provider: yup.string().oneOf(['email', 'google']).default('email'),
});

export const lessonPlanInputSchema = yup.object({
  title: yup.string().max(255).required(),
  grade: yup.string().required(),
  topic: yup.string().required(),
  durationMinutes: yup.number().positive().integer().required(),
  content: yup.object({
    teachingPreparation: yup.object({
      objectives: yup.array().of(yup.string()).min(1).required(),
      keyWords: yup.array().of(yup.string()).required(),
      audienceAnalysis: yup.array().of(yup.object({
        description: yup.string().required(),
        type: yup.string().optional(),
      })).optional(),
    }).required(),
    procedures: yup.array().of(
      yup.object({
        step: yup.string().required(),
        teachersTalk: yup.string().required(),
        studentsOutput: yup.string().required(),
      })
    ).required(),
  }).required(),
});

// ==========================================
// 2. Transaction Management (Infrastructure)
// ==========================================

// Mock Database Client Interface
interface DBClient {
  query: (sql: string, params?: any[]) => Promise<any>;
  release: () => void;
}

// Transaction Wrapper - Ensures ACID properties
async function withTransaction<T>(
  operation: (client: DBClient) => Promise<T>
): Promise<T> {
  const client = await getDbConnection(); // Mock connection pool
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Mock DB Connection Provider
async function getDbConnection(): Promise<DBClient> {
  return {
    query: async (sql, params) => { console.log('SQL:', sql, params); return []; },
    release: () => {},
  };
}

// ==========================================
// 3. Business Services (Domain Logic)
// ==========================================

export class LessonPlanService {
  
  /**
   * Creates a lesson plan with transaction safety.
   * Ensures that the plan is saved and audit log is created atomically.
   */
  static async create(userId: string, data: any) {
    // 1. Validate Input
    const validatedData = await lessonPlanInputSchema.validate(data);

    return withTransaction(async (tx) => {
      // 2. Insert Lesson Plan
      const insertSql = `
        INSERT INTO lesson_plans (user_id, title, grade, topic, duration_minutes, content, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'draft')
        RETURNING id;
      `;
      const planResult = await tx.query(insertSql, [
        userId,
        validatedData.title,
        validatedData.grade,
        validatedData.topic,
        validatedData.durationMinutes,
        JSON.stringify(validatedData.content),
      ]);
      const planId = planResult[0]?.id;

      // 3. Create Audit Log (Atomic with Lesson Plan creation)
      const auditSql = `
        INSERT INTO audit_logs (user_id, action, resource_id, details)
        VALUES ($1, 'CREATE_PLAN', $2, $3);
      `;
      await tx.query(auditSql, [userId, planId, JSON.stringify({ title: validatedData.title })]);

      return { id: planId, ...validatedData };
    });
  }
}

export class PaymentService {
  /**
   * Processes a payment with idempotency and strict transaction logic.
   */
  static async processPayment(userId: string, amount: number, providerTxId: string) {
    return withTransaction(async (tx) => {
      // 1. Idempotency Check
      const existing = await tx.query(
        'SELECT id FROM payments WHERE provider_tx_id = $1', 
        [providerTxId]
      );
      if (existing.length > 0) {
        return { status: 'already_processed', paymentId: existing[0].id };
      }

      // 2. Create Payment Record
      const paymentResult = await tx.query(`
        INSERT INTO payments (user_id, amount, status, provider_tx_id, provider)
        VALUES ($1, $2, 'succeeded', $3, 'stripe')
        RETURNING id;
      `, [userId, amount, providerTxId]);

      // 3. Update Subscription (Atomic)
      await tx.query(`
        UPDATE subscriptions 
        SET status = 'active', current_period_end = NOW() + INTERVAL '1 month'
        WHERE user_id = $1
      `, [userId]);

      return { status: 'success', paymentId: paymentResult[0].id };
    });
  }
}

// ==========================================
// 4. Auth Middleware (Security)
// ==========================================

export async function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify JWT (Mock)
    // const user = jwt.verify(token, process.env.JWT_SECRET);
    const user = { id: 'uuid-123', role: 'teacher' }; // Mock user
    
    // Role-based Access Control (RBAC) check can be added here
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid Token' });
  }
}
