# AIMS EOD Dashboard - Comprehensive Feature Implementation Plan

## Overview
This plan covers all UI/UX improvements, new features, code quality enhancements, and quick wins while preserving existing functionality.

**Branch**: `claude/continue-aims-eod-dashboard-LipHl`
**Approach**: Incremental implementation with testing at each stage

---

## Phase 1: Foundation & Code Quality (Prevents Breaking Changes)

### 1.1 Split Large Components
- [ ] Split Settings page (1,811 lines) into sub-components
- [ ] Split Admin Team page (856 lines) into sub-components
- [ ] Create shared component patterns

### 1.2 Add React Query for Data Fetching
- [ ] Install @tanstack/react-query
- [ ] Create query hooks for all API endpoints
- [ ] Implement optimistic updates
- [ ] Add proper cache invalidation

### 1.3 Error Boundaries
- [ ] Create granular ErrorBoundary components
- [ ] Wrap each dashboard section
- [ ] Add fallback UI components

### 1.4 Loading States
- [ ] Expand skeleton components
- [ ] Add skeletons for all list views
- [ ] Add shimmer effects

---

## Phase 2: Database Schema Updates

### 2.1 New Tables Required
- [ ] `focus_sessions` - Deep work tracking
- [ ] `task_subtasks` - Subtask support
- [ ] `time_entries` - Time tracking
- [ ] `weekly_reviews` - Personal weekly reviews
- [ ] `achievements` - Gamification badges
- [ ] `user_achievements` - User earned achievements
- [ ] `rock_dependencies` - Rock relationships
- [ ] `dashboard_layouts` - Widget customization
- [ ] `recent_items` - Recently viewed items

### 2.2 Schema Modifications
- [ ] Add `parent_task_id` to assigned_tasks for subtasks
- [ ] Add `estimated_hours` and `actual_hours` to assigned_tasks
- [ ] Add `mood` field to eod_reports if not exists
- [ ] Add `dashboard_preferences` JSONB to organization_members

---

## Phase 3: Quick Wins (High Impact, Low Effort)

### 3.1 Empty States
- [ ] Create EmptyState component with illustrations
- [ ] Add to task list
- [ ] Add to rock list
- [ ] Add to EOD history
- [ ] Add to notifications

### 3.2 Keyboard Shortcuts Help
- [ ] Create KeyboardShortcutsDialog component
- [ ] Register `?` shortcut to open
- [ ] Document all existing shortcuts
- [ ] Add visual hints in UI

### 3.3 Relative Dates
- [ ] Create formatRelativeDate utility
- [ ] Update task cards to show relative dates
- [ ] Add "Due in X days" badges
- [ ] Color code by urgency

### 3.4 Due Date Quick Set
- [ ] Add quick date buttons to date picker
- [ ] "Today", "Tomorrow", "Next Week", "Next Month"
- [ ] Smart defaults based on context

### 3.5 Confetti on Completions
- [ ] Install canvas-confetti
- [ ] Trigger on task completion
- [ ] Trigger on rock completion
- [ ] Trigger on streak milestones

### 3.6 Recent Items
- [ ] Create useRecentItems hook
- [ ] Track task/rock views in localStorage
- [ ] Add Recent section to command palette
- [ ] Show in dashboard sidebar

### 3.7 Search Improvements
- [ ] Add type filters to command palette
- [ ] Add assignee filter
- [ ] Add date range filter
- [ ] Improve fuzzy matching

---

## Phase 4: Dashboard Enhancements

### 4.1 Quick Actions Row
- [ ] Create QuickActionsBar component
- [ ] Add "Submit EOD" action
- [ ] Add "Add Task" action
- [ ] Add "Update Rock" action
- [ ] Add "Start Focus" action

### 4.2 Progress Ring Visualization
- [ ] Create ProgressRing component (SVG-based)
- [ ] Replace linear progress bars on rocks
- [ ] Add animation on load
- [ ] Show percentage in center

### 4.3 Focus of the Day Section
- [ ] Create FocusOfTheDay component
- [ ] Algorithm to prioritize tasks (due date, priority, rock deadline)
- [ ] Show top 3 suggested tasks
- [ ] Allow dismissing/pinning

### 4.4 Customizable Widget Layout
- [ ] Install react-grid-layout
- [ ] Create DashboardWidget wrapper
- [ ] Make all dashboard sections into widgets
- [ ] Save layout preferences to DB
- [ ] Add "Customize Dashboard" mode

---

## Phase 5: Weekly EOD Calendar Improvements

### 5.1 Hover Preview
- [ ] Create EODPreviewTooltip component
- [ ] Show accomplishments count
- [ ] Show mood emoji
- [ ] Show escalation indicator

### 5.2 Click to View/Edit
- [ ] Make calendar days clickable
- [ ] Open EOD detail modal on click
- [ ] Allow editing past EODs (within time limit)
- [ ] Quick submit for current day

### 5.3 Mood Trend Line
- [ ] Create MoodTrendLine component
- [ ] Extract mood data from EOD reports
- [ ] Small sparkline visualization
- [ ] Color gradient based on mood

---

## Phase 6: Task List UX Improvements

### 6.1 Inline Editing
- [ ] Create InlineEditableText component
- [ ] Apply to task titles
- [ ] Apply to task descriptions
- [ ] Save on blur/enter

### 6.2 Batch Actions
- [ ] Add checkbox to task cards
- [ ] Create BatchActionsToolbar component
- [ ] Implement bulk complete
- [ ] Implement bulk priority change
- [ ] Implement bulk reassign
- [ ] Implement bulk delete

### 6.3 Due Date Grouping
- [ ] Create TaskGroupedList component
- [ ] Group by: Overdue, Today, This Week, Later, No Date
- [ ] Collapsible sections
- [ ] Count badges per section

### 6.4 Subtasks/Checklist
- [ ] Create Subtask component
- [ ] Add subtask list to task detail modal
- [ ] Progress bar based on subtask completion
- [ ] Quick add subtask input

---

## Phase 7: Admin Dashboard Polish

### 7.1 Fix Unknown Users in AI Insights
- [ ] Debug AI insights query
- [ ] Ensure proper user data joins
- [ ] Add fallback display for missing data
- [ ] Test with various data scenarios

### 7.2 Expandable Escalations
- [ ] Create ExpandableEscalation component
- [ ] Show full context on expand
- [ ] Add suggested actions
- [ ] Add "Mark Resolved" action

### 7.3 Team Heatmap
- [ ] Create TeamActivityHeatmap component
- [ ] Show 7-day activity grid per member
- [ ] Color intensity by activity level
- [ ] Tooltip with details

### 7.4 One-Click Follow-up
- [ ] Add "Send Reminder" button
- [ ] Create reminder email template
- [ ] Track reminder history
- [ ] Show last reminded date

---

## Phase 8: New Features - Focus Mode

### 8.1 Focus Session Core
- [ ] Create focus_sessions table
- [ ] Create FocusTimer component
- [ ] Pomodoro timer (25/5 intervals)
- [ ] Custom duration option

### 8.2 Focus Session UI
- [ ] Create FocusModeOverlay component
- [ ] Minimized timer in header
- [ ] Full-screen focus mode option
- [ ] Break reminders with sound

### 8.3 Focus Analytics
- [ ] Track focus time per task/rock
- [ ] Add focus hours to dashboard stats
- [ ] Weekly focus time chart
- [ ] Focus streaks

---

## Phase 9: New Features - Weekly Standup Generator

### 9.1 Standup Data Aggregation
- [ ] Create standup generation API
- [ ] Aggregate EOD accomplishments
- [ ] Extract blockers and escalations
- [ ] Group by team member

### 9.2 Standup UI
- [ ] Create StandupGenerator component
- [ ] Preview standup content
- [ ] Edit before sharing
- [ ] Multiple format options (Slack, Email, Text)

### 9.3 Automated Standup
- [ ] Scheduled standup generation (cron)
- [ ] Auto-post to Slack channel
- [ ] Email distribution option

---

## Phase 10: New Features - Rock Dependencies & Roadmap

### 10.1 Dependency Management
- [ ] Create rock_dependencies table
- [ ] Add "Blocked by" / "Blocks" UI
- [ ] Circular dependency prevention
- [ ] Dependency validation

### 10.2 Roadmap View
- [ ] Install react-calendar-timeline or similar
- [ ] Create RoadmapView component
- [ ] Timeline/Gantt visualization
- [ ] Drag to adjust dates

### 10.3 Critical Path
- [ ] Calculate critical path algorithm
- [ ] Highlight critical path rocks
- [ ] Show dependency chain

---

## Phase 11: New Features - Time Tracking

### 11.1 Time Entry Core
- [ ] Create time_entries table
- [ ] Create TimeTracker component
- [ ] Start/stop timer
- [ ] Manual time entry

### 11.2 Time on Tasks
- [ ] Add estimated_hours field
- [ ] Add actual_hours field
- [ ] Show time progress
- [ ] Variance alerts

### 11.3 Time Reports
- [ ] Create TimeReport component
- [ ] Daily/weekly/monthly views
- [ ] Export to CSV
- [ ] Utilization charts

---

## Phase 12: New Features - Personal Weekly Review

### 12.1 Weekly Review Core
- [ ] Create weekly_reviews table
- [ ] Create WeeklyReviewModal component
- [ ] Auto-populate with week's data
- [ ] Private notes section

### 12.2 Review Prompts
- [ ] "What went well" section
- [ ] "What could improve" section
- [ ] "Goals for next week" section
- [ ] Reflection insights

### 12.3 Review History
- [ ] List of past reviews
- [ ] Trend analysis
- [ ] Goal tracking across weeks

---

## Phase 13: New Features - Achievement System

### 13.1 Achievement Infrastructure
- [ ] Create achievements table
- [ ] Create user_achievements table
- [ ] Define achievement types and criteria
- [ ] Achievement unlock logic

### 13.2 Achievement Types
- [ ] EOD Streak badges (7, 14, 30, 50, 100 days)
- [ ] Task completion milestones (10, 50, 100, 500)
- [ ] Rock completion badges
- [ ] "First to EOD" daily badge
- [ ] Perfect week badge
- [ ] Team player badge

### 13.3 Achievement UI
- [ ] Create AchievementBadge component
- [ ] Achievement unlock notification
- [ ] Profile achievement showcase
- [ ] Team leaderboard (opt-in)

---

## Phase 14: New Features - Smart Task Suggestions

### 14.1 Suggestion Engine
- [ ] Create task suggestion API
- [ ] Parse EOD reports for action items
- [ ] Detect overdue rock tasks
- [ ] Similar task detection

### 14.2 Suggestion UI
- [ ] Create TaskSuggestionCard component
- [ ] Show in dashboard
- [ ] Accept/dismiss actions
- [ ] Learn from dismissals

### 14.3 AI-Powered Suggestions
- [ ] "Rock at risk" alerts with suggested actions
- [ ] Pattern recognition from past tasks
- [ ] Workload balancing suggestions

---

## Phase 15: New Features - Quick Capture Enhancements

### 15.1 Voice Input
- [ ] Add Web Speech API integration
- [ ] Voice capture button in command palette
- [ ] Transcription to task

### 15.2 Email-to-Task
- [ ] Create unique email address per user
- [ ] Email parsing webhook
- [ ] Auto-create task from email

### 15.3 Browser Extension
- [ ] Create Chrome extension manifest
- [ ] Quick capture popup
- [ ] Page context capture
- [ ] Auth token management

### 15.4 Mobile Widget
- [ ] PWA improvements
- [ ] Add to home screen prompt
- [ ] Quick add widget
- [ ] Offline support

---

## Phase 16: Testing & Quality Assurance

### 16.1 Unit Tests
- [ ] Test all new utility functions
- [ ] Test React Query hooks
- [ ] Test achievement logic
- [ ] Test time tracking calculations

### 16.2 Integration Tests
- [ ] Test API endpoints
- [ ] Test database operations
- [ ] Test cron jobs

### 16.3 E2E Tests
- [ ] Set up Playwright
- [ ] Test critical user flows
- [ ] Test dashboard interactions
- [ ] Test admin features

### 16.4 Visual Regression
- [ ] Screenshot testing for key pages
- [ ] Mobile responsive testing
- [ ] Dark mode testing

---

## Phase 17: Performance & Polish

### 17.1 Performance Optimization
- [ ] Code splitting for large features
- [ ] Lazy load modals and dialogs
- [ ] Image optimization
- [ ] Bundle analysis

### 17.2 Accessibility
- [ ] Keyboard navigation audit
- [ ] Screen reader testing
- [ ] Color contrast verification
- [ ] Focus management

### 17.3 Final Polish
- [ ] Animation refinements
- [ ] Transition smoothness
- [ ] Loading state consistency
- [ ] Error message clarity

---

## Implementation Order (Risk-Minimized)

### Sprint 1: Foundation (Prevent Breaking Changes)
1. Error boundaries
2. Split large components
3. Loading states expansion

### Sprint 2: Quick Wins
1. Empty states
2. Relative dates
3. Confetti celebrations
4. Keyboard shortcuts help
5. Due date quick set

### Sprint 3: Dashboard Core
1. Quick actions row
2. Progress rings
3. Focus of the day

### Sprint 4: Task UX
1. Inline editing
2. Due date grouping
3. Batch actions
4. Subtasks

### Sprint 5: Admin & Calendar
1. Fix unknown users
2. EOD hover preview
3. Team heatmap
4. Expandable escalations

### Sprint 6: New Features Part 1
1. Focus mode
2. Time tracking
3. Weekly review

### Sprint 7: New Features Part 2
1. Achievement system
2. Smart suggestions
3. Rock dependencies

### Sprint 8: Advanced Features
1. Roadmap view
2. Standup generator
3. Quick capture enhancements

### Sprint 9: Customization
1. Customizable dashboard layout
2. Search improvements
3. Recent items

### Sprint 10: Testing & Polish
1. Test coverage
2. Performance optimization
3. Accessibility audit
4. Final polish

---

## Success Criteria

- [ ] All existing features continue to work
- [ ] No regression in performance
- [ ] Build passes without errors
- [ ] All new features have proper error handling
- [ ] Mobile responsive maintained
- [ ] Dark mode support for all new components
