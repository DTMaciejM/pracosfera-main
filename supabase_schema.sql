-- ============================================
-- PRACOSFERA - Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- This table stores all users (admin, worker, franchisee)
-- Note: If using Supabase Auth, you might want to link this to auth.users
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
-- Stores worker shift assignments (Z-1, Z-2, Z-3, CUST, WOLNY)
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
-- Stores custom hours for CUST shift types
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
-- FRANCHISEES TABLE (denormalized for easier queries)
-- ============================================
-- This is a view-like table that stores franchisee-specific data
-- Alternatively, you can query users table with role='franchisee'
-- Keeping it separate for clarity and performance
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_shift_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchisees ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Users policies
-- Admins can see all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users can view their own data
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Admins can insert users
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can update users
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users can update their own data (except role)
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));

-- Worker shifts policies
CREATE POLICY "Workers can view own shifts"
  ON worker_shifts FOR SELECT
  USING (worker_id = auth.uid());

CREATE POLICY "Admins can view all shifts"
  ON worker_shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage shifts"
  ON worker_shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Custom shift hours policies
CREATE POLICY "Workers can view own custom hours"
  ON custom_shift_hours FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM worker_shifts ws
      WHERE ws.id = custom_shift_hours.worker_shift_id
      AND ws.worker_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage custom hours"
  ON custom_shift_hours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Franchisees policies
CREATE POLICY "Franchisees can view own data"
  ON franchisees FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all franchisees"
  ON franchisees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage franchisees"
  ON franchisees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Reservations policies
CREATE POLICY "Workers can view assigned reservations"
  ON reservations FOR SELECT
  USING (worker_id = auth.uid());

CREATE POLICY "Franchisees can view own reservations"
  ON reservations FOR SELECT
  USING (franchisee_id = auth.uid());

CREATE POLICY "Admins can view all reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Franchisees can create reservations"
  ON reservations FOR INSERT
  WITH CHECK (franchisee_id = auth.uid());

CREATE POLICY "Admins can manage reservations"
  ON reservations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

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
-- INITIAL DATA (Optional - for testing)
-- ============================================
-- Note: Passwords should be hashed using bcrypt or similar
-- Example: password_hash = crypt('admin123', gen_salt('bf'))

-- You can insert initial data here if needed
-- Remember to hash passwords properly!

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

