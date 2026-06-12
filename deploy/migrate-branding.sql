-- Branding columns on business_settings (idempotent).
ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS app_name varchar(100),
  ADD COLUMN IF NOT EXISTS brand_color varchar(7),
  ADD COLUMN IF NOT EXISTS login_welcome_text varchar(255),
  ADD COLUMN IF NOT EXISTS login_bg_url text;
