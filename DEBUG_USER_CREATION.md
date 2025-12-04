# Debugowanie problemu z dodawaniem użytkowników

## Problem
Użytkownik jest widoczny w aplikacji, ale nie został dodany do tabeli `users` w Supabase.

## Kroki debugowania

### 1. Sprawdź konsolę przeglądarki

Otwórz Developer Tools (F12) i przejdź do zakładki **Console**. Spróbuj dodać użytkownika ponownie i sprawdź czy są jakieś błędy.

Szukaj komunikatów:
- `Creating worker with data:` lub `Creating franchisee with data:`
- `Supabase error creating...`
- `Worker created successfully:` lub `Franchisee user created successfully:`

### 2. Sprawdź czy RLS jest wyłączony

Uruchom w Supabase SQL Editor:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';
```

Jeśli `rowsecurity = true`, RLS jest włączony i trzeba go wyłączyć:

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

### 3. Sprawdź czy są jakieś ograniczenia w bazie

Uruchom w Supabase SQL Editor:

```sql
-- Sprawdź czy email już istnieje
SELECT * FROM users WHERE email = 'test@example.com';

-- Sprawdź ostatnio dodanych użytkowników
SELECT id, email, name, role, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;
```

### 4. Sprawdź Network tab w Developer Tools

1. Otwórz Developer Tools (F12)
2. Przejdź do zakładki **Network**
3. Spróbuj dodać użytkownika
4. Znajdź zapytanie POST do `/rest/v1/users`
5. Sprawdź:
   - **Status Code** - powinien być 201 (Created) lub 200 (OK)
   - **Response** - sprawdź czy zawiera dane użytkownika
   - **Request Payload** - sprawdź czy dane są poprawnie wysyłane

### 5. Sprawdź zmienne środowiskowe

W konsoli przeglądarki uruchom:

```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
```

### 6. Test bezpośredniego zapisu do Supabase

W konsoli przeglądarki uruchom:

```javascript
import { supabase } from './src/lib/supabase';

// Test zapisu
const { data, error } = await supabase
  .from('users')
  .insert({
    email: 'test@example.com',
    password_hash: '$2b$10$test',
    name: 'Test User',
    phone: '+48 123 456 789',
    role: 'worker',
    status: 'aktywny'
  })
  .select()
  .single();

console.log('Data:', data);
console.log('Error:', error);
```

## Najczęstsze przyczyny

1. **RLS jest włączony** - najczęstsza przyczyna
2. **Błąd walidacji** - email już istnieje, brakujące wymagane pola
3. **Błąd połączenia** - nieprawidłowy URL lub klucz API
4. **Błąd w kodzie** - wyjątek jest przechwytywany ale nie wyświetlany

## Rozwiązanie

Po znalezieniu przyczyny w logach, zaktualizuj odpowiednią część kodu lub konfigurację.

