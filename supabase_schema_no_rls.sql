-- ============================================
-- PRACOSFERA - Supabase Database Schema (NO RLS)
-- ============================================
-- Use this version if you're NOT using Supabase Auth
-- or want to manage permissions differently

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- Store hashed passwords, never plain text!
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'worker', 'franchisee')),
  
  -- Worker specific fields
  status VARCHAR(20) CHECK (status IN ('aktywny', 'nieaktywny', 'oczekuje')),
  
  -- Franchisee specific fields
  store_address TEXT,
  mpk_number VARCHAR(50),
  terms_accepted BOOLEAN DEFAULT false,
  registered_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE status IS NOT NULL;

-- ============================================
-- WORKER SHIFTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS worker_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('Z-1', 'Z-2', 'Z-3', 'CUST', 'WOLNY')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(worker_id, shift_date)
);

-- Indexes for worker_shifts table
CREATE INDEX IF NOT EXISTS idx_worker_shifts_worker_id ON worker_shifts(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_shifts_date ON worker_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_worker_shifts_worker_date ON worker_shifts(worker_id, shift_date);

-- ============================================
-- CUSTOM SHIFT HOURS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS custom_shift_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_shift_id UUID NOT NULL REFERENCES worker_shifts(id) ON DELETE CASCADE,
  start_time TIME NOT NULL, -- HH:MM format
  end_time TIME NOT NULL,   -- HH:MM format
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(worker_shift_id)
);

-- Index for custom_shift_hours table
CREATE INDEX IF NOT EXISTS idx_custom_shift_hours_shift_id ON custom_shift_hours(worker_shift_id);

-- ============================================
-- FRANCHISEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS franchisees (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  store_address TEXT NOT NULL,
  mpk_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('oczekuje', 'aktywny', 'nieaktywny')),
  terms_accepted BOOLEAN DEFAULT false,
  registered_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for franchisees table
CREATE INDEX IF NOT EXISTS idx_franchisees_status ON franchisees(status);
CREATE INDEX IF NOT EXISTS idx_franchisees_mpk ON franchisees(mpk_number);

-- ============================================
-- RESERVATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_number VARCHAR(50) UNIQUE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL, -- HH:MM format
  end_time TIME NOT NULL,   -- HH:MM format
  hours DECIMAL(4,2) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('nieprzypisane', 'przypisane', 'w trakcie', 'zakończone', 'anulowane')),
  
  -- Foreign keys
  worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  franchisee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reservations table
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_worker_id ON reservations(worker_id);
CREATE INDEX IF NOT EXISTS idx_reservations_franchisee_id ON reservations(franchisee_id);
CREATE INDEX IF NOT EXISTS idx_reservations_reservation_number ON reservations(reservation_number);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_franchisees_updated_at
  BEFORE UPDATE ON franchisees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View for workers with their details
CREATE OR REPLACE VIEW workers_view AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.phone,
  u.status,
  u.created_at,
  u.updated_at
FROM users u
WHERE u.role = 'worker';

-- View for franchisees with their details
CREATE OR REPLACE VIEW franchisees_view AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.phone,
  f.store_address,
  f.mpk_number,
  f.status,
  f.terms_accepted,
  f.registered_at,
  u.created_at,
  u.updated_at
FROM users u
JOIN franchisees f ON u.id = f.id
WHERE u.role = 'franchisee';

-- View for reservations with worker and franchisee details
CREATE OR REPLACE VIEW reservations_view AS
SELECT 
  r.id,
  r.reservation_number,
  r.date,
  r.start_time,
  r.end_time,
  r.hours,
  r.status,
  r.created_at,
  r.updated_at,
  -- Worker details
  w.id AS worker_id,
  w.name AS worker_name,
  w.phone AS worker_phone,
  -- Franchisee details
  f.id AS franchisee_id,
  f.name AS franchisee_name,
  f.phone AS franchisee_phone,
  fr.mpk_number AS franchisee_mpk_number,
  fr.store_address AS franchisee_store_address
FROM reservations r
JOIN users f ON r.franchisee_id = f.id
LEFT JOIN users w ON r.worker_id = w.id
LEFT JOIN franchisees fr ON f.id = fr.id;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'Stores all users (admin, worker, franchisee)';
COMMENT ON TABLE worker_shifts IS 'Stores worker shift assignments';
COMMENT ON TABLE custom_shift_hours IS 'Stores custom hours for CUST shift types';
COMMENT ON TABLE franchisees IS 'Stores franchisee-specific information';
COMMENT ON TABLE reservations IS 'Stores reservation records';

COMMENT ON COLUMN users.password_hash IS 'Should store bcrypt hashed passwords';
COMMENT ON COLUMN reservations.worker_id IS 'NULL if reservation is not assigned yet';

-- ============================================
-- NOTE: RLS is DISABLED in this version
-- ============================================
-- You'll need to manage permissions in your application layer
-- or enable RLS later and add appropriate policies

