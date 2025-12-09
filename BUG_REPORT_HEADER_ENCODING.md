# BUG REPORT: ISO-8859-1 Header Encoding Error w Supabase Auth

## Podsumowanie
Aplikacja React + Vite + Supabase działa poprawnie lokalnie, ale po wdrożeniu na Coolify występuje błąd związany z kodowaniem nagłówków HTTP podczas próby logowania przez Supabase Auth.

## Środowisko

### Lokalne (działa poprawnie)
- **OS**: macOS (darwin 24.6.0)
- **URL**: `http://localhost:8080`
- **Build**: `npm run dev` (Vite dev server)
- **Status**: ✅ Logowanie działa poprawnie

### Produkcyjne (błąd występuje)
- **Platforma**: Coolify
- **URL**: `https://pracosfera.dogtronic.biz`
- **Build**: Docker container z Vite production build
- **Status**: ❌ Błąd podczas logowania

## Błąd

### Komunikat błędu z konsoli przeglądarki:
```
TypeError: Failed to execute 'fetch' on 'Window': Failed to read the 'headers' property from 'RequestInit': String contains non ISO-8859-1 code point.

    at index-vHo15jL0.js:279:2954
    at Z$ (index-vHo15jL0.js:279:9330)
    at we (index-vHo15jL0.js:279:9079)
    at S4.signInWithPassword (index-vHo15jL0.js:294:19690)
    at a (index-vHo15jL0.js:295:40751)
    at c (index-vHo15jL0.js:346:68538)
```

### Pełny stack trace:
```
Login error: AuthRetryableFetchError: Failed to execute 'fetch' on 'Window': Failed to read the 'headers' property from 'RequestInit': String contains non ISO-8859-1 code point.

    at Z$ (index-vHo15jL0.js:279:9387)
    at async we (index-vHo15jL0.js:279:9073)
    at async S4.signInWithPassword (index-vHo15jL0.js:294:19684)
    at async a (index-vHo15jL0.js:295:40737)
    at async c (index-vHo15jL0.js:346:68532)
```

## Kontekst techniczny

### Stack technologiczny:
- **Frontend**: React 18 + TypeScript
- **Build tool**: Vite
- **Authentication**: Supabase Auth (`@supabase/supabase-js`)
- **Deployment**: Coolify (Docker + Nginx)
- **Database**: Supabase PostgreSQL

### Konfiguracja Supabase:
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: safeFetch, // Custom fetch z sanitizacją nagłówków
  }
});
```

### Funkcja logowania:
```typescript
// src/contexts/AuthContext.tsx
const login = async (email: string, password: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // ...
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
};
```

## Próby rozwiązania

### 1. Custom fetch z sanitizacją nagłówków
**Status**: ❌ Nie rozwiązuje problemu

Dodano custom `fetch` wrapper, który:
- Czyści wszystkie nagłówki z nie-ASCII znaków
- Konwertuje nagłówki na zwykły obiekt
- Sanityzuje body JSON

```typescript
function sanitizeToASCII(str: string): string {
  return str.replace(/[^\x00-\x7F]/g, '');
}

function sanitizeHeaders(headers: HeadersInit | undefined): Record<string, string> | undefined {
  // Konwersja wszystkich nagłówków na zwykły obiekt z sanitizacją
  // ...
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Sanityzacja nagłówków i body przed wywołaniem fetch
  // ...
}
```

### 2. Fallback do XMLHttpRequest
**Status**: ❌ Nie rozwiązuje problemu

Dodano fallback używający `XMLHttpRequest` zamiast `fetch`, ale błąd występuje przed dotarciem do tego kodu.

### 3. Weryfikacja danych użytkownika
**Status**: ✅ Potwierdzono brak polskich znaków

- Email: `admin@pracosfera.pl` (tylko ASCII)
- Hasło: tylko ASCII
- Nazwa użytkownika w bazie: `Administrator Systemu` (zawiera polskie znaki, ale nie jest używana w nagłówkach)

### 4. Weryfikacja zmiennych środowiskowych
**Status**: ✅ Potwierdzono identyczność

- `VITE_SUPABASE_URL`: identyczny w lokalnym `.env` i Coolify
- `VITE_SUPABASE_ANON_KEY`: identyczny w lokalnym `.env` i Coolify

### 5. Migracja do Supabase Auth
**Status**: ✅ Zakończona

- Schemat bazy danych zaktualizowany
- Użytkownik admin utworzony w Supabase Auth
- Kod aplikacji zaktualizowany do użycia `supabase.auth.signInWithPassword`

## Analiza problemu

### Hipotezy:

1. **Supabase client ustawia nagłówki wewnętrznie**
   - Błąd występuje przed dotarciem do naszego custom `fetch`
   - Supabase może używać wewnętrznych nagłówków z nie-ASCII znakami

2. **Różnice w buildzie Vite**
   - Build produkcyjny na Coolify może różnić się od lokalnego dev build
   - Minifikacja/bundling może wpływać na sposób obsługi nagłówków

3. **Różnice w środowisku przeglądarki**
   - Coolify może używać innej wersji przeglądarki/serwera
   - Różnice w implementacji `fetch` API

4. **Problem z bundlerem**
   - Vite może inaczej bundle'ować kod w produkcji vs development
   - Możliwe problemy z tree-shaking lub code splitting

### Obserwacje:

- ✅ Błąd występuje **tylko** w środowisku produkcyjnym (Coolify)
- ✅ Błąd występuje **tylko** podczas logowania (Supabase Auth)
- ✅ Inne operacje Supabase (np. odczyt danych) działają poprawnie po zalogowaniu
- ✅ Lokalnie wszystko działa poprawnie
- ❌ Custom `fetch` wrapper nie przechwytuje problemu (błąd występuje wcześniej)

## Aktualny stan

### Pliki związane z problemem:
- `src/lib/supabase.ts` - konfiguracja Supabase client z custom fetch
- `src/contexts/AuthContext.tsx` - funkcja logowania
- `src/pages/Login.tsx` - komponent logowania

### Aktualna implementacja custom fetch:

```typescript
// src/lib/supabase.ts
function sanitizeToASCII(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/[^\x00-\x7F]/g, '');
}

function sanitizeHeaders(headers: HeadersInit | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  const sanitized: Record<string, string> = {};
  
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      sanitized[sanitizeToASCII(key)] = sanitizeToASCII(value);
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      sanitized[sanitizeToASCII(key)] = sanitizeToASCII(String(value));
    });
  } else if (typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      sanitized[sanitizeToASCII(key)] = sanitizeToASCII(String(value));
    }
  }
  return sanitized;
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const sanitizedInput = typeof input === 'string' ? sanitizeToASCII(input) : input;
    const sanitizedInit: RequestInit = { ...init };
    
    if (init?.headers) {
      sanitizedInit.headers = sanitizeHeaders(init.headers);
    }
    
    // Sanityzacja body JSON...
    
    return fetch(sanitizedInput, sanitizedInit);
  } catch (error: any) {
    if (error?.message?.includes('ISO-8859-1') || error?.message?.includes('headers')) {
      // Fallback do XMLHttpRequest...
    }
    throw error;
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  global: { fetch: safeFetch }
});
```

### Ostatnia próba rozwiązania:
Dodano agresywną sanitizację nagłówków w custom `fetch` wrapper z fallbackiem do XMLHttpRequest, ale błąd nadal występuje. Błąd pojawia się przed dotarciem do naszego custom fetch, co sugeruje, że Supabase client może ustawiać nagłówki wewnętrznie.

## Pytania do konsultacji

1. **Dlaczego błąd występuje tylko w środowisku produkcyjnym?**
   - Co może powodować różnice między lokalnym dev a produkcją?

2. **Czy Supabase client może ustawiać nagłówki wewnętrznie przed naszym fetch?**
   - Jak przechwycić/przeciwdziałać takim nagłówkom?

3. **Czy problem może być związany z bundlerem Vite?**
   - Czy są znane problemy z Vite + Supabase w produkcji?

4. **Czy istnieje alternatywne podejście do Supabase Auth?**
   - Może bezpośrednie wywołania REST API zamiast Supabase client?

5. **Czy problem może być związany z Coolify/Nginx?**
   - Czy proxy/load balancer może modyfikować nagłówki?

## Logi i debugowanie

### Konsola przeglądarki (produkcja):
```
Injected CSS loaded successfully
index-vHo15jL0.js:279 TypeError: Failed to execute 'fetch' on 'Window': Failed to read the 'headers' property from 'RequestInit': String contains non ISO-8859-1 code point.
```

### Weryfikacja danych:
- ✅ Email użytkownika: tylko ASCII
- ✅ Hasło: tylko ASCII  
- ✅ Supabase URL: tylko ASCII
- ✅ Supabase Anon Key: tylko ASCII
- ⚠️ Nazwa użytkownika w bazie: zawiera polskie znaki (`Administrator Systemu`)

## Dodatkowe informacje

### Wersje pakietów:
```json
{
  "@supabase/supabase-js": "^2.86.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "vite": "^5.4.19",
  "typescript": "^5.8.3"
}
```

### Dockerfile:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx config:
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Kluczowe pliki do przeglądu

### Pliki związane z problemem:
- `src/lib/supabase.ts` - konfiguracja Supabase client z custom fetch wrapper
- `src/contexts/AuthContext.tsx` - implementacja logowania używająca `supabase.auth.signInWithPassword`
- `src/pages/Login.tsx` - komponent UI logowania
- `Dockerfile` - konfiguracja builda Docker
- `nginx.conf` - konfiguracja Nginx dla statycznych plików

### Pliki pomocnicze:
- `package.json` - zależności projektu
- `MIGRATION_TO_AUTH.md` - dokumentacja migracji do Supabase Auth
- `supabase_update_schema_for_auth.sql` - skrypt SQL aktualizujący schemat bazy

## Reprodukcja błędu

### Kroki do reprodukcji:
1. Wdróż aplikację na Coolify z aktualnym kodem
2. Otwórz aplikację w przeglądarce: `https://pracosfera.dogtronic.biz`
3. Przejdź do strony logowania
4. Wprowadź dane:
   - Email: `admin@pracosfera.pl`
   - Hasło: (hasło ustawione w Supabase Auth)
5. Kliknij "Zaloguj się"
6. **Błąd występuje natychmiast** - przed wysłaniem żądania HTTP

### Oczekiwane zachowanie:
- Użytkownik powinien zostać zalogowany i przekierowany do odpowiedniego panelu

### Rzeczywiste zachowanie:
- Błąd w konsoli przeglądarki
- Użytkownik nie może się zalogować
- Aplikacja pozostaje na stronie logowania

## Kontakt
- **Projekt**: Pracosfera (system zarządzania pracownikami)
- **Repository**: DTMaciejM/pracosfera-main
- **Deployment**: Coolify (https://pracosfera.dogtronic.biz)
- **Lokalne środowisko**: macOS, Node.js 20, Vite dev server

---

**Data utworzenia**: 2024-12-06  
**Data rozwiązania**: 2024-12-06  
**Status**: ✅ Rozwiązany  
**Priorytet**: Wysoki - blokował logowanie w środowisku produkcyjnym

---

## ✅ ROZWIĄZANIE

### Przyczyna błędu:
**Dodatkowa spacja na końcu zmiennej środowiskowej `VITE_SUPABASE_ANON_KEY` w Coolify**

### Opis rozwiązania:
1. Sprawdzono zmienne środowiskowe w Coolify
2. Znaleziono dodatkową spację na końcu wartości `VITE_SUPABASE_ANON_KEY`
3. Usunięto spację z wartości zmiennej
4. Po redeploy aplikacji logowanie działa poprawnie

### Dlaczego to powodowało błąd:
- Spacja na końcu klucza API powodowała, że Supabase client próbował użyć nieprawidłowego klucza
- Podczas konstruowania nagłówków HTTP, nieprawidłowy klucz mógł zawierać znaki powodujące problemy z kodowaniem ISO-8859-1
- Błąd występował tylko w produkcji, ponieważ lokalnie zmienna była poprawnie ustawiona (bez spacji)

### Wnioski na przyszłość:
- ✅ Zawsze sprawdzaj zmienne środowiskowe pod kątem białych znaków (spacje, tabulatory, znaki nowej linii)
- ✅ Używaj narzędzi do walidacji zmiennych środowiskowych przed wdrożeniem
- ✅ Rozważ użycie `.env.example` z komentarzami o formatowaniu
- ✅ W Coolify/Docker używaj `trim()` lub podobnych funkcji przy ustawianiu zmiennych

### Status:
- ✅ Logowanie działa poprawnie
- ✅ Wszystkie funkcje aplikacji działają
- ✅ Problem całkowicie rozwiązany

