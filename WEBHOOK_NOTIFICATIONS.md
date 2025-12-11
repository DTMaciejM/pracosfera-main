# System powiadomień Webhook

## Przegląd

System automatycznie wysyła powiadomienia webhook do zewnętrznego serwisu (n8n) gdy:
- Nowe zlecenie zostanie utworzone przez franczyzobiorcę
- Nowe zlecenie zostanie utworzone przez administratora

## Konfiguracja

### URL Webhooka

Webhook jest wysyłany na adres:
```
https://n8n.dogtronic.dev/webhook/pracosfera
```

**Metoda**: POST  
**Content-Type**: application/json

## Format danych webhooka

### Struktura żądania

```json
{
  "event": "reservation_created",
  "timestamp": "2024-12-06T10:30:00.000Z",
  "data": {
    "id": "uuid-zlecenia",
    "reservation_number": "0001",
    "date": "2024-12-10",
    "start_time": "10:00:00",
    "end_time": "12:00:00",
    "hours": 2.0,
    "status": "nieprzypisane",
    "worker_id": null,
    "franchisee_id": "uuid-franczyzobiorcy",
    "created_at": "2024-12-06T10:30:00.000Z",
    "updated_at": "2024-12-06T10:30:00.000Z",
    "franchisee": {
      "id": "uuid-franczyzobiorcy",
      "name": "Jan Kowalski",
      "email": "jan.kowalski@example.com",
      "phone": "+48 500 600 700",
      "mpk_number": "MPK001",
      "store_address": "ul. Przykładowa 1, Warszawa"
    },
    "worker": null,
    "available_worker_phones": [
      "+48 500 600 700",
      "+48 600 700 800"
    ]
  }
}
```

### Przykład z przypisanym pracownikiem

```json
{
  "event": "reservation_created",
  "timestamp": "2024-12-06T10:30:00.000Z",
  "data": {
    "id": "uuid-zlecenia",
    "reservation_number": "0002",
    "date": "2024-12-10",
    "start_time": "14:00:00",
    "end_time": "16:00:00",
    "hours": 2.0,
    "status": "przypisane",
    "worker_id": "uuid-pracownika",
    "franchisee_id": "uuid-franczyzobiorcy",
    "created_at": "2024-12-06T10:30:00.000Z",
    "updated_at": "2024-12-06T10:30:00.000Z",
    "franchisee": {
      "id": "uuid-franczyzobiorcy",
      "name": "Jan Kowalski",
      "email": "jan.kowalski@example.com",
      "phone": "+48 500 600 700",
      "mpk_number": "MPK001",
      "store_address": "ul. Przykładowa 1, Warszawa"
    },
    "worker": {
      "id": "uuid-pracownika",
      "name": "Anna Nowak",
      "email": "anna.nowak@example.com",
      "phone": "+48 600 700 800"
    },
    "available_worker_phones": [
      "+48 600 700 800",
      "+48 700 800 900"
    ]
  }
}
```

## Lista dostępnych pracowników

Pole `available_worker_phones` zawiera listę numerów telefonów pracowników, których zmiany zawierają godziny zlecenia.

### Logika wyboru pracowników

System sprawdza wszystkich pracowników, którzy mają przypisaną zmianę w dniu zlecenia i sprawdza czy godziny zlecenia mieszczą się w godzinach ich zmiany:

- **Z-1**: 6:00 - 14:00
- **Z-2**: 10:00 - 18:00
- **Z-3**: 15:00 - 23:00
- **CUST**: Niestandardowe godziny (z tabeli `custom_shift_hours`)
- **WOLNY**: Wolne - pracownik nie jest uwzględniany

### Przykład

Jeśli zlecenie jest na 10:00-12:00, system znajdzie pracowników z:
- Zmianą Z-1 (6:00-14:00) ✅
- Zmianą Z-2 (10:00-18:00) ✅
- Zmianą CUST z godzinami zawierającymi 10:00-12:00 ✅
- Zmianą Z-3 (15:00-23:00) ❌
- Zmianą WOLNY ❌

## Statusy zleceń

Możliwe wartości pola `status`:
- `nieprzypisane` - Zlecenie nie ma przypisanego pracownika
- `przypisane` - Zlecenie ma przypisanego pracownika
- `w trakcie` - Zlecenie jest aktualnie wykonywane
- `zakończone` - Zlecenie zostało zakończone
- `anulowane` - Zlecenie zostało anulowane

## Gdzie są wysyłane webhooki

### 1. Tworzenie zlecenia przez franczyzobiorcę (`NewReservationDialog.tsx`)

Webhook jest wysyłany gdy:
- Franczyzobiorca tworzy nowe zlecenie
- Zlecenie zostaje pomyślnie zapisane w bazie danych
- Status zlecenia to zawsze `nieprzypisane` (pracownik nie jest przypisywany podczas tworzenia)

### 2. Tworzenie zlecenia przez administratora (`AdminNewReservationDialog.tsx`)

Webhook jest wysyłany gdy:
- Administrator tworzy nowe zlecenie
- Zlecenie zostaje pomyślnie zapisane w bazie danych
- Status może być:
  - `nieprzypisane` - jeśli nie wybrano pracownika
  - `przypisane` - jeśli wybrano pracownika
  - `zakończone` - jeśli data zlecenia jest w przeszłości

## Obsługa błędów

- Błędy wysyłania webhooka są logowane w konsoli przeglądarki, ale **nie przerywają** procesu tworzenia zlecenia
- Jeśli webhook się nie powiedzie, zlecenie i tak zostanie utworzone w bazie danych
- Użytkownik nie widzi błędów związanych z webhookiem (tylko logi w konsoli)

## Struktura kodu

### Pliki

- **`src/lib/webhook.ts`** - Funkcje do wysyłania webhooka:
  - `sendReservationWebhook()` - Wysyła webhook z danymi zlecenia
  - `ReservationWebhookData` - Typ danych wysyłanych w webhooku

- **`src/components/NewReservationDialog.tsx`** - Wywołuje webhook przy tworzeniu zlecenia przez franczyzobiorcę
- **`src/components/admin/AdminNewReservationDialog.tsx`** - Wywołuje webhook przy tworzeniu zlecenia przez administratora

## Przykładowe odpowiedzi

### Sukces

Webhook zwraca status HTTP 200 (lub inny sukcesowy kod w zależności od konfiguracji n8n).

### Błąd

Jeśli webhook zwróci błąd, zostanie zalogowany w konsoli:
```
Error sending webhook: Error: Webhook error: 500 Internal Server Error
```

## Testowanie

### Test ręczny funkcji webhooka

```typescript
import { sendReservationWebhook } from '@/lib/webhook';

const result = await sendReservationWebhook({
  id: 'test-id',
  reservation_number: '0001',
  date: '2024-12-10',
  start_time: '10:00:00',
  end_time: '12:00:00',
  hours: 2.0,
  status: 'nieprzypisane',
  worker_id: null,
  franchisee_id: 'franchisee-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  franchisee: {
    id: 'franchisee-id',
    name: 'Jan Kowalski',
    email: 'jan@example.com',
    phone: '+48 500 600 700',
    mpk_number: 'MPK001',
    store_address: 'ul. Przykładowa 1',
  },
  worker: null,
});

console.log(result); // { success: true } lub { success: false, error: '...' }
```

### Sprawdzenie w konsoli przeglądarki

Po utworzeniu zlecenia sprawdź konsolę przeglądarki (F12):
- Sukces: `Webhook sent successfully`
- Błąd: `Error sending webhook: ...`

## Troubleshooting

### Problem: Webhook nie jest wysyłany

1. **Sprawdź logi w konsoli przeglądarki**:
   - Otwórz DevTools (F12)
   - Sprawdź zakładkę Console
   - Szukaj komunikatów "Error sending webhook" lub "Webhook sent successfully"

2. **Sprawdź czy zlecenie zostało utworzone**:
   - Webhook jest wysyłany tylko po pomyślnym utworzeniu zlecenia
   - Jeśli zlecenie nie zostało utworzone, webhook nie zostanie wysłany

3. **Sprawdź połączenie sieciowe**:
   - Upewnij się, że aplikacja ma dostęp do internetu
   - Sprawdź czy URL webhooka jest poprawny

### Problem: Webhook jest wysyłany, ale n8n nie odbiera danych

1. **Sprawdź konfigurację webhooka w n8n**:
   - Upewnij się, że webhook w n8n nasłuchuje na poprawnym URL
   - Sprawdź czy metoda HTTP to POST
   - Sprawdź czy workflow jest aktywny

2. **Sprawdź format danych**:
   - Upewnij się, że n8n oczekuje danych w formacie JSON
   - Sprawdź czy struktura danych pasuje do oczekiwań n8n

3. **Sprawdź logi n8n**:
   - Sprawdź logi wykonania workflow w n8n
   - Sprawdź czy są jakieś błędy parsowania danych

### Problem: Webhook zwraca błąd

1. **Sprawdź status odpowiedzi**:
   - Otwórz DevTools (F12) > Network
   - Znajdź żądanie do webhooka
   - Sprawdź status odpowiedzi i treść odpowiedzi

2. **Sprawdź czy n8n jest dostępne**:
   - Upewnij się, że serwer n8n jest uruchomiony
   - Sprawdź czy URL jest poprawny i dostępny

---

**Data utworzenia**: 2024-12-06  
**Ostatnia aktualizacja**: 2024-12-06

