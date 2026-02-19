"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  ExternalLink,
  Key,
  Link2,
  Loader2,
  RefreshCw,
  Unlink,
  XCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AsanaConnectionStatus {
  connected: boolean
  workspaceGid: string | null
  lastSyncAt: string | null
}

export function AsanaMemberConnection() {
  const { toast } = useToast()
  const [status, setStatus] = useState<AsanaConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [pat, setPat] = useState("")

  // Check connection status on mount
  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/asana/me/connect")
      const data = await response.json()
      if (data.success) {
        setStatus(data.data)
      }
    } catch (_err) {
      /* silently ignore */
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!pat.trim()) {
      toast({
        title: "Token required",
        description: "Please enter your Asana Personal Access Token",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    try {
      const response = await fetch("/api/asana/me/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ personalAccessToken: pat.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Connected!",
          description: `Connected to Asana as ${data.data.asanaName}`,
        })
        setShowConnectDialog(false)
        setPat("")
        checkConnection()
      } else {
        toast({
          title: "Connection failed",
          description: data.error || "Failed to connect to Asana",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Connection failed",
        description: "Failed to connect to Asana",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch("/api/asana/me/connect", {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Disconnected",
          description: "Your Asana account has been disconnected",
        })
        setStatus({ connected: false, workspaceGid: null, lastSyncAt: null })
      } else {
        toast({
          title: "Failed to disconnect",
          description: data.error || "Failed to disconnect Asana",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Failed to disconnect",
        description: "Failed to disconnect Asana",
        variant: "destructive",
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" role="status" aria-label="Loading" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
              fill="#F06A6A"
            />
            <circle cx="12" cy="12" r="3" fill="#F06A6A" />
          </svg>
          Asana Task Sync
        </CardTitle>
        <CardDescription>
          Connect your Asana account to sync tasks assigned to you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-800">Asana Connected</p>
                {status.lastSyncAt && (
                  <p className="text-sm text-green-600">
                    Last synced: {new Date(status.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Badge className="bg-green-500">Active</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="gap-2"
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
                Disconnect
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Tasks assigned to you in Asana will appear in your task list when you click "Sync Asana" on your dashboard.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <XCircle className="h-6 w-6 text-slate-400" />
              <div className="flex-1">
                <p className="font-medium text-slate-700">Asana Not Connected</p>
                <p className="text-sm text-slate-500">
                  Connect your account to sync tasks from Asana
                </p>
              </div>
            </div>

            <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Connect Asana
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Asana Account</DialogTitle>
                  <DialogDescription>
                    Enter your Asana Personal Access Token to sync your tasks
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="asana-pat">Personal Access Token</Label>
                    <Input
                      id="asana-pat"
                      type="password"
                      placeholder="0/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your token is stored securely and only used to sync your tasks.
                    </p>
                  </div>

                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                      <p className="font-medium mb-1">How to get your token:</p>
                      <ol className="list-decimal list-inside text-sm space-y-1">
                        <li>Go to <a href="https://app.asana.com/0/my-apps" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Asana Developer Console</a></li>
                        <li>Click "Create new token"</li>
                        <li>Give it a name like "Taskspace Sync"</li>
                        <li>Copy and paste the token here</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleConnect} disabled={isConnecting}>
                    {isConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-2 h-4 w-4" />
                        Connect
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="link" className="gap-2 p-0 h-auto" asChild>
              <a
                href="https://asana.com/guide/help/api/api"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Learn more about Asana API
              </a>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
