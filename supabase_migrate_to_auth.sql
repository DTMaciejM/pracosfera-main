-- ============================================
-- PRACOSFERA - Migracja do Supabase Auth
-- ============================================
-- Ten skrypt migruje istniejących użytkowników do Supabase Auth
-- i aktualizuje schemat bazy danych

-- KROK 1: Włącz Supabase Auth w projekcie (zrób to ręcznie w panelu Supabase)
-- Settings > Authentication > Enable Email Auth

-- KROK 2: Utwórz funkcję pomocniczą do migracji użytkowników
CREATE OR REPLACE FUNCTION migrate_user_to_auth(
  user_email TEXT,
  user_password TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  user_role TEXT
) RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Utwórz użytkownika w auth.users (używając Supabase Admin API)
  -- UWAGA: To wymaga użycia Supabase Admin API, nie można tego zrobić przez SQL
  -- Musisz użyć skryptu Node.js lub Python do migracji
  
  -- Zwróć ID użytkownika
  RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- KROK 3: Aktualizuj schemat tabeli users, aby powiązać z auth.users
-- Dodaj kolumnę auth_user_id, która będzie linkować do auth.users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Utwórz indeks dla auth_user_id
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- KROK 4: Utwórz funkcję trigger, która automatycznie tworzy użytkownika w auth.users
-- przy tworzeniu nowego użytkownika w tabeli users
-- UWAGA: To wymaga użycia Supabase Edge Functions lub Admin API

-- KROK 5: Sprawdź istniejących użytkowników do migracji
SELECT 
  id,
  email,
  name,
  phone,
  role,
  password_hash
FROM users
ORDER BY created_at;

-- UWAGA: Rzeczywista migracja użytkowników wymaga użycia Supabase Admin API
-- Zobacz plik migrate_users_to_auth.js dla skryptu migracji

