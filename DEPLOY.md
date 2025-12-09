# Wdrożenie aplikacji Pracosfera na Coolify

## Wymagania

- Konto na Coolify
- Projekt Supabase z skonfigurowaną bazą danych
- Repozytorium Git (GitHub, GitLab, itp.)

## Krok 1: Przygotowanie zmiennych środowiskowych

Aplikacja wymaga następujących zmiennych środowiskowych:

- `VITE_SUPABASE_URL` - URL Twojego projektu Supabase
- `VITE_SUPABASE_ANON_KEY` - Klucz anonimowy Supabase

Możesz znaleźć te wartości w panelu Supabase:
1. Przejdź do Settings > API
2. Skopiuj "Project URL" jako `VITE_SUPABASE_URL`
3. Skopiuj "anon public" key jako `VITE_SUPABASE_ANON_KEY`

## Krok 2: Konfiguracja w Coolify

### Opcja A: Wdrożenie przez Git (Zalecane) ⭐

1. **Utwórz nową aplikację w Coolify:**
   - Zaloguj się do panelu Coolify
   - Kliknij "New Resource" > "Application"
   - Wybierz "Git Repository" (nie "Docker Based")
   - Coolify automatycznie wykryje Dockerfile z repozytorium

2. **Skonfiguruj źródło:**
   - Wybierz "Git Repository"
   - Podaj URL repozytorium (np. `https://github.com/username/pracosfera-main`)
   - Wybierz branch (zwykle `main` lub `master`)
   - Coolify automatycznie wykryje Dockerfile

3. **Skonfiguruj zmienne środowiskowe:**
   - W sekcji "Environment Variables" dodaj:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```
   - **WAŻNE:** Coolify automatycznie przekazuje zmienne środowiskowe jako build arguments do Dockerfile
   - Upewnij się, że zmienne są ustawione przed rozpoczęciem buildu
   - Po zmianie zmiennych środowiskowych musisz zrobić redeploy aplikacji

4. **Skonfiguruj porty w sekcji Network:**
   - **Ports Exposes**: `80` ✅ (port wewnątrz kontenera - nginx nasłuchuje na 80)
   - **Ports Mappings**: `80:80` ✅ (mapowanie portu hosta na port kontenera)
     - **UWAGA:** Nie używaj `3000:3000` - to jest niepoprawne dla tej aplikacji!
     - Możesz też zostawić puste, Coolify automatycznie zmapuje port 80

5. **Wdróż:**
   - Kliknij "Deploy"
   - Coolify zbuduje obraz Docker i uruchomi kontener

### Opcja B: Wdrożenie przez Dockerfile (Bez Git)

Jeśli chcesz wdrożyć bezpośrednio z Dockerfile (bez repozytorium Git):

1. **Utwórz nową aplikację:**
   - Kliknij "New Resource" > "Application"
   - Wybierz "Docker Based" > "Dockerfile"
   
2. **Skonfiguruj Dockerfile:**
   - Ścieżka do Dockerfile: `./Dockerfile` (lub po prostu `Dockerfile`)
   - Build context: `.` (katalog główny)
   - Możesz też wkleić zawartość Dockerfile bezpośrednio w edytorze

3. **Dodaj zmienne środowiskowe:**
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Skonfiguruj porty w sekcji Network:**
   - **Ports Exposes**: `80` ✅ (port wewnątrz kontenera - nginx nasłuchuje na 80)
   - **Ports Mappings**: `80:80` ✅ (mapowanie portu hosta na port kontenera)
     - **UWAGA:** Nie używaj `3000:3000` - to jest niepoprawne dla tej aplikacji!
     - Możesz też zostawić puste, Coolify automatycznie zmapuje port 80

5. **Wdróż:**
   - Kliknij "Deploy"
   - Coolify zbuduje obraz Docker i uruchomi kontener

**Uwaga:** Ta opcja wymaga ręcznego aktualizowania kodu w Coolify. Opcja A (Git) jest wygodniejsza dla ciągłego wdrażania.

## Krok 3: Konfiguracja domeny (Opcjonalne)

1. W ustawieniach aplikacji przejdź do "Domains"
2. Dodaj swoją domenę
3. Coolify automatycznie skonfiguruje SSL (Let's Encrypt)

## Krok 4: Weryfikacja

Po wdrożeniu:

1. Sprawdź logi aplikacji w Coolify
2. Otwórz aplikację w przeglądarce
3. Sprawdź, czy zmienne środowiskowe są poprawnie załadowane (w DevTools > Console)

## Rozwiązywanie problemów

### Problem: Zmienne środowiskowe nie działają

**Rozwiązanie:** Vite wymaga, aby zmienne środowiskowe zaczynały się od `VITE_`. Upewnij się, że:
- Zmienne są ustawione przed buildem
- Nazwy zmiennych są poprawne: `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`

### Problem: Routing nie działa (404 przy odświeżeniu)

**Rozwiązanie:** Nginx jest już skonfigurowany w `nginx.conf` do obsługi client-side routing. Jeśli problem występuje, sprawdź, czy plik `nginx.conf` jest poprawnie skopiowany.

### Problem: Build się nie powodzi

**Rozwiązanie:**
1. Sprawdź logi builda w Coolify
2. Upewnij się, że wszystkie zależności są w `package.json`
3. Sprawdź, czy Node.js wersja jest kompatybilna (używamy Node 20)

### Problem: Aplikacja nie łączy się z Supabase

**Rozwiązanie:**
1. Sprawdź, czy zmienne środowiskowe są ustawione
2. Sprawdź, czy URL Supabase jest poprawny
3. Sprawdź, czy klucz anonimowy jest poprawny
4. Sprawdź logi przeglądarki (F12 > Console) pod kątem błędów

## Aktualizacja aplikacji

Aby zaktualizować aplikację:

1. Wprowadź zmiany w repozytorium Git
2. Zatwierdź i wypchnij zmiany
3. W Coolify kliknij "Redeploy" lub skonfiguruj automatyczne wdrożenia (Webhooks)

## Struktura plików

- `Dockerfile` - Konfiguracja Docker dla aplikacji
- `nginx.conf` - Konfiguracja serwera nginx
- `.dockerignore` - Pliki ignorowane podczas builda
- `package.json` - Zależności projektu

## Wsparcie

W razie problemów sprawdź:
- [Dokumentacja Coolify](https://coolify.io/docs)
- [Dokumentacja Vite](https://vitejs.dev/)
- Logi aplikacji w panelu Coolify

