-- Add requires_quote column to services table
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS requires_quote BOOLEAN NOT NULL DEFAULT false;

-- Mark services that require evaluation/quote (price varies by hair length, area, etc.)
UPDATE public.services SET requires_quote = true
WHERE name ILIKE ANY (ARRAY['%coloraç%', '%colorac%', '%progressiva%', '%mechas%', '%luzes%', '%ombr%']);

-- Fix category name inconsistencies (normalize accents and casing)
UPDATE public.services SET category = 'Estética'   WHERE category IN ('Estetica', 'Estetica');
UPDATE public.services SET category = 'Depilação'  WHERE category IN ('Depilacao', 'Depilação');

-- Move waxing services out of Estética into Depilação
UPDATE public.services SET category = 'Depilação'
WHERE name ILIKE ANY (ARRAY['%depila%']) AND category = 'Estética';

-- Deactivate obvious duplicate services (same name + price + duration, keep originals)
UPDATE public.services SET is_active = false WHERE id IN (
  'bbbbbbbb-0001-0001-0001-000000000001', -- Corte Feminino dup (keep 6fe9bbe5)
  'bbbbbbbb-0004-0004-0004-000000000004', -- Hidratacao Capilar dup (keep 99547e59)
  'bbbbbbbb-0005-0005-0005-000000000005', -- Manicure Simples dup (keep e421400c)
  'bbbbbbbb-0007-0007-0007-000000000007'  -- Design de Sobrancelha R$45 dup (keep 6d25d0da R$35)
);
