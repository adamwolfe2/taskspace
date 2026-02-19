"use client"

import { useCallback } from "react"
import { EmployeeCard } from "./employee-card"
import { cn } from "@/lib/utils"
import type { OrgChartEmployeeNode, OrgChartEmployee } from "@/lib/org-chart/types"

interface OrgChartProps {
  root: OrgChartEmployeeNode | null
  onEmployeeClick: (employee: OrgChartEmployee) => void
  highlightedEmployee?: string | null
  progressData: Map<string, boolean>
  cardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
}

export function OrgChart({
  root,
  onEmployeeClick,
  highlightedEmployee,
  progressData,
  cardRefs,
}: OrgChartProps) {
  if (!root) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        No organization data available
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-w-max p-8">
      <OrgChartNode
        node={root}
        onEmployeeClick={onEmployeeClick}
        highlightedEmployee={highlightedEmployee}
        progressData={progressData}
        cardRefs={cardRefs}
        isRoot={true}
      />
    </div>
  )
}

interface OrgChartNodeProps {
  node: OrgChartEmployeeNode
  onEmployeeClick: (employee: OrgChartEmployee) => void
  highlightedEmployee?: string | null
  progressData: Map<string, boolean>
  cardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
  isRoot?: boolean
}

function OrgChartNode({
  node,
  onEmployeeClick,
  highlightedEmployee,
  progressData,
  cardRefs,
  isRoot: _isRoot = false,
}: OrgChartNodeProps) {
  const hasReports = node.directReports.length > 0

  // Separate managers (have direct reports) from leaf employees
  const managers = node.directReports.filter((r) => r.directReports.length > 0)
  const leafEmployees = node.directReports.filter((r) => r.directReports.length === 0)

  const setCardRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        cardRefs.current.set(node.fullName.toLowerCase(), el)
      }
    },
    [cardRefs, node.fullName]
  )

  return (
    <div className="flex flex-col items-center">
      {/* Current employee card */}
      <div
        ref={setCardRef}
        data-employee={node.fullName.toLowerCase()}
      >
        <EmployeeCard
          employee={node}
          onClick={() => onEmployeeClick(node)}
          isHighlighted={
            highlightedEmployee?.toLowerCase() === node.fullName.toLowerCase()
          }
          progressData={progressData}
        />
      </div>

      {/* Connector line down */}
      {hasReports && (
        <div className="w-0.5 h-8 bg-slate-200" />
      )}

      {/* Direct reports */}
      {hasReports && (
        <div className="flex flex-col items-center">
          {/* Horizontal line */}
          {(managers.length > 1 || (managers.length > 0 && leafEmployees.length > 0)) && (
            <div
              className="h-0.5 bg-slate-200"
              style={{
                width: `calc(100% - 128px)`,
                minWidth: "100px",
              }}
            />
          )}

          {/* Manager subtrees and leaf employees box */}
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {/* Render managers recursively */}
            {managers.map((report) => (
              <div key={report.id} className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-slate-200 -mt-8" />
                <OrgChartNode
                  node={report}
                  onEmployeeClick={onEmployeeClick}
                  highlightedEmployee={highlightedEmployee}
                  progressData={progressData}
                  cardRefs={cardRefs}
                />
              </div>
            ))}

            {/* Render leaf employees in a group */}
            {leafEmployees.length > 0 && (
              <div className="flex flex-col items-center">
                {managers.length > 0 && (
                  <div className="w-0.5 h-4 bg-slate-200 -mt-8" />
                )}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div
                    className={cn(
                      "grid gap-4",
                      leafEmployees.length === 1
                        ? "grid-cols-1"
                        : leafEmployees.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-2 lg:grid-cols-3"
                    )}
                  >
                    {leafEmployees.map((report) => (
                      <div
                        key={report.id}
                        ref={(el) => {
                          if (el) {
                            cardRefs.current.set(
                              report.fullName.toLowerCase(),
                              el
                            )
                          }
                        }}
                        data-employee={report.fullName.toLowerCase()}
                      >
                        <EmployeeCard
                          employee={report}
                          onClick={() => onEmployeeClick(report)}
                          isHighlighted={
                            highlightedEmployee?.toLowerCase() ===
                            report.fullName.toLowerCase()
                          }
                          progressData={progressData}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
