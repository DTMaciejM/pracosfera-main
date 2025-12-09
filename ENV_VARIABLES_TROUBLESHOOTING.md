# Troubleshooting: Zmienne środowiskowe w Coolify

## Problem: Dodatkowe białe znaki w zmiennych środowiskowych

### Symptomy:
- Błąd: `TypeError: Failed to execute 'fetch' on 'Window': Failed to read the 'headers' property from 'RequestInit': String contains non ISO-8859-1 code point`
- Aplikacja działa lokalnie, ale nie działa w produkcji (Coolify)
- Błędy związane z kodowaniem nagłówków HTTP

### Przyczyna:
Dodatkowe białe znaki (spacje, tabulatory, znaki nowej linii) na początku lub końcu wartości zmiennych środowiskowych w Coolify.

### Rozwiązanie:

#### 1. Sprawdź zmienne środowiskowe w Coolify:
- Przejdź do ustawień aplikacji w Coolify
- Sprawdź sekcję "Environment Variables"
- Zwróć uwagę na:
  - Spacje na początku wartości
  - Spacje na końcu wartości
  - Tabulatory
  - Znaki nowej linii

#### 2. Jak naprawić:
- **Metoda 1**: Skopiuj wartość do edytora tekstu i usuń wszystkie białe znaki
- **Metoda 2**: Użyj narzędzia do czyszczenia (np. `trim()` w JavaScript)
- **Metoda 3**: Skopiuj wartość z lokalnego `.env` i wklej bezpośrednio do Coolify

#### 3. Weryfikacja:
Po poprawieniu zmiennych:
1. Redeploy aplikacji w Coolify
2. Sprawdź logi aplikacji
3. Przetestuj funkcjonalność (np. logowanie)

### Przykład problemu:

**❌ Błędna wartość (z dodatkową spacją):**
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... 
```

**✅ Poprawna wartość:**
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Zapobieganie:

#### 1. Użyj `.env.example`:
```bash
# .env.example
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### 2. Walidacja w kodzie (opcjonalnie):
```typescript
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}
```

#### 3. Sprawdź przed wdrożeniem:
- Użyj narzędzi do walidacji zmiennych środowiskowych
- Porównaj wartości lokalne z produkcyjnymi
- Użyj `echo` w terminalu do sprawdzenia wartości

### Dodatkowe wskazówki:

1. **Nigdy nie kopiuj wartości z dokumentacji bez sprawdzenia** - mogą zawierać ukryte znaki
2. **Używaj narzędzi do zarządzania zmiennymi** - niektóre narzędzia automatycznie trimują wartości
3. **Sprawdzaj logi aplikacji** - mogą wskazać problemy z konfiguracją
4. **Używaj wersjonowania** - przechowuj zmienne środowiskowe w bezpiecznym miejscu (np. secrets manager)

---

**Data utworzenia**: 2024-12-06  
**Oparte na**: Rozwiązaniu problemu z `VITE_SUPABASE_ANON_KEY` w Coolify

