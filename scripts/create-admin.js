 
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Generate a secure random password
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const length = 16;
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
};

const password = generatePassword();
const hash = bcrypt.hashSync(password, 12);

// Generate UUIDs
const userId = crypto.randomUUID();
const orgId = crypto.randomUUID();
const memberId = crypto.randomUUID();

console.log(`-- Admin User Setup SQL`);
console.log(`-- User ID: ${userId}`);
console.log(`-- Org ID: ${orgId}`);
console.log(`-- Generated Password: ${password}`);
console.log(`-- IMPORTANT: Save this password securely - it will not be shown again!\n`);

console.log(`INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at) VALUES ('${userId}', 'admin@aimseod.local', '${hash}', 'Admin User', true, NOW(), NOW());`);
console.log(`INSERT INTO organizations (id, name, slug, owner_id, settings, subscription, created_at, updated_at) VALUES ('${orgId}', 'My Organization', 'my-org', '${userId}', '{"timezone": "America/New_York", "weekStartDay": 1}', '{"plan": "professional", "status": "active", "currentPeriodEnd": "2099-12-31", "maxUsers": 100, "features": ["ai-insights", "email-notifications"]}', NOW(), NOW());`);
console.log(`INSERT INTO organization_members (id, organization_id, user_id, email, name, role, department, status, joined_at) VALUES ('${memberId}', '${orgId}', '${userId}', 'admin@aimseod.local', 'Admin User', 'owner', 'Operations', 'active', NOW());`);
