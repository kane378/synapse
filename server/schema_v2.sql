-- FILE: server/schema_v2.sql
-- Synapse V2 — Run this AFTER schema.sql to add new tables

-- Delivery tracking table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  delivery_method VARCHAR(50) NOT NULL CHECK (delivery_method IN ('self_pickup', 'hospital_vehicle', 'porter', 'shadowfax', 'dunzo', 'licensed_distributor')),
  tracking_id VARCHAR(100),
  agent_name VARCHAR(255),
  agent_phone VARCHAR(20),
  pickup_address TEXT,
  delivery_address TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Packed', 'PickedUp', 'InTransit', 'Delivered', 'Failed')),
  estimated_delivery TIMESTAMPTZ,
  packed_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  temperature_log TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_transfer_id UUID REFERENCES transfers(id),
  related_inventory_id UUID REFERENCES inventory(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfer certificates table
CREATE TABLE IF NOT EXISTS transfer_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES transfers(id),
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  providing_hospital_sign BOOLEAN DEFAULT FALSE,
  requesting_hospital_sign BOOLEAN DEFAULT FALSE,
  gst_amount DECIMAL(10,2),
  total_value DECIMAL(10,2),
  form10_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_transfer ON deliveries(transfer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_hospital ON notifications(hospital_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_certificates_transfer ON transfer_certificates(transfer_id);
