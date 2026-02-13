# Manual Testing Checklist for TaskSpace
**Created:** February 12, 2026
**Purpose:** User acceptance testing before launch

---

## 🔐 Authentication & Authorization

### User Registration
- [ ] Can register with valid email and password
- [ ] Password strength validation works (min 8 chars, uppercase, lowercase, number)
- [ ] Cannot register with existing email
- [ ] Organization is created automatically on registration
- [ ] Default workspace is created
- [ ] User is logged in after registration

### User Login
- [ ] Can login with valid credentials
- [ ] Cannot login with invalid email
- [ ] Cannot login with incorrect password
- [ ] Session persists across page refreshes
- [ ] "Remember me" functionality works

### Logout
- [ ] Logout clears session
- [ ] Cannot access protected routes after logout
- [ ] Redirect to login page after logout

---

## 👥 Workspace Management

### Workspace Creation
- [ ] Can create new workspace
- [ ] Workspace name is required
- [ ] Creator is added as workspace owner
- [ ] Workspace inherits org branding colors
- [ ] Workspace appears in workspace switcher

### Workspace Switching
- [ ] Can switch between workspaces via sidebar switcher
- [ ] Data changes when switching workspaces (rocks, tasks, EOD)
- [ ] Workspace name displays correctly in header
- [ ] Branding colors update when switching workspaces

### Workspace Settings
- [ ] Can update workspace name
- [ ] Can update workspace branding colors
- [ ] Can add/remove workspace members
- [ ] Can change member roles (viewer, member, admin, owner)
- [ ] Only admins/owners can access workspace settings

---

## 🎯 Rocks Management

### Rock Creation
- [ ] Can create new rock with title
- [ ] Can add description to rock
- [ ] Can assign rock to team member
- [ ] Can set due date
- [ ] Can set priority (high, medium, low)
- [ ] Rock appears in rocks list immediately

### Rock Editing
- [ ] Can edit rock title
- [ ] Can edit rock description
- [ ] Can reassign rock to different member
- [ ] Can change due date
- [ ] Can change priority
- [ ] Changes save correctly

### Rock Completion
- [ ] Can mark rock as complete
- [ ] Completed rocks move to "Completed" section
- [ ] Can unmark rock as complete
- [ ] Completion status persists

### Rock Details
- [ ] Can view rock details page
- [ ] Can add check-ins to rock
- [ ] Can view rock history/activity
- [ ] Can delete rock (admin only)

---

## ✅ Tasks Management

### Task Creation
- [ ] Can create new task
- [ ] Can add task description
- [ ] Can assign task to team member
- [ ] Can set due date
- [ ] Can set priority
- [ ] Can create subtasks

### Task Editing
- [ ] Can edit task title
- [ ] Can edit task description
- [ ] Can reassign task
- [ ] Can change due date
- [ ] Can reorder subtasks

### Task Completion
- [ ] Can mark task as complete
- [ ] Can mark subtasks as complete
- [ ] Completed tasks show completion status
- [ ] Can unmark task as complete

### Bulk Operations
- [ ] Can select multiple tasks
- [ ] Can bulk complete tasks
- [ ] Can bulk reassign tasks
- [ ] Can bulk delete tasks

---

## 📝 End of Day (EOD) Reports

### EOD Submission
- [ ] Can submit EOD report
- [ ] All required fields validated
- [ ] Cannot submit duplicate EOD for same day
- [ ] EOD appears in reports list immediately
- [ ] Mood/energy level captured correctly

### EOD Viewing
- [ ] Can view own EOD reports
- [ ] Can view team EOD reports
- [ ] Can filter by date range
- [ ] Can filter by team member
- [ ] Reports display correctly

---

## 📊 Scorecard

### Scorecard Management
- [ ] Can create scorecard metrics
- [ ] Can add weekly values
- [ ] Can view trends
- [ ] Can set targets (green/yellow/red thresholds)
- [ ] Charts display correctly

---

## 🤝 L10 Meetings

### Meeting Creation
- [ ] Can create L10 meeting
- [ ] Can set meeting date/time
- [ ] Can add attendees
- [ ] Meeting appears in meetings list

### Meeting Execution
- [ ] Can start meeting
- [ ] Can navigate through sections (Scorecard, Rocks, Headlines, Todos, IDS, Conclude)
- [ ] Can add meeting notes
- [ ] Can create todos from meeting
- [ ] Can end meeting

---

## ⚙️ Settings

### Organization Settings
- [ ] Can update org name
- [ ] Can update org logo
- [ ] Can update timezone
- [ ] Can update primary/secondary/accent colors
- [ ] Color changes reflect immediately in UI
- [ ] Only admins can update org settings

### User Profile
- [ ] Can update display name
- [ ] Can update email
- [ ] Can update password
- [ ] Can upload avatar
- [ ] Changes persist correctly

### Team Management
- [ ] Can view team members
- [ ] Can invite new members
- [ ] Can change member roles
- [ ] Can remove members
- [ ] Only admins can manage team

---

## 📱 Mobile Responsiveness

### Navigation
- [ ] Sidebar collapses on mobile
- [ ] Hamburger menu works
- [ ] All pages accessible on mobile
- [ ] No horizontal scrolling

### Dashboard
- [ ] Cards stack vertically on mobile
- [ ] Charts resize appropriately
- [ ] No content overflow

### Forms
- [ ] Input fields are touch-friendly
- [ ] Date pickers work on mobile
- [ ] Dropdowns work correctly
- [ ] Submit buttons are accessible

### Tables/Lists
- [ ] Tables are scrollable horizontally if needed
- [ ] List items are touch-friendly
- [ ] Actions are accessible

---

## 🔔 Notifications

### In-App Notifications
- [ ] Notification bell shows unread count
- [ ] Clicking bell shows notification dropdown
- [ ] Can mark notifications as read
- [ ] Can view all notifications
- [ ] Notifications link to relevant items

### Email Notifications
- [ ] Welcome email sent on registration
- [ ] Rock assigned email sent
- [ ] Task assigned email sent
- [ ] EOD reminder email sent (if not submitted by 5pm)
- [ ] Email links work correctly
- [ ] Unsubscribe link works

---

## 🎨 Branding & Theming

### Organization Branding
- [ ] Org colors apply across entire app
- [ ] Logo displays in header
- [ ] Colors cascade to workspaces as defaults

### Workspace Branding
- [ ] Workspace can override org colors
- [ ] Workspace colors update when switching
- [ ] Color picker works correctly
- [ ] Changes reflect immediately

---

## 🔒 Security

### Authentication Security
- [ ] Cannot access protected routes without login
- [ ] Session expires after inactivity
- [ ] Password requirements enforced
- [ ] Rate limiting prevents brute force

### Authorization
- [ ] Viewers cannot edit data
- [ ] Members can edit own data
- [ ] Admins can manage workspace
- [ ] Owners can delete workspace
- [ ] Cannot access other organization's data

### Data Isolation
- [ ] Workspaces are isolated from each other
- [ ] Organizations are isolated from each other
- [ ] Users only see their organization's data
- [ ] API endpoints enforce workspace scoping

---

## ⚡ Performance

### Page Load Times
- [ ] Dashboard loads in < 2 seconds
- [ ] Rocks page loads in < 2 seconds
- [ ] Tasks page loads in < 2 seconds
- [ ] Settings loads in < 2 seconds

### Interactions
- [ ] Forms submit quickly (< 1 second)
- [ ] Lists filter/search instantly
- [ ] Workspace switching is smooth
- [ ] No UI freezing or lag

---

## 🐛 Error Handling

### Form Validation
- [ ] Required fields show error messages
- [ ] Invalid data shows appropriate errors
- [ ] Errors are user-friendly

### Network Errors
- [ ] API errors show user-friendly messages
- [ ] Failed requests can be retried
- [ ] Loading states shown during requests

### Edge Cases
- [ ] Empty states display correctly
- [ ] Large data sets handle gracefully
- [ ] Deleted items handled correctly
- [ ] Permission errors show appropriate messages

---

## ✅ User Ready Criteria

Platform is considered **user-ready** when:
- [ ] All critical flows work (auth, workspaces, rocks, tasks, EOD)
- [ ] Mobile responsive (no layout issues on phones/tablets)
- [ ] Email notifications working
- [ ] Security implemented (HTTPS, headers, sanitization)
- [ ] Performance acceptable (< 2s page loads)
- [ ] No critical bugs
- [ ] Data properly isolated between workspaces/orgs
- [ ] Branding system working (colors cascade correctly)

---

**Last Updated:** February 12, 2026
**Status:** In Progress - Complete during BATCH 1-5 testing
