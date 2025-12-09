-- ============================================
-- PRACOSFERA - Aktualizacja schematu bazy danych dla Supabase Auth
-- ============================================
-- Ten skrypt aktualizuje schemat bazy danych, aby wspierał Supabase Auth
-- Wykonaj go PO wyczyszczeniu bazy danych

BEGIN;

-- KROK 1: Dodaj kolumnę auth_user_id do tabeli users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- KROK 2: Utwórz indeks dla auth_user_id
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- KROK 3: Zmień password_hash na opcjonalne (dla kompatybilności wstecznej podczas migracji)
-- Sprawdź, czy kolumna ma constraint NOT NULL przed próbą usunięcia
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'password_hash' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  END IF;
END $$;

-- KROK 4: Usuń constraint users_auth_check jeśli istnieje (może blokować nowych użytkowników)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_check;

-- KROK 5: Sprawdź, czy istnieją użytkownicy bez auth_user_id
-- (Jeśli tak, będą musieli być zmigrowani później)
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN auth_user_id IS NOT NULL THEN 1 END) as users_with_auth,
  COUNT(CASE WHEN auth_user_id IS NULL THEN 1 END) as users_without_auth
FROM users;

COMMIT;

-- ============================================
-- UWAGI:
-- ============================================
-- 1. Po wykonaniu tego skryptu, nowi użytkownicy będą automatycznie tworzeni z auth_user_id
-- 2. Istniejący użytkownik admin (jeśli został zachowany) będzie potrzebował migracji
-- 3. Możesz teraz utworzyć nowego użytkownika admin przez Supabase Auth i powiązać go z tabelą users

