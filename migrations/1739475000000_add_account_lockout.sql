-- Migration: Add Account Lockout Security Feature
-- This migration adds fields to track failed login attempts and account lockout
-- Date: 2026-02-14
--
-- Changes:
-- 1. Add failed_login_attempts counter
-- 2. Add locked_at timestamp for account lockout
-- 3. Add lock_reason for admin visibility

-- ============================================
-- ADD ACCOUNT LOCKOUT FIELDS
-- ============================================

-- Add failed login attempts counter
ALTER TABLE users
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL;

-- Add locked timestamp (NULL = not locked)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- Add lock reason for admin review
ALTER TABLE users
ADD COLUMN IF NOT EXISTS lock_reason VARCHAR(255);

-- ============================================
-- CREATE INDEX FOR LOCKED ACCOUNTS
-- ============================================

-- Index for finding locked accounts (admin queries)
CREATE INDEX IF NOT EXISTS idx_users_locked_at ON users(locked_at) WHERE locked_at IS NOT NULL;

-- ============================================
-- ACCOUNT LOCKOUT POLICY
-- ============================================

-- Policy (enforced in application code):
-- 1. Failed login attempts increment on wrong password
-- 2. Account locks after 10 failed attempts
-- 3. Lock reason: "Too many failed login attempts"
-- 4. Auto-unlock after 30 minutes OR admin manual unlock
-- 5. Successful login resets failed_login_attempts to 0
-- 6. Rate limiting (IP-based) still applies independently

-- ============================================
-- VERIFICATION
-- ============================================

-- This migration ensures:
-- 1. All users have lockout tracking fields
-- 2. Existing users start with 0 failed attempts
-- 3. No users are locked by default
-- 4. Admins can query locked accounts efficiently
