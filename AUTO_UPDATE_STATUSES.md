e# Automatyczna aktualizacja statusów zleceń

## Przegląd

System automatycznie aktualizuje statusy zleceń co 5 minut, gdy użytkownik ma otwarty panel administratora. Aktualizacje odbywają się w tle, bez konieczności odświeżania strony.

## Jak to działa

### Mechanizm aktualizacji

System używa `setInterval` w React, który wywołuje funkcje aktualizujące statusy co 5 minut:

1. **Przeterminowane zlecenia** → Status zmieniany na "zakończone" dla zleceń z datą w przeszłości
2. **Aktywne zlecenia** → Status "przypisane" zmieniany na "w trakcie" gdy aktualna godzina >= start_time
3. **Zakończone zlecenia** → Status "w trakcie" zmieniany na "zakończone" gdy aktualna godzina >= end_time

### Gdzie działa

Automatyczna aktualizacja jest aktywna we wszystkich panelach:

- **`AdminDashboard.tsx`** - Panel główny administratora
  - Aktualizuje statusy w tle (bez odświeżania całej listy)
  
- **`AdminReservationTable.tsx`** - Tabela zleceń administratora
  - Aktualizuje statusy i odświeża listę zleceń

- **`Index.tsx`** - Panel franczyzobiorcy
  - Aktualizuje statusy i odświeża listę zleceń co 5 minut

- **`WorkerPanel.tsx`** - Panel pracownika
  - Aktualizuje statusy i odświeża listę zleceń co 5 minut

## Implementacja

### Kod w komponentach

```typescript
// Automatyczna aktualizacja statusów co 5 minut
useEffect(() => {
  const interval = setInterval(() => {
    updateExpiredReservations();  // Przeterminowane → zakończone
    updateActiveReservations();   // przypisane → w trakcie → zakończone
  }, 5 * 60 * 1000); // 5 minut

  // Wyczyść interwał przy odmontowaniu komponentu
  return () => clearInterval(interval);
}, []);
```

### Funkcje aktualizujące

#### `updateExpiredReservations()`
- Znajduje wszystkie zlecenia z datą < dzisiaj
- Zmienia status na "zakończone" dla zleceń ze statusem: `nieprzypisane`, `przypisane`, `w trakcie`

#### `updateActiveReservations()`
- Pobiera zlecenia z dzisiejszą datą i przypisanym pracownikiem
- Sprawdza aktualną godzinę względem `start_time` i `end_time`
- Aktualizuje statusy zgodnie z logiką:
  - `przypisane` → `w trakcie` (gdy start_time <= aktualna godzina < end_time)
  - `w trakcie` → `zakończone` (gdy aktualna godzina >= end_time)

## Zachowanie

### Kiedy działa
- ✅ Gdy użytkownik ma otwarty panel (admin, franczyzobiorca lub pracownik)
- ✅ Automatycznie co 5 minut w tle
- ✅ Bez konieczności odświeżania strony
- ✅ Działa we wszystkich panelach jednocześnie

### Kiedy nie działa
- ❌ Gdy użytkownik zamknie panel lub przejdzie do innej strony
- ❌ Gdy aplikacja jest w tle (zakładka przeglądarki nieaktywna)
- ❌ Gdy żaden użytkownik nie ma otwartego panelu

### Cleanup
- Interwał jest automatycznie czyszczony przy odmontowaniu komponentu
- Zapobiega wyciekom pamięci i niepotrzebnym zapytaniom do bazy

## Zalety rozwiązania

1. **Prostota** - Działa od razu, bez dodatkowej konfiguracji
2. **Wydajność** - Aktualizacje tylko gdy użytkownik korzysta z aplikacji
3. **Bez kosztów** - Nie wymaga zewnętrznych serwisów
4. **Łatwe w utrzymaniu** - Wszystko w jednym miejscu (kod React)

## Ograniczenia

- Statusy aktualizują się tylko gdy użytkownik ma otwarty panel
- Jeśli nikt nie korzysta z aplikacji, statusy nie są aktualizowane
- Każdy użytkownik wykonuje własne aktualizacje (lekkie obciążenie bazy)

## Testowanie

Aby przetestować automatyczną aktualizację:

1. Otwórz panel administratora
2. Utwórz zlecenie z dzisiejszą datą i godziną rozpoczęcia za kilka minut
3. Poczekaj 5 minut
4. Status powinien automatycznie zmienić się na "w trakcie" (jeśli aktualna godzina >= start_time)

Możesz też zmienić interwał na krótszy dla testów:

```typescript
}, 30 * 1000); // 30 sekund (tylko do testów!)
```

## Konfiguracja

Aby zmienić częstotliwość aktualizacji, zmień wartość interwału w obu komponentach:

```typescript
}, 5 * 60 * 1000); // 5 minut - zmień na żądaną wartość
```

Przykłady:
- `1 * 60 * 1000` - Co 1 minutę
- `10 * 60 * 1000` - Co 10 minut
- `30 * 1000` - Co 30 sekund (tylko do testów)

---

**Data utworzenia**: 2024-12-06  
**Ostatnia aktualizacja**: 2024-12-06

