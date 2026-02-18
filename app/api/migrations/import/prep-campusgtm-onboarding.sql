-- CampusGTM Team Onboarding Preparation Script
-- =============================================
-- 
-- PURPOSE: Prepare the workspace so that when real team members are invited
-- and accept their invitations, they automatically get all their pre-assigned
-- tasks and rocks.
--
-- HOW IT WORKS:
-- 1. Updates placeholder user emails to real team member emails
-- 2. Sets org_members status to "invited" (so invitation acceptance works)
-- 3. When you send invitations through the platform UI to these emails,
--    the invitation acceptance flow will:
--    a) Find the existing user by email match
--    b) Update the org membership to "active"
--    c) Create a session (so the user is logged in)
--    d) All tasks/rocks are already assigned to this user_id
--
-- INSTRUCTIONS:
-- 1. Replace the placeholder emails below with REAL team member emails
-- 2. Run this script against the database
-- 3. Go to Settings > Members in the app
-- 4. Send invitations to each real email address
-- 5. Team members click the invite link and set their password
--
-- IMPORTANT: The invitation flow will find the existing user record,
-- so tasks assigned to that user_id will be immediately visible.
-- Team members can change their password via Settings after logging in.

-- ============================================
-- STEP 1: UPDATE PLACEHOLDER EMAILS TO REAL EMAILS
-- ============================================
-- >>> REPLACE these with actual team member email addresses <<<

UPDATE users SET email = 'will_real_email@example.com', updated_at = NOW()
WHERE id = 'usr_campus_will';

UPDATE users SET email = 'anusha_real_email@example.com', updated_at = NOW()
WHERE id = 'usr_campus_anusha';

UPDATE users SET email = 'arshia_real_email@example.com', updated_at = NOW()
WHERE id = 'usr_campus_arshia';

UPDATE users SET email = 'logan_real_email@example.com', updated_at = NOW()
WHERE id = 'usr_campus_logan';

-- ============================================
-- STEP 2: UPDATE ORG MEMBERS TO "INVITED" STATUS
-- ============================================
-- This ensures the invitation acceptance flow doesn't reject with
-- "already a member" error. It will find these records and update
-- them to "active" when the invitation is accepted.

UPDATE organization_members
SET status = 'invited', updated_at = NOW()
WHERE organization_id = 'd7132bd08ff71e079ff53f93'
  AND user_id IN ('usr_campus_will', 'usr_campus_anusha', 'usr_campus_arshia', 'usr_campus_logan');

-- Also update the email on org_members to match
UPDATE organization_members SET email = (SELECT email FROM users WHERE id = organization_members.user_id)
WHERE organization_id = 'd7132bd08ff71e079ff53f93'
  AND user_id IN ('usr_campus_will', 'usr_campus_anusha', 'usr_campus_arshia', 'usr_campus_logan');

-- ============================================
-- VERIFICATION
-- ============================================
SELECT u.name, u.email, om.status, om.role
FROM users u
JOIN organization_members om ON om.user_id = u.id
WHERE om.organization_id = 'd7132bd08ff71e079ff53f93'
  AND u.id IN ('usr_campus_will', 'usr_campus_anusha', 'usr_campus_arshia', 'usr_campus_logan');
