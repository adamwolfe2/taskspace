const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Generate a secure password hash
const password = 'Admin123!';  // Default password - user should change this
const hash = bcrypt.hashSync(password, 12);

// Generate UUIDs
const userId = crypto.randomUUID();
const orgId = crypto.randomUUID();
const memberId = crypto.randomUUID();

console.log(`-- Admin User Setup SQL`);
console.log(`-- User ID: ${userId}`);
console.log(`-- Org ID: ${orgId}`);
console.log(`-- Default Password: ${password}`);
console.log(`-- Please change the password after first login!\n`);

console.log(`INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at) VALUES ('${userId}', 'admin@aimseod.local', '${hash}', 'Admin User', true, NOW(), NOW());`);
console.log(`INSERT INTO organizations (id, name, slug, owner_id, settings, subscription, created_at, updated_at) VALUES ('${orgId}', 'My Organization', 'my-org', '${userId}', '{"timezone": "America/New_York", "weekStartDay": 1}', '{"plan": "professional", "status": "active", "currentPeriodEnd": "2099-12-31", "maxUsers": 100, "features": ["ai-insights", "email-notifications"]}', NOW(), NOW());`);
console.log(`INSERT INTO organization_members (id, organization_id, user_id, email, name, role, department, status, joined_at) VALUES ('${memberId}', '${orgId}', '${userId}', 'admin@aimseod.local', 'Admin User', 'owner', 'Operations', 'active', NOW());`);
