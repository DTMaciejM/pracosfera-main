# Architektura: Aktualizacja statusów zleceń w systemie Pracosfera

## Podsumowanie

System **automatycznie sprawdza i aktualizuje statusy zleceń** w oparciu o aktualną datę i godzinę, ale **tylko w momencie załadowania danych** przez użytkownika. Nie ma automatycznego interwału działającego w tle.

## Mechanizm aktualizacji statusów

### 1. Funkcje aktualizujące statusy

System używa dwóch głównych funkcji do aktualizacji statusów:

#### A. `updateExpiredReservations()` - Aktualizacja przeterminowanych zleceń

**Lokalizacja**: 
- `src/components/admin/AdminDashboard.tsx` (linie 50-79)
- `src/components/AdminReservationTable.tsx` (linie 71-100)

**Działanie**:
```typescript
const updateExpiredReservations = async () => {
  // 1. Pobiera aktualną datę (dzisiaj)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = format(today, 'yyyy-MM-dd');

  // 2. Znajduje wszystkie zlecenia z datą w przeszłości
  //    które mają status: 'nieprzypisane', 'przypisane', 'w trakcie'
  const expiredReservations = await supabase
    .from('reservations')
    .select('id')
    .lt('date', todayStr)
    .in('status', ['nieprzypisane', 'przypisane', 'w trakcie']);

  // 3. Zmienia status wszystkich przeterminowanych zleceń na "zakończone"
  await supabase
    .from('reservations')
    .update({ status: 'zakończone' })
    .in('id', expiredReservationIds);
};
```

**Logika**:
- Jeśli data zlecenia < dzisiejsza data → status = "zakończone"
- Dotyczy tylko zleceń ze statusem: `nieprzypisane`, `przypisane`, `w trakcie`
- Nie dotyczy zleceń już zakończonych lub anulowanych

#### B. `updateActiveReservations()` - Aktualizacja aktywnych zleceń

**Lokalizacja**: 
- `src/components/admin/AdminDashboard.tsx` (linie 83-149)
- `src/components/AdminReservationTable.tsx` (linie 104-170)

**Działanie**:
```typescript
const updateActiveReservations = async () => {
  // 1. Pobiera aktualną datę i godzinę
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayStr = format(today, 'yyyy-MM-dd');
  const currentTime = format(now, 'HH:mm:ss');
  const currentTimeShort = currentTime.substring(0, 5); // HH:MM

  // 2. Pobiera wszystkie zlecenia z dzisiejszą datą
  //    które mają przypisanego pracownika
  //    i status: 'przypisane' lub 'w trakcie'
  const todayReservations = await supabase
    .from('reservations')
    .select('id, start_time, end_time, status')
    .eq('date', todayStr)
    .in('status', ['przypisane', 'w trakcie'])
    .not('worker_id', 'is', null);

  // 3. Dla każdego zlecenia sprawdza aktualną godzinę:
  for (const reservation of todayReservations) {
    const startTime = reservation.start_time.substring(0, 5); // HH:MM
    const endTime = reservation.end_time.substring(0, 5); // HH:MM

    // Jeśli aktualna godzina >= start_time && < end_time
    if (currentTimeShort >= startTime && currentTimeShort < endTime) {
      // Jeśli status = "przypisane" → zmień na "w trakcie"
      if (reservation.status === 'przypisane') {
        activeReservationIds.push(reservation.id);
      }
    }
    // Jeśli aktualna godzina >= end_time
    else if (currentTimeShort >= endTime) {
      // Zmień status na "zakończone"
      completedReservationIds.push(reservation.id);
    }
  }

  // 4. Aktualizuje statusy w bazie danych
  if (activeReservationIds.length > 0) {
    await supabase
      .from('reservations')
      .update({ status: 'w trakcie' })
      .in('id', activeReservationIds);
  }

  if (completedReservationIds.length > 0) {
    await supabase
      .from('reservations')
      .update({ status: 'zakończone' })
      .in('id', completedReservationIds);
  }
};
```

**Logika**:
- **"przypisane" → "w trakcie"**: Gdy aktualna godzina >= `start_time` i < `end_time`
- **"w trakcie" → "zakończone"**: Gdy aktualna godzina >= `end_time`
- Dotyczy tylko zleceń z dzisiejszą datą i przypisanym pracownikiem

### 2. Kiedy funkcje są wywoływane?

#### Panel Administratora (`AdminDashboard.tsx`)

```typescript
useEffect(() => {
  loadData(); // Wywołuje loadReservations(), który z kolei wywołuje funkcje aktualizujące
}, []); // Tylko raz przy załadowaniu komponentu

const loadReservations = async () => {
  await updateExpiredReservations();  // Najpierw aktualizuj przeterminowane
  await updateActiveReservations();   // Następnie aktualizuj aktywne
  // ... pobierz zlecenia z bazy
};
```

#### Tabela Zleceń (`AdminReservationTable.tsx`)

```typescript
useEffect(() => {
  loadReservations(); // Wywołuje funkcje aktualizujące
}, []); // Tylko raz przy załadowaniu komponentu

const loadReservations = async () => {
  await updateExpiredReservations();
  await updateActiveReservations();
  // ... pobierz zlecenia z bazy
};
```

#### Panel Franczyzobiorcy (`Index.tsx`)

**⚠️ UWAGA**: Panel franczyzobiorcy **NIE** aktualizuje statusów automatycznie. Tylko wyświetla statusy z bazy danych.

```typescript
const loadReservations = async () => {
  // Tylko pobiera zlecenia, nie aktualizuje statusów
  const { data } = await supabase
    .from('reservations_view')
    .select('*')
    .eq('franchisee_id', user.id);
};
```

## Statusy zleceń

### Możliwe statusy:
1. **`nieprzypisane`** - Zlecenie utworzone, ale bez przypisanego pracownika
2. **`przypisane`** - Zlecenie ma przypisanego pracownika, ale jeszcze się nie rozpoczęło
3. **`w trakcie`** - Zlecenie jest aktualnie wykonywane (aktualna godzina między start_time a end_time)
4. **`zakończone`** - Zlecenie zostało zakończone
5. **`anulowane`** - Zlecenie zostało anulowane

### Automatyczne przejścia statusów:

```
nieprzypisane → przypisane (ręcznie przez admina)
przypisane → w trakcie (automatycznie gdy start_time <= aktualna godzina < end_time)
w trakcie → zakończone (automatycznie gdy aktualna godzina >= end_time)
dowolny status → zakończone (automatycznie gdy data < dzisiejsza data)
```

## Ograniczenia obecnej architektury

### ⚠️ Brak automatycznego interwału

**Problem**: Statusy są aktualizowane **tylko** gdy:
- Użytkownik otwiera panel administratora
- Użytkownik ręcznie odświeża dane
- Komponent się ponownie montuje

**Konsekwencje**:
- Jeśli użytkownik ma otwarty panel przez długi czas, statusy nie aktualizują się automatycznie
- Statusy mogą być nieaktualne do momentu odświeżenia strony lub ręcznego odświeżenia danych
- Panel franczyzobiorcy nigdy nie aktualizuje statusów automatycznie

### Przykład scenariusza:

1. **09:00** - Admin otwiera panel, zlecenie ma status "przypisane" (start_time: 10:00)
2. **10:05** - Zlecenie powinno mieć status "w trakcie", ale admin nadal widzi "przypisane"
3. **10:30** - Admin odświeża stronę → status aktualizuje się na "w trakcie"
4. **11:05** - Zlecenie powinno mieć status "zakończone" (end_time: 11:00), ale admin widzi "w trakcie"
5. **11:10** - Admin odświeża ponownie → status aktualizuje się na "zakończone"

## Możliwe ulepszenia

### Opcja 1: Automatyczny interwał w komponencie

```typescript
useEffect(() => {
  // Aktualizuj statusy co minutę
  const interval = setInterval(() => {
    updateExpiredReservations();
    updateActiveReservations();
    loadReservations(); // Odśwież listę
  }, 60000); // 60 sekund

  return () => clearInterval(interval);
}, []);
```

**Zalety**:
- Statusy aktualizują się automatycznie
- Użytkownik widzi aktualne dane bez odświeżania

**Wady**:
- Więcej zapytań do bazy danych
- Może powodować problemy z wydajnością przy wielu użytkownikach

### Opcja 2: Cron job / Scheduled task po stronie serwera

**Zalety**:
- Centralne zarządzanie aktualizacjami
- Niezależne od aktywności użytkowników
- Możliwość optymalizacji zapytań

**Wady**:
- Wymaga dodatkowej infrastruktury (np. Supabase Edge Functions, cron job)
- Większa złożoność systemu

### Opcja 3: Database triggers / PostgreSQL functions

**Zalety**:
- Aktualizacje na poziomie bazy danych
- Automatyczne i niezawodne
- Nie wymaga kodu po stronie klienta

**Wady**:
- Trudniejsze w debugowaniu
- Mniej elastyczne niż kod aplikacji

## Rekomendacja

Dla obecnego systemu, **Opcja 1** (automatyczny interwał w komponencie) jest najprostsza do wdrożenia i zapewnia dobrą równowagę między aktualnością danych a wydajnością.

Interwał 1-2 minuty powinien wystarczyć dla większości przypadków użycia, ponieważ:
- Zlecenia zwykle trwają godzinę lub dłużej
- Aktualizacja co minutę zapewnia wystarczającą dokładność
- Nie powoduje nadmiernego obciążenia bazy danych

---

**Data utworzenia**: 2024-12-06  
**Ostatnia aktualizacja**: 2024-12-06

