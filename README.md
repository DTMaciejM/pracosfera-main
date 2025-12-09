# Pracosfera - System zarządzania pracownikami

System zarządzania pracownikami i zleceniami dla franczyzobiorców.

## Opis projektu

Pracosfera to aplikacja webowa umożliwiająca:
- Zarządzanie pracownikami i ich harmonogramami
- Tworzenie i zarządzanie zleceniami
- Przypisywanie pracowników do zleceń
- Automatyczną aktualizację statusów zleceń
- Panel administratora, franczyzobiorcy i pracownika

## Technologie

Projekt wykorzystuje:
- **Vite** - Build tool
- **TypeScript** - Typowanie statyczne
- **React** - Framework UI
- **shadcn-ui** - Komponenty UI
- **Tailwind CSS** - Stylowanie
- **Supabase** - Baza danych i autentykacja
- **React Router** - Routing

## Instalacja i uruchomienie

### Wymagania

- Node.js 20+ (zalecane użycie [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm lub yarn

### Kroki instalacji

```sh
# 1. Sklonuj repozytorium
git clone <YOUR_GIT_URL>

# 2. Przejdź do katalogu projektu
cd pracosfera-main

# 3. Zainstaluj zależności
npm install

# 4. Skonfiguruj zmienne środowiskowe
# Utwórz plik .env w głównym katalogu:
# VITE_SUPABASE_URL=your-supabase-url
# VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# 5. Uruchom serwer deweloperski
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:8080`

## Wdrożenie

### Wdrożenie na Coolify

Szczegółowe instrukcje znajdziesz w pliku [DEPLOY.md](./DEPLOY.md).

### Wymagane zmienne środowiskowe

- `VITE_SUPABASE_URL` - URL projektu Supabase
- `VITE_SUPABASE_ANON_KEY` - Klucz anonimowy Supabase

## Dokumentacja

- [DEPLOY.md](./DEPLOY.md) - Instrukcje wdrożenia na Coolify
- [AUTO_UPDATE_STATUSES.md](./AUTO_UPDATE_STATUSES.md) - Automatyczna aktualizacja statusów zleceń
- [ARCHITECTURE_RESERVATION_STATUS.md](./ARCHITECTURE_RESERVATION_STATUS.md) - Architektura aktualizacji statusów
- [MIGRATION_TO_AUTH.md](./MIGRATION_TO_AUTH.md) - Migracja do Supabase Auth

## Licencja

Wszystkie prawa zastrzeżone.
