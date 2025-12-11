-- Dodanie statusu "do weryfikacji" do tabeli reservations
-- Status będzie ustawiany automatycznie po zakończeniu zlecenia z przypisanym pracownikiem
-- Po 24 godzinach automatycznie zmienia się na "zakończone"

-- Najpierw usuń istniejące ograniczenie CHECK
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;

-- Dodaj nowe ograniczenie CHECK z nowym statusem
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
  CHECK (status IN ('nieprzypisane', 'przypisane', 'w trakcie', 'do weryfikacji', 'zakończone', 'anulowane'));

-- Komentarz wyjaśniający nowy status
COMMENT ON COLUMN reservations.status IS 'Status zlecenia: nieprzypisane, przypisane, w trakcie, do weryfikacji (24h po zakończeniu z pracownikiem), zakończone, anulowane';

