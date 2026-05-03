-- Add ai_paused flag to clients
-- When true, the n8n AI workflow skips responding to this client's messages
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS ai_paused boolean DEFAULT false;
