-- ============================================
-- PRACOSFERA - Cofnięcie migracji statusów z angielskich na polskie
-- ============================================
-- Ten skrypt cofa migrację wartości statusów z angielskich na polskie
-- aby przywrócić oryginalne wartości w bazie danych

-- KROK 1: Usuń istniejące constrainty (aby móc zaktualizować dane)
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE franchisees DROP CONSTRAINT IF EXISTS franchisees_status_check;

-- KROK 2: Cofnięcie migracji statusów rezerwacji (z angielskich na polskie)
UPDATE reservations 
SET status = CASE 
  WHEN status = 'unassigned' THEN 'nieprzypisane'
  WHEN status = 'assigned' THEN 'przypisane'
  WHEN status = 'in_progress' THEN 'w trakcie'
  WHEN status = 'completed' THEN 'zakończone'
  WHEN status = 'cancelled' THEN 'anulowane'
  ELSE status
END;

-- KROK 3: Cofnięcie migracji statusów użytkowników (workers)
UPDATE users 
SET status = CASE 
  WHEN status = 'active' THEN 'aktywny'
  WHEN status = 'inactive' THEN 'nieaktywny'
  WHEN status = 'pending' THEN 'oczekuje'
  ELSE status
END
WHERE role = 'worker';

-- KROK 4: Cofnięcie migracji statusów franczyzobiorców
UPDATE franchisees 
SET status = CASE 
  WHEN status = 'active' THEN 'aktywny'
  WHEN status = 'inactive' THEN 'nieaktywny'
  WHEN status = 'pending' THEN 'oczekuje'
  ELSE status
END;

-- KROK 5: Dodaj oryginalne constrainty z polskimi wartościami
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
  CHECK (status IN ('nieprzypisane', 'przypisane', 'w trakcie', 'zakończone', 'anulowane'));

ALTER TABLE users ADD CONSTRAINT users_status_check 
  CHECK (status IN ('aktywny', 'nieaktywny', 'oczekuje') OR status IS NULL);

ALTER TABLE franchisees ADD CONSTRAINT franchisees_status_check 
  CHECK (status IN ('oczekuje', 'aktywny', 'nieaktywny'));

-- Sprawdź wyniki cofnięcia migracji
SELECT 'Reservations statuses:' as table_name, status, COUNT(*) as count 
FROM reservations 
GROUP BY status
UNION ALL
SELECT 'Users statuses:' as table_name, status, COUNT(*) as count 
FROM users 
WHERE status IS NOT NULL
GROUP BY status
UNION ALL
SELECT 'Franchisees statuses:' as table_name, status, COUNT(*) as count 
FROM franchisees 
GROUP BY status;

