"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BrainDumpInput } from "@/components/ai/brain-dump-input"
import { AITaskReview } from "@/components/ai/ai-task-review"
import { AICopilotChat } from "@/components/ai/ai-copilot-chat"
import { DailyDigestCard } from "@/components/ai/daily-digest-card"
import { api } from "@/lib/api/client"
import { useToast } from "@/hooks/use-toast"
import { Brain, Sparkles, MessageSquare, Calendar, AlertCircle, Zap } from "lucide-react"
import type {
  TeamMember,
  AIGeneratedTask,
  DailyDigest,
  AIConversation,
  AIQueryResponse,
} from "@/lib/types"

interface CommandCenterPageProps {
  teamMembers: TeamMember[]
  currentUser: TeamMember
}

export function CommandCenterPage({ teamMembers, currentUser }: CommandCenterPageProps) {
  const [activeTab, setActiveTab] = useState("brain-dump")
  const [pendingTasks, setPendingTasks] = useState<AIGeneratedTask[]>([])
  const [digest, setDigest] = useState<DailyDigest | null>(null)
  const [conversations, setConversations] = useState<AIConversation[]>([])
  const [isProcessingDump, setIsProcessingDump] = useState(false)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false)
  const [isQuerying, setIsQuerying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const { toast } = useToast()

  // Load pending AI tasks
  const loadPendingTasks = useCallback(async () => {
    try {
      setIsLoadingTasks(true)
      const response = await fetch("/api/ai/tasks?status=pending")
      const data = await response.json()
      if (data.success) {
        setPendingTasks(data.data || [])
      }
    } catch (err) {
      console.error("Failed to load pending tasks:", err)
    } finally {
      setIsLoadingTasks(false)
    }
  }, [])

  // Load today's digest
  const loadDigest = useCallback(async () => {
    try {
      const response = await fetch(`/api/ai/digest?date=${selectedDate}`)
      const data = await response.json()
      if (data.success && data.data) {
        setDigest(data.data)
      } else {
        setDigest(null)
      }
    } catch (err) {
      console.error("Failed to load digest:", err)
      setDigest(null)
    }
  }, [selectedDate])

  // Load conversation history
  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/query?limit=20")
      const data = await response.json()
      if (data.success) {
        setConversations(data.data || [])
      }
    } catch (err) {
      console.error("Failed to load conversations:", err)
    }
  }, [])

  useEffect(() => {
    loadPendingTasks()
    loadDigest()
    loadConversations()
  }, [loadPendingTasks, loadDigest, loadConversations])

  // Process brain dump
  const handleBrainDump = async (content: string) => {
    setIsProcessingDump(true)
    setError(null)
    try {
      const response = await fetch("/api/ai/brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to process brain dump")
      }

      // Add new tasks to pending list
      setPendingTasks((prev) => [...data.data.tasks, ...prev])

      toast({
        title: "Brain dump processed",
        description: data.message,
      })

      // Switch to task review tab if tasks were generated
      if (data.data.tasks.length > 0) {
        setActiveTab("tasks")
      }
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessingDump(false)
    }
  }

  // Approve task
  const handleApproveTask = async (taskId: string, updates?: Partial<AIGeneratedTask>) => {
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action: "approve", updates }),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to approve task")
      }

      // Remove from pending list
      setPendingTasks((prev) => prev.filter((t) => t.id !== taskId))

      toast({
        title: "Task approved",
        description: "Task has been added to the assignee's list",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    }
  }

  // Reject task
  const handleRejectTask = async (taskId: string) => {
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action: "reject" }),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to reject task")
      }

      // Remove from pending list
      setPendingTasks((prev) => prev.filter((t) => t.id !== taskId))

      toast({
        title: "Task rejected",
        description: "Task has been removed",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    }
  }

  // Approve all tasks
  const handleApproveAllTasks = async () => {
    for (const task of pendingTasks) {
      await handleApproveTask(task.id)
    }
  }

  // Generate digest
  const handleGenerateDigest = async () => {
    setIsGeneratingDigest(true)
    try {
      const response = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to generate digest")
      }

      setDigest(data.data)

      toast({
        title: "Digest generated",
        description: data.message,
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsGeneratingDigest(false)
    }
  }

  // Handle AI query
  const handleQuery = async (query: string): Promise<AIQueryResponse & { conversationId: string }> => {
    setIsQuerying(true)
    try {
      const response = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to process query")
      }

      return data.data
    } finally {
      setIsQuerying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            AI Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Your AI-powered team management hub
          </p>
        </div>
        {pendingTasks.length > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{pendingTasks.length} pending tasks</span>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="brain-dump" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Brain Dump</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2 relative">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Tasks</span>
            {pendingTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {pendingTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="digest" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Daily Digest</span>
          </TabsTrigger>
          <TabsTrigger value="copilot" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">AI Copilot</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brain-dump" className="space-y-6">
          <BrainDumpInput onSubmit={handleBrainDump} isProcessing={isProcessingDump} />
          {pendingTasks.length > 0 && (
            <AITaskReview
              tasks={pendingTasks}
              teamMembers={teamMembers}
              onApprove={handleApproveTask}
              onReject={handleRejectTask}
              onApproveAll={handleApproveAllTasks}
              isLoading={isLoadingTasks}
            />
          )}
        </TabsContent>

        <TabsContent value="tasks">
          <AITaskReview
            tasks={pendingTasks}
            teamMembers={teamMembers}
            onApprove={handleApproveTask}
            onReject={handleRejectTask}
            onApproveAll={handleApproveAllTasks}
            isLoading={isLoadingTasks}
          />
          {pendingTasks.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No pending AI tasks</h3>
              <p className="text-sm text-muted-foreground">
                Use the Brain Dump tab to generate task suggestions
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="digest">
          <DailyDigestCard
            digest={digest}
            teamMembers={teamMembers}
            onGenerate={handleGenerateDigest}
            isGenerating={isGeneratingDigest}
            selectedDate={selectedDate}
          />
        </TabsContent>

        <TabsContent value="copilot">
          <AICopilotChat
            onQuery={handleQuery}
            conversationHistory={conversations}
            isLoading={isQuerying}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
