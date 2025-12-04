-- ============================================
-- PRACOSFERA - Add Admin User
-- ============================================
-- This script adds an admin user to the database
-- Password: admin123

-- Insert admin user
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  phone,
  role
)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@pracosfera.pl',
  '$2b$10$fTQXvXVNL3JuPLR53ygTXOxB/oJIXdPKbAdtx1Q6dPsQ81PyW5vom', -- admin123
  'Administrator Systemu',
  '+48 500 600 700',
  'admin'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role;

-- Verify the admin was created
SELECT id, email, name, role, created_at 
FROM users 
WHERE email = 'admin@pracosfera.pl';

