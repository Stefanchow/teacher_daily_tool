-- ==============================================================================
-- Teacher Daily Tool - Enterprise SaaS Database Schema
-- Database: PostgreSQL 15+
-- Design Principles: 3NF, High Concurrency, JSONB for Semi-structured Data
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search

-- 2. Users Table (Core Identity)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Bcrypt/Argon2 hash
    full_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'teacher', -- 'teacher', 'admin', 'premium'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- 3. Lesson Plans Table (Core Business Data)
-- Using JSONB for 'content' to store the flexible AI-generated structure (TeachingPreparation, Procedures)
-- Promoting key search fields (grade, duration, topic) to columns for performance.
CREATE TABLE lesson_plans (
    id BIGSERIAL PRIMARY KEY, -- BigSerial for high volume
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    
    -- Stores the full 'TeachingPreparation' and 'Procedures' structure
    -- Schema validation should be enforced at the Application Layer (API)
    content JSONB NOT NULL, 
    
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'public', 'shared'
    
    version INTEGER DEFAULT 1, -- Optimistic Locking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Lesson Plans
CREATE INDEX idx_lesson_plans_user_id ON lesson_plans(user_id);
CREATE INDEX idx_lesson_plans_grade ON lesson_plans(grade);
CREATE INDEX idx_lesson_plans_created_at ON lesson_plans(created_at);
-- GIN Index for high-performance JSON searching (e.g., finding plans with specific keywords)
CREATE INDEX idx_lesson_plans_content_gin ON lesson_plans USING gin (content);

-- 4. Audit Logs (Security & Compliance)
-- Immutable log of critical actions
-- Partitioned by Range (created_at) for high throughput and easy archiving
CREATE TABLE audit_logs (
    id BIGSERIAL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'LOGIN', 'CREATE_PLAN', 'PAYMENT'
    resource_id VARCHAR(50), -- ID of the affected resource
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB, -- Extra context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at) -- Required for partitioning
) PARTITION BY RANGE (created_at);

-- Create partitions for the next 12 months (Example)
CREATE TABLE audit_logs_y2025m01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE audit_logs_y2025m02 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);

-- 5. Subscriptions (SaaS Monetization)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    plan_id VARCHAR(50) NOT NULL, -- 'free', 'pro_monthly', 'pro_annual'
    status VARCHAR(20) NOT NULL, -- 'active', 'canceled', 'past_due'
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_provider_id VARCHAR(100), -- Stripe/PayPal Subscription ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);

-- 6. Payments (Financial Transactions)
-- Strict consistency required
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    subscription_id UUID REFERENCES subscriptions(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'
    provider VARCHAR(20) NOT NULL, -- 'stripe', 'paypal'
    provider_tx_id VARCHAR(100) UNIQUE, -- Idempotency key
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_provider_tx_id ON payments(provider_tx_id);

-- ==============================================================================
-- Functions & Triggers
-- ==============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_plans_modtime
    BEFORE UPDATE ON lesson_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_plans_modtime
    BEFORE UPDATE ON lesson_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
