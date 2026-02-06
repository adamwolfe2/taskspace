# Task Comments Integration Guide

## Quick Start

Here's how to integrate the Task Comments API with the existing frontend component.

## Example Implementation

```typescript
"use client"

import { useState, useEffect } from "react"
import { TaskComments } from "@/components/tasks/task-comments"
import type { TaskComment, TeamMember } from "@/lib/types"

export function TaskDetailPage({ taskId, currentUser }: { taskId: string, currentUser: TeamMember }) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch comments on mount
  useEffect(() => {
    fetchComments()
  }, [taskId])

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`)
      const data = await response.json()
      if (data.success) {
        setComments(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async (text: string) => {
    const response = await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    })

    if (!response.ok) {
      throw new Error("Failed to add comment")
    }

    // Refresh comments to show the new one
    await fetchComments()
  }

  const handleDeleteComment = async (commentId: string) => {
    const response = await fetch(`/api/tasks/${taskId}/comments?commentId=${commentId}`, {
      method: "DELETE"
    })

    if (!response.ok) {
      throw new Error("Failed to delete comment")
    }

    // Refresh comments to remove the deleted one
    await fetchComments()
  }

  if (loading) {
    return <div>Loading comments...</div>
  }

  return (
    <div>
      <h1>Task Details</h1>
      {/* Task info here */}

      <TaskComments
        comments={comments}
        currentUser={currentUser}
        onAddComment={handleAddComment}
      />
    </div>
  )
}
```

## API Integration Points

### 1. Fetching Comments

```typescript
const response = await fetch(`/api/tasks/${taskId}/comments`)
const { success, data } = await response.json()

if (success) {
  setComments(data) // TaskComment[]
}
```

### 2. Adding Comments

```typescript
const response = await fetch(`/api/tasks/${taskId}/comments`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: commentText })
})

const { success, data } = await response.json()

if (success) {
  // data is the newly created TaskComment
  // Refresh the comments list
}
```

### 3. Deleting Comments

```typescript
const response = await fetch(
  `/api/tasks/${taskId}/comments?commentId=${commentId}`,
  { method: "DELETE" }
)

const { success } = await response.json()

if (success) {
  // Remove the comment from local state
}
```

## Real-Time Updates (Optional)

For real-time comment updates, you can poll or use websockets:

```typescript
// Simple polling example
useEffect(() => {
  const interval = setInterval(() => {
    fetchComments()
  }, 10000) // Poll every 10 seconds

  return () => clearInterval(interval)
}, [taskId])
```

## Error Handling

```typescript
const handleAddComment = async (text: string) => {
  try {
    const response = await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    })

    const data = await response.json()

    if (!data.success) {
      // Show error toast
      toast.error(data.error || "Failed to add comment")
      return
    }

    // Success - refresh comments
    await fetchComments()
    toast.success("Comment added!")
  } catch (error) {
    console.error("Error adding comment:", error)
    toast.error("Network error - please try again")
  }
}
```

## Testing the Integration

1. **Add a comment**: Type text and press Enter or click Send
2. **View comments**: Comments should appear in chronological order
3. **Delete a comment**: Only visible for your own comments (shows X button)
4. **Workspace isolation**: Try accessing a task from a different workspace (should fail)

## Component Props

The `TaskComments` component accepts:

```typescript
interface TaskCommentsProps {
  comments: TaskComment[]           // Array of comments to display
  currentUser: TeamMember           // Current logged-in user
  onAddComment: (text: string) => Promise<void>  // Callback to add comment
  compact?: boolean                 // Optional compact mode (default: false)
}
```

## Security Notes

- Comments are scoped to the task's workspace
- Users can only delete their own comments (unless admin)
- All operations require authentication
- Comment text is limited to 5000 characters
- HTML/scripts in comments are automatically escaped by React
