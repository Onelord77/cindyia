-- Add error_examples column to tenant_ai_context
-- Stores examples of past AI mistakes for the AI to avoid repeating
ALTER TABLE tenant_ai_context
  ADD COLUMN IF NOT EXISTS error_examples text DEFAULT '';
