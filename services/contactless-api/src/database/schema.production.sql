-- ============================================================================
-- Sharon Contactless Multi-Outlet QR Ordering — Production Master Schema
-- Single-Page Clean DDL (CREATE ONLY, strict UTC TIMESTAMPTZ, zero ALTERs)
-- MUST remain 100% column-identical with schema.development.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Business ID Sequences (Concurrency-Safe per TECH_STACK_MASTER.md Section 26)
CREATE SEQUENCE IF NOT EXISTS seq_outlet_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_user_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_order_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_payment_txn_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_qr_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_menu_sync_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_customer_business_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_push_token_business_id START 1;

-- 1. Outlets
CREATE TABLE IF NOT EXISTS outlets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    image_url TEXT,
    operating_hours VARCHAR(255) NOT NULL DEFAULT '6:00 AM - 11:00 PM',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_ordering_enabled BOOLEAN NOT NULL DEFAULT true,
    customer_auth_mode VARCHAR(50) NOT NULL DEFAULT 'DIRECT_GUEST' CHECK (customer_auth_mode IN ('DIRECT_GUEST', 'OTP_VERIFIED')),
    require_customer_phone BOOLEAN NOT NULL DEFAULT true,
    require_customer_name BOOLEAN NOT NULL DEFAULT true,
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'DEMO_UPI_INTENT' CHECK (payment_provider IN ('DEMO_UPI_INTENT', 'RAZORPAY', 'CASHFREE')),
    demo_auto_verify_payment BOOLEAN NOT NULL DEFAULT false,
    upi_vpa VARCHAR(255) NOT NULL DEFAULT 'paytm.s211ne7@pty',
    upi_payee_name VARCHAR(255) NOT NULL DEFAULT 'MUNISWAMY JOSHVA',
    estimated_prep_time_minutes INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Staff Users & Roles (MD vs Branch Staff)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('MD', 'OUTLET_STAFF')),
    outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Master Categories & Menu Items (Synced via REST from main website + local snacks)
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_main_id VARCHAR(255),
    category_slug VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_vegetarian BOOLEAN NOT NULL DEFAULT true,
    is_bestseller BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Outlet-Level Stock & Price Overrides
CREATE TABLE IF NOT EXISTS outlet_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    is_available BOOLEAN NOT NULL DEFAULT true,
    custom_price DECIMAL(10, 2),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_outlet_menu_item UNIQUE (outlet_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_outlet_menu_items ON outlet_menu_items(outlet_id, is_available);

-- 5. Beverage Modifiers (Sugar, Strength, Add-ons)
CREATE TABLE IF NOT EXISTS modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    display_type VARCHAR(50) NOT NULL DEFAULT 'RADIO' CHECK (display_type IN ('RADIO', 'CHECKBOX')),
    is_required BOOLEAN NOT NULL DEFAULT false,
    min_selection INT NOT NULL DEFAULT 0,
    max_selection INT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modifier_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price_extra DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_modifier_option_group_name UNIQUE (group_id, name)
);

-- 6. Customers (Optional Saved Profile & Order History)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    last_outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 7. Customer Orders (Canonical UTC Timestamps)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL,
    payment_transaction_id VARCHAR(50) UNIQUE,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    table_or_token VARCHAR(50),
    items JSONB NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'DEMO_UPI_INTENT',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PAYMENT_PENDING' CHECK (payment_status IN ('PAYMENT_PENDING', 'UPI_CLAIMED_DEMO', 'PAID_VERIFIED', 'REFUNDED')),
    payment_reference VARCHAR(255),
    order_status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED' CHECK (order_status IN ('RECEIVED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_outlet_status ON orders(outlet_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id, created_at DESC);

-- 7. Concurrency-Safe Per-Outlet Counter Tokens (#SH-<CODE>-<SEQ>)
CREATE TABLE IF NOT EXISTS outlet_order_counters (
    outlet_id UUID PRIMARY KEY REFERENCES outlets(id) ON DELETE CASCADE,
    outlet_code VARCHAR(16) NOT NULL,
    last_sequence INT NOT NULL DEFAULT 100,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. QR Master (Token Management & Standees)
CREATE TABLE IF NOT EXISTS outlet_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL,
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    qr_token VARCHAR(255) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL DEFAULT 'Counter Standee',
    is_active BOOLEAN NOT NULL DEFAULT true,
    scans_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Menu Sync Audit Log
CREATE TABLE IF NOT EXISTS menu_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL,
    synced_by UUID REFERENCES users(id) ON DELETE SET NULL,
    items_synced INT NOT NULL,
    source_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. FCM Web Push Notification Device Tokens
CREATE TABLE IF NOT EXISTS push_notification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(50) UNIQUE NOT NULL,
    fcm_token TEXT UNIQUE NOT NULL,
    target_role VARCHAR(20) NOT NULL CHECK (target_role IN ('CUSTOMER', 'STAFF')),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_phone VARCHAR(50),
    order_business_id VARCHAR(50),
    platform VARCHAR(30) NOT NULL DEFAULT 'WEB_PWA',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_staff_outlet ON push_notification_tokens(target_role, outlet_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_tokens_customer ON push_notification_tokens(target_role, order_business_id, customer_id, customer_phone, is_active);
