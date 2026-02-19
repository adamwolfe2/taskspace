"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Users,
  Sparkles,
  Copy,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadResult {
  success: boolean
  created: number
  errors: string[]
  preview?: Array<{
    name: string
    email: string
    jobTitle: string
    department: string
    supervisor: string | null
  }>
}

const CSV_TEMPLATE_HEADERS = [
  "firstName",
  "lastName",
  "email",
  "jobTitle",
  "department",
  "supervisorEmail",
  "notes"
]

const CSV_EXAMPLE_DATA = [
  ["John", "Smith", "john.smith@company.com", "CEO", "Executive", "", "Company founder and CEO"],
  ["Sarah", "Johnson", "sarah.j@company.com", "VP of Engineering", "Engineering", "john.smith@company.com", "Leads all engineering teams"],
  ["Michael", "Chen", "michael.c@company.com", "VP of Sales", "Sales", "john.smith@company.com", "Oversees sales operations"],
  ["Emily", "Davis", "emily.d@company.com", "Engineering Manager", "Engineering", "sarah.j@company.com", "Manages backend team"],
  ["David", "Wilson", "david.w@company.com", "Senior Engineer", "Engineering", "emily.d@company.com", "Backend developer"],
  ["Lisa", "Brown", "lisa.b@company.com", "Sales Manager", "Sales", "michael.c@company.com", "West coast sales lead"],
]

const AI_PROMPT_TEMPLATE = `I need to create an organizational chart for my company. Please generate a CSV file with the following structure:

**Required Columns:**
- firstName: Employee's first name
- lastName: Employee's last name
- email: Company email address
- jobTitle: Job title/position
- department: Department name (e.g., Engineering, Sales, Marketing, Operations, Finance, HR)
- supervisorEmail: Email of direct manager (leave empty for CEO/top executive)
- notes: Brief description or additional info (optional)

**Important Rules:**
1. The CEO or top executive should have an empty supervisorEmail field
2. All other employees must have a supervisorEmail that matches another employee's email
3. This creates the reporting hierarchy: if Alice reports to Bob, Alice's supervisorEmail = Bob's email
4. Use realistic company email format (firstname.lastname@company.com)

**Example CSV format:**
firstName,lastName,email,jobTitle,department,supervisorEmail,notes
John,Smith,john.smith@company.com,CEO,Executive,,Company founder and CEO
Sarah,Johnson,sarah.j@company.com,VP of Engineering,Engineering,john.smith@company.com,Leads all engineering teams

Please generate a complete organizational chart for [DESCRIBE YOUR COMPANY: size, departments, structure here]. Include:
- 1 CEO
- C-suite executives (CTO, CFO, etc.)
- Department heads/managers
- Team leads
- Individual contributors

Make sure the hierarchy is realistic and all supervisorEmail values correctly reference existing employees.`

export function OrgChartUploadWizard({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [step, setStep] = useState<"intro" | "download" | "upload" | "processing" | "complete">("intro")
  const [file, setFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()
  const { currentWorkspace } = useWorkspaces()

  const downloadTemplate = () => {
    const csvContent = [
      CSV_TEMPLATE_HEADERS.join(","),
      ...CSV_EXAMPLE_DATA.map(row => row.join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "org_chart_template.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast({
      title: "Template downloaded",
      description: "Fill in your team information and upload when ready",
    })

    setStep("upload")
  }

  const copyAIPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT_TEMPLATE)
    toast({
      title: "AI prompt copied",
      description: "Paste this into ChatGPT or Claude to generate your org chart CSV",
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast({
          title: "Invalid file",
          description: "Please upload a CSV file",
          variant: "destructive",
        })
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file || !currentWorkspace) return

    setIsProcessing(true)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("workspaceId", currentWorkspace.id)

      setProgress(30)

      const response = await fetch("/api/org-chart/upload", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: formData,
      })

      setProgress(70)

      const data = await response.json()

      setProgress(100)

      if (data.success) {
        setUploadResult(data)
        setStep("complete")
        toast({
          title: "Org chart uploaded successfully",
          description: `${data.created} employees added to your organization`,
        })
        setTimeout(() => {
          onUploadComplete()
        }, 2000)
      } else {
        toast({
          title: "Upload failed",
          description: data.error || "Failed to process CSV file",
          variant: "destructive",
        })
        setUploadResult(data)
      }
    } catch (error) {
      toast({
        title: "Upload error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {["intro", "download", "upload", "complete"].map((s, idx) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : ["intro", "download", "upload", "complete"].indexOf(step) >
                    ["intro", "download", "upload", "complete"].indexOf(s)
                  ? "bg-green-500 text-white"
                  : "bg-slate-200 text-slate-500"
              )}
            >
              {["intro", "download", "upload", "complete"].indexOf(step) >
              ["intro", "download", "upload", "complete"].indexOf(s) ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                idx + 1
              )}
            </div>
            {idx < 3 && (
              <div
                className={cn(
                  "w-12 h-0.5 mx-1 transition-colors",
                  ["intro", "download", "upload", "complete"].indexOf(step) > idx
                    ? "bg-green-500"
                    : "bg-slate-200"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Intro step */}
      {step === "intro" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Set Up Your Organization Chart
            </CardTitle>
            <CardDescription>
              Upload your team structure to visualize reporting relationships and track quarterly goals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                How it works
              </h3>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Download the template</p>
                    <p className="text-sm text-muted-foreground">
                      Get our CSV template with example data showing the correct format
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Fill in your team data</p>
                    <p className="text-sm text-muted-foreground">
                      Add employee names, emails, titles, and reporting relationships
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Upload and visualize</p>
                    <p className="text-sm text-muted-foreground">
                      We'll create your interactive org chart automatically
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                <strong>Pro tip:</strong> You can use AI to generate your org chart! Copy our prompt template
                and paste it into ChatGPT or Claude to automatically create your CSV file.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button onClick={() => setStep("download")} className="flex-1">
                Get Started
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download step */}
      {step === "download" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-6 w-6 text-primary" />
              Download Template
            </CardTitle>
            <CardDescription>
              Choose how you want to create your organizational chart
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Manual option */}
              <Card className="border-2 hover:border-primary transition-colors cursor-pointer">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileSpreadsheet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Manual Entry</h3>
                      <p className="text-sm text-muted-foreground">Fill in the CSV manually</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Download our template with example data. Fill in your team information in Excel or
                    Google Sheets.
                  </p>
                  <Button onClick={downloadTemplate} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                </CardContent>
              </Card>

              {/* AI option */}
              <Card className="border-2 border-primary/50 bg-primary/5">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary rounded-lg">
                      <Sparkles className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">AI Generation</h3>
                      <p className="text-sm text-muted-foreground">Let AI create it for you</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Copy our AI prompt and paste it into ChatGPT or Claude. Describe your company and
                    the AI will generate a complete CSV.
                  </p>
                  <Button onClick={copyAIPrompt} variant="outline" className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy AI Prompt
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-sm">CSV Format Requirements:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>firstName, lastName:</strong> Employee names</li>
                <li>• <strong>email:</strong> Unique company email address</li>
                <li>• <strong>jobTitle:</strong> Position (e.g., "VP of Engineering")</li>
                <li>• <strong>department:</strong> Department name</li>
                <li>
                  • <strong>supervisorEmail:</strong> Direct manager's email (empty for CEO)
                </li>
                <li>• <strong>notes:</strong> Optional additional information</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep("intro")} variant="outline">
                Back
              </Button>
              <Button onClick={() => setStep("upload")} variant="outline" className="flex-1">
                Skip to Upload
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload step */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-6 w-6 text-primary" />
              Upload Your Org Chart
            </CardTitle>
            <CardDescription>
              Upload the completed CSV file with your team structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-slate-100 rounded-full">
                    <FileSpreadsheet className="h-8 w-8 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {file ? file.name : "Click to select CSV file"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : "or drag and drop"}
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {file && !isProcessing && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  File selected: <strong>{file.name}</strong>. Ready to upload.
                </AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  Processing your org chart... {progress}%
                </p>
              </div>
            )}

            {uploadResult && !uploadResult.success && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Upload errors:</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {uploadResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button onClick={() => setStep("download")} variant="outline">
                Back
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || isProcessing}
                className="flex-1"
              >
                {isProcessing ? "Processing..." : "Upload Org Chart"}
                {!isProcessing && <Upload className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete step */}
      {step === "complete" && uploadResult?.success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-900 mb-2">
                Org Chart Created Successfully!
              </h3>
              <p className="text-green-700">
                {uploadResult.created} employees have been added to your organization
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 text-left">
              <h4 className="font-semibold mb-2">What's next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View your interactive org chart</li>
                <li>• Invite team members to join the workspace</li>
                <li>• Sync quarterly rocks to the org chart</li>
                <li>• Track progress on team goals</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
