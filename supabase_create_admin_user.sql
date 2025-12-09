-- ============================================
-- PRACOSFERA - Utworzenie użytkownika admin przez Supabase Auth
-- ============================================
-- Ten skrypt tworzy użytkownika admin w Supabase Auth i powiązuje go z tabelą users
-- 
-- UWAGA: Najpierw musisz utworzyć użytkownika w Supabase Auth przez panel:
-- 1. Przejdź do Authentication > Users
-- 2. Kliknij "Add user" > "Create new user"
-- 3. Wprowadź:
--    - Email: admin@pracosfera.pl
--    - Password: admin123 (lub inne bezpieczne hasło)
--    - Auto Confirm User: ✅ (zaznacz, aby nie wymagać potwierdzenia email)
-- 4. Kliknij "Create user"
--
-- Następnie wykonaj ten skrypt SQL, aby powiązać użytkownika z tabelą users

-- KROK 1: Pobierz ID użytkownika z auth.users i zaktualizuj/utwórz rekord w users
DO $$
DECLARE
  admin_auth_id UUID;
  existing_user_id UUID;
BEGIN
  -- Pobierz ID użytkownika admin z auth.users
  SELECT id INTO admin_auth_id
  FROM auth.users
  WHERE email = 'admin@pracosfera.pl'
  LIMIT 1;

  IF admin_auth_id IS NULL THEN
    RAISE EXCEPTION 'Użytkownik admin@pracosfera.pl nie został znaleziony w auth.users. Utwórz go najpierw przez panel Supabase.';
  END IF;

  -- Usuń istniejący rekord z tym emailem (jeśli istnieje)
  -- To jest bezpieczne, ponieważ baza została wyczyszczona przez supabase_cleanup.sql
  DELETE FROM users WHERE email = 'admin@pracosfera.pl';

  -- Utwórz nowy rekord z ID z auth.users
  INSERT INTO users (
    id,
    auth_user_id,
    email,
    name,
    phone,
    role
  )
  VALUES (
    admin_auth_id, -- Użyj tego samego ID co w auth.users
    admin_auth_id,
    'admin@pracosfera.pl',
    'Administrator Systemu',
    '+48 500 600 700',
    'admin'
  );
  
  RAISE NOTICE 'Użytkownik admin został utworzony. Auth User ID: %', admin_auth_id;
END $$;

-- KROK 2: Sprawdź wynik
SELECT 
  id,
  auth_user_id,
  email,
  name,
  role,
  created_at
FROM users 
WHERE email = 'admin@pracosfera.pl';

