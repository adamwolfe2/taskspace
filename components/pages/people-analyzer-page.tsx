"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useWorkspaces } from "@/lib/hooks/use-workspace";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/lib/contexts/app-context";
import { DEMO_PEOPLE_ASSESSMENTS, DEMO_READONLY_MESSAGE } from "@/lib/demo-data";
import { Users, Plus, Check, X, UserCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface PeopleAnalyzerSummary {
  employeeId: string;
  employeeName: string;
  getsIt: boolean;
  wantsIt: boolean;
  hasCapacity: boolean;
  coreValuesRating: string | null;
  rightPersonRightSeat: "right" | "wrong" | "unsure";
  assessmentCount: number;
  latestAssessmentId: string;
  latestNotes: string | null;
  updatedAt: string;
}

interface AssessmentFormData {
  employeeName: string;
  employeeId?: string;
  getsIt: boolean;
  wantsIt: boolean;
  hasCapacity: boolean;
  coreValuesRating: string;
  rightPersonRightSeat: "right" | "wrong" | "unsure";
  notes: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export function PeopleAnalyzerPage() {
  const { currentWorkspace } = useWorkspaces();
  const { toast } = useToast();
  const { isDemoMode } = useApp();

  const [assessments, setAssessments] = useState<PeopleAnalyzerSummary[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] =
    useState<PeopleAnalyzerSummary | null>(null);

  const [assessmentToDelete, setAssessmentToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<AssessmentFormData>({
    employeeName: "",
    getsIt: false,
    wantsIt: false,
    hasCapacity: false,
    coreValuesRating: "",
    rightPersonRightSeat: "unsure",
    notes: "",
  });

  const loadAssessments = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    if (isDemoMode) {
      setAssessments(DEMO_PEOPLE_ASSESSMENTS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/people-assessments?workspaceId=${currentWorkspace.id}&view=summary`
      );

      if (!response.ok) {
        throw new Error("Failed to load assessments");
      }

      const json = await response.json();
      setAssessments(json.data || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load people assessments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, currentWorkspace?.id, toast]);

  const loadTeamMembers = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/members`
      );

      if (!response.ok) {
        throw new Error("Failed to load team members");
      }

      const data = await response.json();
      setTeamMembers(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    }
  }, [currentWorkspace?.id, toast]);

  // Load assessments
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadAssessments();
      loadTeamMembers();
    }
  }, [loadAssessments, loadTeamMembers, currentWorkspace?.id]);

  const handleOpenDialog = (assessment?: PeopleAnalyzerSummary) => {
    if (assessment) {
      setEditingAssessment(assessment);
      setFormData({
        employeeName: assessment.employeeName,
        employeeId: assessment.employeeId,
        getsIt: assessment.getsIt,
        wantsIt: assessment.wantsIt,
        hasCapacity: assessment.hasCapacity,
        coreValuesRating: assessment.coreValuesRating || "",
        rightPersonRightSeat: assessment.rightPersonRightSeat,
        notes: assessment.latestNotes || "",
      });
    } else {
      setEditingAssessment(null);
      setFormData({
        employeeName: "",
        getsIt: false,
        wantsIt: false,
        hasCapacity: false,
        coreValuesRating: "",
        rightPersonRightSeat: "unsure",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAssessment(null);
  };

  const handleSaveAssessment = async () => {
    if (isDemoMode) {
      toast({ title: "Demo Mode", description: DEMO_READONLY_MESSAGE });
      return;
    }
    if (!currentWorkspace?.id) return;
    if (!formData.employeeName.trim()) {
      toast({
        title: "Error",
        description: "Employee name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...formData,
        workspaceId: currentWorkspace.id,
      };

      let response;
      if (editingAssessment) {
        response = await fetch(
          `/api/people-assessments/${editingAssessment.latestAssessmentId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch("/api/people-assessments", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        throw new Error("Failed to save assessment");
      }

      toast({
        title: "Success",
        description: editingAssessment
          ? "Assessment updated successfully"
          : "Assessment created successfully",
      });

      handleCloseDialog();
      loadAssessments();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save assessment",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssessment = (assessmentId: string) => {
    if (isDemoMode) {
      toast({ title: "Demo Mode", description: DEMO_READONLY_MESSAGE });
      return;
    }
    setAssessmentToDelete(assessmentId);
  };

  const confirmDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    const assessmentId = assessmentToDelete;
    setAssessmentToDelete(null);

    try {
      const response = await fetch(`/api/people-assessments/${assessmentId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (!response.ok) {
        throw new Error("Failed to delete assessment");
      }

      toast({
        title: "Success",
        description: "Assessment deleted successfully",
      });

      loadAssessments();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete assessment",
        variant: "destructive",
      });
    }
  };

  const getRPRSBadge = (status: "right" | "wrong" | "unsure") => {
    const variants = {
      right: "default",
      wrong: "destructive",
      unsure: "secondary",
    } as const;

    const labels = {
      right: "Right Person Right Seat",
      wrong: "Wrong",
      unsure: "Unsure",
    };

    return (
      <Badge
        variant={variants[status]}
        className={cn(
          status === "right" && "bg-green-500 hover:bg-green-600",
          status === "wrong" && "bg-red-500 hover:bg-red-600",
          status === "unsure" && "bg-yellow-500 hover:bg-yellow-600"
        )}
      >
        {labels[status]}
      </Badge>
    );
  };

  const getGWCIcon = (value: boolean) => {
    return value ? (
      <Check className="h-5 w-5 text-green-500" />
    ) : (
      <X className="h-5 w-5 text-red-500" />
    );
  };

  const allGWCPositive = (assessment: PeopleAnalyzerSummary) => {
    return assessment.getsIt && assessment.wantsIt && assessment.hasCapacity;
  };

  if (!currentWorkspace) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please select a workspace to view people assessments.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <h1 className="text-3xl font-bold">People Analyzer</h1>
          </div>
          <WorkspaceSwitcher />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Assessment
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assessments
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Right Person Right Seat
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                assessments.filter((a) => a.rightPersonRightSeat === "right")
                  .length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All GWC Pass</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assessments.filter(allGWCPositive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Needs Attention
            </CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                assessments.filter(
                  (a) =>
                    a.rightPersonRightSeat === "wrong" || !allGWCPositive(a)
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessments Table */}
      <Card>
        <CardHeader>
          <CardTitle>GWC Assessment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : assessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCheck className="h-10 w-10 text-slate-300 mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">No assessments yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mb-4">
                The People Analyzer evaluates team members on three criteria: <strong>Gets It</strong> (understands the role), <strong>Wants It</strong> (is motivated), and <strong>Has Capacity</strong> (can handle the workload). GWC helps identify if each person is in the right seat.
              </p>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                Add first assessment
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead className="text-center">Gets It</TableHead>
                  <TableHead className="text-center">Wants It</TableHead>
                  <TableHead className="text-center">Has Capacity</TableHead>
                  <TableHead>RPRS Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.employeeId}>
                    <TableCell className="font-medium">
                      {assessment.employeeName}
                    </TableCell>
                    <TableCell className="text-center">
                      {getGWCIcon(assessment.getsIt)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getGWCIcon(assessment.wantsIt)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getGWCIcon(assessment.hasCapacity)}
                    </TableCell>
                    <TableCell>
                      {getRPRSBadge(assessment.rightPersonRightSeat)}
                    </TableCell>
                    <TableCell>
                      {new Date(assessment.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(assessment)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteAssessment(assessment.latestAssessmentId)
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Assessment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAssessment ? "Edit" : "Add"} Assessment
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveAssessment(); }}>
            <div className="space-y-4">
              {/* Employee Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Employee</label>
                {teamMembers.length > 0 && !editingAssessment ? (
                  <Select
                    value={formData.employeeId || "custom"}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setFormData({
                          ...formData,
                          employeeId: undefined,
                          employeeName: "",
                        });
                      } else {
                        const member = teamMembers.find((m) => m.id === value);
                        setFormData({
                          ...formData,
                          employeeId: value,
                          employeeName: member?.name || "",
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee or enter custom name" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Name</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                {(!formData.employeeId || editingAssessment) && (
                  <Input
                    placeholder="Employee name"
                    value={formData.employeeName}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeName: e.target.value })
                    }
                    disabled={editingAssessment !== null}
                  />
                )}
              </div>

              {/* GWC Checkboxes */}
              <div className="space-y-3">
                <label className="text-sm font-medium">GWC Assessment</label>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="getsIt"
                    checked={formData.getsIt}
                    onChange={(e) =>
                      setFormData({ ...formData, getsIt: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="getsIt" className="text-sm cursor-pointer">
                    Gets It - Understands the role and its responsibilities
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="wantsIt"
                    checked={formData.wantsIt}
                    onChange={(e) =>
                      setFormData({ ...formData, wantsIt: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="wantsIt" className="text-sm cursor-pointer">
                    Wants It - Has genuine desire and passion for the role
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hasCapacity"
                    checked={formData.hasCapacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hasCapacity: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="hasCapacity" className="text-sm cursor-pointer">
                    Has Capacity - Has the time and ability to do the job well
                  </label>
                </div>
              </div>

              {/* Core Values Rating */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Core Values Rating (Optional)
                </label>
                <Input
                  placeholder="e.g., 8/10, Strong alignment, Needs improvement"
                  value={formData.coreValuesRating}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      coreValuesRating: e.target.value,
                    })
                  }
                />
              </div>

              {/* Right Person Right Seat */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Right Person Right Seat
                </label>
                <Select
                  value={formData.rightPersonRightSeat}
                  onValueChange={(value: "right" | "wrong" | "unsure") =>
                    setFormData({ ...formData, rightPersonRightSeat: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Right Person Right Seat</SelectItem>
                    <SelectItem value="wrong">Wrong</SelectItem>
                    <SelectItem value="unsure">Unsure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Textarea
                  placeholder="Additional observations, action items, or context..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Assessment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!assessmentToDelete} onOpenChange={(open) => !open && setAssessmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this assessment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAssessment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </ErrorBoundary>
  );
}
