# Task Comments API

## Overview

The Task Comments API allows users to add, view, and delete comments on tasks. Comments are stored as JSONB in the `assigned_tasks.comments` column and support real-time collaboration.

## Endpoints

### GET /api/tasks/[id]/comments

Get all comments for a task.

**Authentication:** Required
**Authorization:** User must have access to the task's workspace

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tc_abc123",
      "userId": "user_123",
      "userName": "John Doe",
      "text": "This is a comment",
      "createdAt": "2024-02-05T10:30:00Z"
    }
  ]
}
```

### POST /api/tasks/[id]/comments

Add a new comment to a task.

**Authentication:** Required
**Authorization:** User must have access to the task's workspace

**Request Body:**
```json
{
  "text": "This is my comment"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tc_abc123",
    "userId": "user_123",
    "userName": "John Doe",
    "text": "This is my comment",
    "createdAt": "2024-02-05T10:30:00Z"
  },
  "message": "Comment added successfully"
}
```

### DELETE /api/tasks/[id]/comments?commentId={commentId}

Delete a comment from a task.

**Authentication:** Required
**Authorization:** User must be the comment author OR an admin

**Query Parameters:**
- `commentId` (required): The ID of the comment to delete

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## Security

- **Workspace Isolation**: Users can only access comments on tasks in workspaces they belong to
- **Author-Only Deletion**: Users can only delete their own comments (unless they're an admin)
- **Organization Scoping**: Comments are scoped to the organization that owns the task

## Implementation Details

### Database Schema

Comments are stored as JSONB in the `assigned_tasks.comments` column:

```sql
comments JSONB DEFAULT '[]'
```

### Data Structure

Each comment follows this TypeScript interface:

```typescript
interface TaskComment {
  id: string          // Format: "tc_{randomId}"
  userId: string      // User who created the comment
  userName: string    // Display name at time of creation
  text: string        // Comment text (max 5000 characters)
  createdAt: string   // ISO 8601 timestamp
}
```

### Helper Functions

Located in `lib/db/task-comments.ts`:

- `getTaskComments(taskId)` - Fetch all comments for a task
- `addTaskComment(taskId, input)` - Add a new comment
- `deleteTaskComment(taskId, commentId)` - Remove a comment
- `findTaskComment(taskId, commentId)` - Find a specific comment
- `parseComments(jsonb)` - Parse JSONB to TaskComment array
- `validateComment(input)` - Validate comment data

## Frontend Integration

The frontend component is located at `components/tasks/task-comments.tsx`.

Example usage:

```typescript
import { TaskComments } from "@/components/tasks/task-comments"

// In your component
const handleAddComment = async (text: string) => {
  const response = await fetch(`/api/tasks/${taskId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  })

  if (response.ok) {
    // Refresh comments
    fetchComments()
  }
}

<TaskComments
  comments={comments}
  currentUser={currentUser}
  onAddComment={handleAddComment}
/>
```

## Error Handling

The API returns standard error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common error codes:
- `400` - Bad request (missing required fields, validation errors)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found (task or comment doesn't exist)
- `500` - Internal server error

## Testing

To test the API endpoints:

```bash
# Get comments
curl -H "Cookie: session_token=..." \
  http://localhost:3000/api/tasks/task_123/comments

# Add comment
curl -X POST \
  -H "Cookie: session_token=..." \
  -H "Content-Type: application/json" \
  -d '{"text":"Test comment"}' \
  http://localhost:3000/api/tasks/task_123/comments

# Delete comment
curl -X DELETE \
  -H "Cookie: session_token=..." \
  http://localhost:3000/api/tasks/task_123/comments?commentId=tc_abc123
```
