-- Migration: Create MRR tracking tables
-- Description: Creates tables for tracking MRR snapshots and tenant status history for churn calculation

-- ============================================
-- Table: mrr_snapshots
-- Stores monthly MRR snapshots for historical tracking and charts
-- ============================================
CREATE TABLE IF NOT EXISTS public.mrr_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  total_mrr DECIMAL(12,2) NOT NULL DEFAULT 0,
  active_tenants INTEGER NOT NULL DEFAULT 0,
  new_tenants INTEGER NOT NULL DEFAULT 0,
  churned_tenants INTEGER NOT NULL DEFAULT 0,
  mrr_from_new DECIMAL(12,2) NOT NULL DEFAULT 0,
  mrr_churned DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT mrr_snapshots_snapshot_date_unique UNIQUE (snapshot_date)
);

-- Index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_date ON public.mrr_snapshots(snapshot_date DESC);

-- ============================================
-- Table: tenant_status_history
-- Tracks tenant status changes for churn calculation
-- ============================================
CREATE TABLE IF NOT EXISTS public.tenant_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  old_status public.tenant_status,
  new_status public.tenant_status NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_tenant_status_history_tenant ON public.tenant_status_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_status_history_changed_at ON public.tenant_status_history(changed_at DESC);

-- ============================================
-- Trigger Function: Log tenant status changes
-- ============================================
CREATE OR REPLACE FUNCTION public.log_tenant_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.tenant_status_history (tenant_id, old_status, new_status, changed_by)
    VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tenants table
DROP TRIGGER IF EXISTS on_tenant_status_change ON public.tenants;
CREATE TRIGGER on_tenant_status_change
  AFTER INSERT OR UPDATE OF status ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.log_tenant_status_change();

-- ============================================
-- Database Function: Generate MRR Snapshot
-- Can be called manually or via scheduled job
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_mrr_snapshot(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_mrr DECIMAL(12,2);
  v_active_tenants INTEGER;
  v_new_tenants INTEGER;
  v_churned_tenants INTEGER;
  v_mrr_from_new DECIMAL(12,2);
  v_mrr_churned DECIMAL(12,2);
  v_month_start DATE;
BEGIN
  v_month_start := DATE_TRUNC('month', target_date);

  -- Total MRR from active tenants
  SELECT COALESCE(SUM(monthly_fee), 0), COUNT(*)
  INTO v_total_mrr, v_active_tenants
  FROM public.tenants
  WHERE status = 'active';

  -- New tenants this month (created this month and active)
  SELECT COUNT(*), COALESCE(SUM(monthly_fee), 0)
  INTO v_new_tenants, v_mrr_from_new
  FROM public.tenants
  WHERE status = 'active'
    AND created_at >= v_month_start
    AND created_at < v_month_start + INTERVAL '1 month';

  -- Churned tenants this month (became inactive/suspended this month)
  SELECT COUNT(*), COALESCE(SUM(t.monthly_fee), 0)
  INTO v_churned_tenants, v_mrr_churned
  FROM public.tenant_status_history h
  JOIN public.tenants t ON t.id = h.tenant_id
  WHERE h.old_status = 'active'
    AND h.new_status IN ('inactive', 'suspended')
    AND h.changed_at >= v_month_start
    AND h.changed_at < v_month_start + INTERVAL '1 month';

  -- Insert or update snapshot
  INSERT INTO public.mrr_snapshots (
    snapshot_date, total_mrr, active_tenants, new_tenants,
    churned_tenants, mrr_from_new, mrr_churned
  )
  VALUES (
    v_month_start, v_total_mrr, v_active_tenants, v_new_tenants,
    v_churned_tenants, v_mrr_from_new, v_mrr_churned
  )
  ON CONFLICT (snapshot_date)
  DO UPDATE SET
    total_mrr = EXCLUDED.total_mrr,
    active_tenants = EXCLUDED.active_tenants,
    new_tenants = EXCLUDED.new_tenants,
    churned_tenants = EXCLUDED.churned_tenants,
    mrr_from_new = EXCLUDED.mrr_from_new,
    mrr_churned = EXCLUDED.mrr_churned;
END;
$$;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.mrr_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_status_history ENABLE ROW LEVEL SECURITY;

-- Super admins can manage mrr_snapshots
CREATE POLICY "Super admins can view mrr_snapshots"
  ON public.mrr_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert mrr_snapshots"
  ON public.mrr_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update mrr_snapshots"
  ON public.mrr_snapshots FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can manage tenant_status_history
CREATE POLICY "Super admins can view tenant_status_history"
  ON public.tenant_status_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert tenant_status_history"
  ON public.tenant_status_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================
-- Generate initial snapshot for current month
-- ============================================
SELECT public.generate_mrr_snapshot(CURRENT_DATE);
