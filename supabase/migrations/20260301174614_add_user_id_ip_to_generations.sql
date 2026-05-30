ALTER TABLE pets_generations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE pets_generations ADD COLUMN IF NOT EXISTS ip_address TEXT;
CREATE INDEX IF NOT EXISTS idx_pets_generations_user_id ON pets_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_generations_ip ON pets_generations(ip_address);
