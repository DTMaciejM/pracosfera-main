# Migracja do Supabase Auth - Instrukcja

## Przegląd zmian

Aplikacja została zmigrowana z własnej implementacji autentykacji (bcrypt) do Supabase Auth. To rozwiązuje problemy z logowaniem i jest bardziej bezpieczne.

## Krok 1: Włącz Supabase Auth w projekcie

1. Przejdź do panelu Supabase: https://app.supabase.com
2. Wybierz swój projekt
3. Przejdź do **Settings > Authentication**
4. Włącz **Email Auth** (Enable Email provider)
5. Opcjonalnie: Skonfiguruj email templates

## Krok 2: Zaktualizuj schemat bazy danych

Wykonaj następujące zmiany w Supabase SQL Editor (użyj pliku `supabase_migrate_to_auth.sql`):

```sql
-- Dodaj kolumnę auth_user_id do tabeli users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Utwórz indeks
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Zmień password_hash na opcjonalne (dla kompatybilności wstecznej)
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Dodaj constraint (opcjonalnie)
-- UWAGA: Usuń ten constraint jeśli masz już użytkowników bez auth_user_id
-- ALTER TABLE users 
-- ADD CONSTRAINT users_auth_check CHECK (auth_user_id IS NOT NULL OR password_hash IS NOT NULL);
```

**WAŻNE:** Jeśli masz już istniejących użytkowników, najpierw wykonaj migrację użytkowników (Krok 3), a dopiero potem dodaj constraint.

## Krok 3: Migruj istniejących użytkowników

### Opcja A: Automatyczna migracja (Zalecana)

1. Zainstaluj zależności:
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

2. Utwórz plik `.env.migration`:
   ```
   SUPABASE_URL=https://twoj-projekt.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=twoj-service-role-key
   ```

3. Uruchom skrypt migracji:
   ```bash
   node migrate_users_to_auth.js
   ```

   **UWAGA:** Service Role Key znajdziesz w Supabase: Settings > API > service_role key

### Opcja B: Ręczna migracja

Dla każdego użytkownika:

1. Utwórz konto w Supabase Auth (przez panel lub API)
2. Zaktualizuj tabelę `users`, ustawiając `auth_user_id` na ID z `auth.users`

## Krok 4: Utwórz nowego użytkownika admin

Jeśli potrzebujesz nowego użytkownika admin:

1. W Supabase Auth utwórz użytkownika:
   - Email: `admin@pracosfera.pl`
   - Hasło: `admin123` (lub inne bezpieczne hasło)

2. W SQL Editor wykonaj:
   ```sql
   INSERT INTO users (
     id, auth_user_id, email, name, phone, role
   )
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'admin@pracosfera.pl'),
     (SELECT id FROM auth.users WHERE email = 'admin@pracosfera.pl'),
     'admin@pracosfera.pl',
     'Administrator Systemu',
     '+48 500 600 700',
     'admin'
   )
   ON CONFLICT (id) DO UPDATE
   SET
     auth_user_id = EXCLUDED.auth_user_id,
     email = EXCLUDED.email,
     name = EXCLUDED.name,
     phone = EXCLUDED.phone,
     role = EXCLUDED.role;
   ```

## Krok 5: Wdróż zmiany

1. Zatwierdź zmiany:
   ```bash
   git add .
   git commit -m "Migrate to Supabase Auth"
   git push
   ```

2. W Coolify:
   - Zmienne środowiskowe pozostają takie same
   - Zredeployuj aplikację

## Krok 6: Testowanie

1. Przetestuj logowanie z istniejącymi kontami (po migracji)
2. Przetestuj rejestrację nowego użytkownika
3. Przetestuj logout
4. Sprawdź, czy sesja jest zachowywana po odświeżeniu strony

## Rozwiązywanie problemów

### Problem: "User not found" po logowaniu

**Rozwiązanie:** Upewnij się, że:
- Użytkownik został zmigrowany do Supabase Auth
- `auth_user_id` jest poprawnie ustawione w tabeli `users`
- Email w `auth.users` i `users` jest identyczny

### Problem: Nie można się zalogować

**Rozwiązanie:**
- Sprawdź, czy Email Auth jest włączony w Supabase
- Sprawdź logi w konsoli przeglądarki
- Sprawdź logi w Supabase: Authentication > Logs

### Problem: Rejestracja nie działa

**Rozwiązanie:**
- Sprawdź, czy Email Auth jest włączony
- Sprawdź ustawienia email w Supabase (może wymagać konfiguracji SMTP)
- Sprawdź, czy email confirmation jest wymagany (można wyłączyć w Settings > Authentication)

## Korzyści z Supabase Auth

✅ Bezpieczne zarządzanie hasłami (bcrypt automatycznie)
✅ Automatyczne odświeżanie tokenów
✅ Obsługa sesji
✅ Reset hasła przez email
✅ Email verification
✅ Nie ma problemów z nagłówkami HTTP
✅ Gotowe rozwiązanie, sprawdzone i bezpieczne

## Co dalej?

Po migracji możesz:
- Dodać reset hasła przez email
- Dodać email verification
- Dodać OAuth providers (Google, GitHub, etc.)
- Dodać 2FA (dwuetapową weryfikację)

