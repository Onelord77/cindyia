-- Migration: Add monthly_fee column to tenants table
-- Description: Adds subscription pricing field for SaaS billing tracking

-- Add monthly_fee column to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2) DEFAULT 0;

-- Add subscription_started_at to track when subscription began
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;

-- Update existing tenants to have subscription_started_at = created_at
UPDATE public.tenants
SET subscription_started_at = created_at
WHERE subscription_started_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.monthly_fee IS 'Monthly subscription fee in BRL charged by the platform';
COMMENT ON COLUMN public.tenants.subscription_started_at IS 'Date when tenant started paying subscription';
