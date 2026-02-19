# Email Notifications System - TaskSpace
**Last Updated:** February 12, 2026
**Status:** ✅ Production Ready

---

## Overview

TaskSpace uses **Resend** for transactional email delivery with beautiful, modern HTML templates. All emails include unsubscribe links and proper branding.

---

## ✅ IMPLEMENTED EMAIL TRIGGERS

### 1. Welcome Email
**Trigger:** User signs up for a new account
**Function:** `sendWelcomeEmail(user, organization)`
**Template:** Modern gradient design with feature overview
**CTA:** "Go to Dashboard"

**Features:**
- Welcome message personalized with user's first name
- Organization name displayed
- Feature highlights (EOD, Rocks, Tasks, Scorecard, L10 Meetings)
- Link to help center
- Unsubscribe link in footer

---

### 2. Invitation Email
**Trigger:** Admin invites new team member
**Function:** `sendInvitationEmail(invitation, organization, inviterName)`
**Template:** Clean card design with invitation details
**CTA:** "Accept Invitation"

**Features:**
- Displays inviter's name
- Shows organization details
- Role and department information
- 7-day expiration notice
- Secure invitation token in link

---

### 3. Email Verification
**Trigger:** New user needs to verify email
**Function:** `sendVerificationEmail(verificationToken, userName)`
**Template:** Branded verification design
**CTA:** "Verify Email Address"

**Features:**
- Personalized greeting
- 24-hour expiration notice
- Security notice for unwanted emails
- Verification token in link

---

### 4. Rock Assigned
**Trigger:** Rock is assigned to a team member
**Function:** `sendRockAssignedEmail(rock, assignedTo, assignedBy, organization)`
**Template:** Green gradient design emphasizing goals
**CTA:** "View Rock Details"

**Features:**
- Rock title and description
- Assigned by name
- Due date with full formatting
- Priority level (when available)
- Direct link to rock detail page
- Unsubscribe link

---

### 5. Task Assigned
**Trigger:** Task is assigned to a team member
**Function:** `sendTaskAssignedEmail(task, assignedTo, assignedBy, organization)`
**Template:** Orange/amber design for actionable items
**CTA:** "View Task"

**Features:**
- Task title and description
- Assigned by name
- Due date (if set)
- Direct link to task page
- Unsubscribe link

---

### 6. EOD Reminder
**Trigger:** Cron job runs daily to remind users who haven't submitted EOD
**Function:** `sendEODReminder(user, organization)`
**Template:** Amber alert design
**CTA:** "Submit EOD Report"

**Features:**
- Friendly reminder tone
- Encourages reflection and planning
- Direct link to submission page
- Unsubscribe link

---

### 7. Rock Deadline Approaching
**Trigger:** Rock due date is within configured threshold (default: 3 days)
**Function:** `sendRockDeadlineEmail(rock, owner, organization, daysRemaining)`
**Template:** Red/warning design for urgency
**CTA:** "Review Progress"

**Features:**
- Prominent deadline badge
- Days remaining countdown
- Full due date
- Encourages action or escalation
- Direct link to rock page
- Unsubscribe link

---

### 8. EOD Escalation Notification
**Trigger:** User flags an issue that needs admin attention
**Function:** `sendEscalationNotification(eodReport, submittedBy, organization)`
**Template:** Alert-style design for admins
**Sent to:** Admin email (configured in env)

**Features:**
- Red alert styling
- Escalation note highlighted
- Team member details
- Challenge description
- Date and time stamps

---

### 9. EOD Report Notification
**Trigger:** EOD report is submitted
**Function:** `sendEODNotification(eodReport, submittedBy, rocks, organization)`
**Template:** Detailed report format
**Sent to:** Admin email (configured in env)

**Features:**
- Rock progress updates
- Tasks completed by rock
- Tomorrow's priorities
- Challenges section
- Escalation alerts
- Professional report layout

---

### 10. Password Reset
**Trigger:** User requests password reset
**Function:** `sendPasswordResetEmail(resetToken, userName)`
**Template:** Red security-themed design
**CTA:** "Reset Password"

**Features:**
- Security-focused messaging
- 1-hour expiration warning
- Security notice for unwanted resets
- One-time use token
- Link fallback for accessibility

---

## 📧 EMAIL CONFIGURATION

### Environment Variables
```bash
# Required for email sending
RESEND_API_KEY=re_xxxxxxxxxxxx

# Email sender (must be verified domain in Resend)
EMAIL_FROM="Taskspace <team@trytaskspace.com>"

# Admin notification recipient
ADMIN_EMAIL="team@trytaskspace.com"

# Application URL for links
NEXT_PUBLIC_APP_URL="https://trytaskspace.com"
```

### Resend Setup
1. Sign up at [resend.com](https://resend.com)
2. Verify your sending domain
3. Generate API key
4. Add API key to `.env.local`

---

## 🎨 EMAIL TEMPLATE DESIGN

### Design System
- **Font:** System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto)
- **Spacing:** Consistent padding (20px, 30px)
- **Border Radius:** Modern rounded corners (8px, 12px)
- **Colors:** Gradient headers with brand-specific themes
- **Layout:** Centered container (max-width: 600px)
- **Mobile:** Responsive design with proper viewport

### Template Components
- **Header:** Gradient background with title and subtitle
- **Content Box:** Highlighted information boxes with dashed borders
- **CTA Buttons:** Large, accessible buttons with hover states
- **Details Sections:** Structured rows for metadata
- **Footer:** Organization branding and unsubscribe link

### Security
- All user-generated content escaped with `escapeHtml()` function
- Prevents XSS attacks in email templates
- Safe rendering of names, titles, descriptions

---

## 🚫 UNSUBSCRIBE SYSTEM

### Unsubscribe Link Pattern
Every notification email includes:
```html
<a href="https://trytaskspace.com/unsubscribe?email=user@example.com">
  Unsubscribe from notifications
</a>
```

### Unsubscribe API
**Endpoint:** `GET /api/unsubscribe?email=user@example.com`

**Flow:**
1. User clicks unsubscribe link in email
2. API verifies email exists
3. Shows branded unsubscribe confirmation page
4. User can re-enable in settings

**Future Enhancement:**
- Granular preferences (per-notification-type)
- Preference storage in database
- User settings page integration

---

## 📬 EMAIL DELIVERY

### Retry Logic
- Automatic retry on transient failures (5xx, 429 rate limits)
- Max 3 attempts with exponential backoff
- Initial delay: 1 second
- No retry on client errors (4xx except 429)

### Error Handling
- Graceful degradation when email not configured
- Logged warnings for debugging
- Doesn't block application flow if email fails
- Returns success/error status for caller handling

### Performance
- Async email sending (doesn't block API responses)
- Configurable via environment variables
- Lightweight HTML templates (< 10KB each)

---

## 🚀 USAGE EXAMPLES

### Send Welcome Email
```typescript
import { sendWelcomeEmail } from '@/lib/email'

// After user registration
await sendWelcomeEmail(newUser, organization)
```

### Send Rock Assignment
```typescript
import { sendRockAssignedEmail } from '@/lib/email'

// After assigning rock to user
await sendRockAssignedEmail(
  rock,
  assignedToUser,
  currentUser,
  organization
)
```

### Send Deadline Reminder
```typescript
import { sendRockDeadlineEmail } from '@/lib/email'

// In cron job checking upcoming deadlines
const daysRemaining = 3
await sendRockDeadlineEmail(
  rock,
  rockOwner,
  organization,
  daysRemaining
)
```

---

## 📋 FUTURE ENHANCEMENTS

### Planned Features (Not Blocking)
1. **Email Preferences Page:**
   - Granular notification controls
   - Per-type opt-in/opt-out
   - Frequency settings (instant, daily digest, weekly)

2. **Mentioned in Comments:**
   - @mention detection in comments
   - Notification email with comment context
   - Link to comment location

3. **Weekly Digest:**
   - Rollup of activity for the week
   - Team performance summary
   - Upcoming deadlines and meetings

4. **Meeting Reminders:**
   - L10 meeting starting soon notifications
   - Agenda preview in email
   - Quick links to join

5. **Analytics:**
   - Email open rates (if using tracking pixels)
   - Click-through rates on CTAs
   - Unsubscribe rate monitoring

---

## ✅ PRODUCTION CHECKLIST

- [x] Resend API configured
- [x] Email templates tested
- [x] Unsubscribe links in all emails
- [x] Unsubscribe API endpoint created
- [x] Error handling and retry logic
- [x] HTML escaping for security
- [x] Mobile-responsive templates
- [x] Proper sender domain verified
- [x] Admin notification email configured
- [x] Application URL configured

---

## 📊 EMAIL STATUS MATRIX

| Email Type | Status | Trigger | Frequency | Priority |
|------------|--------|---------|-----------|----------|
| Welcome | ✅ Ready | Signup | Once | High |
| Invitation | ✅ Ready | Invite | Per invite | High |
| Email Verification | ✅ Ready | Signup | Once | High |
| Rock Assigned | ✅ Ready | Assignment | Per rock | High |
| Task Assigned | ✅ Ready | Assignment | Per task | High |
| EOD Reminder | ✅ Ready | Cron (daily) | Daily | High |
| Rock Deadline | ✅ Ready | Cron (check) | Per deadline | High |
| EOD Escalation | ✅ Ready | Flag | Per escalation | High |
| EOD Report | ✅ Ready | Submission | Per report | Medium |
| Password Reset | ✅ Ready | Request | On demand | High |
| Mentioned in Comment | 🚧 Future | Comment | Per mention | Medium |
| Weekly Digest | 🚧 Future | Cron (weekly) | Weekly | Low |

---

**Email System Status:** ✅ Production Ready
**Next Steps:** Monitor delivery rates and user feedback
