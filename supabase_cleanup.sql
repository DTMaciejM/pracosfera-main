-- ============================================
-- PRACOSFERA - Database Cleanup Script
-- ============================================
-- This script will:
-- 1. Delete all reservations
-- 2. Delete all users except admin
--    (This will automatically delete related records in worker_shifts, 
--     custom_shift_hours, and franchisees due to CASCADE constraints)
--
-- WARNING: This operation is IRREVERSIBLE!
-- Make sure you have a backup before running this script.
-- ============================================

BEGIN;

-- Step 1: Delete all reservations
DELETE FROM reservations;

-- Step 2: Delete all users except admin
-- This will automatically cascade delete:
-- - worker_shifts (for workers)
-- - custom_shift_hours (for workers)
-- - franchisees (for franchisees)
DELETE FROM users 
WHERE role != 'admin';

-- Optional: Reset sequences if you want to start IDs from 1
-- (Not needed for UUID, but included for completeness)
-- Note: UUID sequences don't need resetting

COMMIT;

-- ============================================
-- Verification queries (run after cleanup)
-- ============================================

-- Check remaining users (should only show admin)
-- SELECT id, email, name, role FROM users;

-- Check reservations count (should be 0)
-- SELECT COUNT(*) as reservation_count FROM reservations;

-- Check workers count (should be 0)
-- SELECT COUNT(*) as worker_count FROM users WHERE role = 'worker';

-- Check franchisees count (should be 0)
-- SELECT COUNT(*) as franchisee_count FROM users WHERE role = 'franchisee';

-- Check worker_shifts count (should be 0)
-- SELECT COUNT(*) as shifts_count FROM worker_shifts;

-- Check custom_shift_hours count (should be 0)
-- SELECT COUNT(*) as custom_hours_count FROM custom_shift_hours;

-- Check franchisees table count (should be 0)
-- SELECT COUNT(*) as franchisees_table_count FROM franchisees;

