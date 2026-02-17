"use client"

import { useState } from "react"
import { Tab } from "@headlessui/react"
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline"
import { ImportWizard } from "@/components/migrations/import-wizard"

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}

export default function ImportExportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import & Export</h1>
          <p className="mt-2 text-sm text-gray-600">
            Import data from other tools or export your TaskSpace data
          </p>
        </div>

        {/* Tabs */}
        <Tab.Group>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
            <Tab
              className={({ selected }) =>
                classNames(
                  "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                  "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                  selected
                    ? "bg-white text-blue-700 shadow"
                    : "text-gray-700 hover:bg-white/[0.12] hover:text-blue-600"
                )
              }
            >
              <div className="flex items-center justify-center gap-2">
                <ArrowUpTrayIcon className="h-5 w-5" />
                Import Data
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                  "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                  selected
                    ? "bg-white text-blue-700 shadow"
                    : "text-gray-700 hover:bg-white/[0.12] hover:text-blue-600"
                )
              }
            >
              <div className="flex items-center justify-center gap-2">
                <ArrowDownTrayIcon className="h-5 w-5" />
                Export Data
              </div>
            </Tab>
          </Tab.List>

          <Tab.Panels>
            {/* Import Panel */}
            <Tab.Panel
              className={classNames(
                "rounded-xl bg-white p-6 shadow-lg",
                "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2"
              )}
            >
              <ImportWizard />
            </Tab.Panel>

            {/* Export Panel */}
            <Tab.Panel
              className={classNames(
                "rounded-xl bg-white p-6 shadow-lg",
                "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2"
              )}
            >
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Export Your Data
                  </h2>
                  <p className="text-sm text-gray-600">
                    Download your TaskSpace data in various formats for backup or migration
                  </p>
                </div>

                {/* Export Options */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* JSON Export */}
                  <div className="rounded-lg border border-gray-200 p-4 hover:border-blue-500 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">JSON Export</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Complete export including all metadata, perfect for backup or re-importing
                        </p>
                      </div>
                    </div>
                    <button
                      className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={() => {
                        // TODO: Implement JSON export
                        alert("JSON export coming soon!")
                      }}
                    >
                      Export as JSON
                    </button>
                  </div>

                  {/* CSV Export */}
                  <div className="rounded-lg border border-gray-200 p-4 hover:border-blue-500 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">CSV Export</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Export tasks and rocks in CSV format for use in spreadsheets
                        </p>
                      </div>
                    </div>
                    <button
                      className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={() => {
                        // TODO: Implement CSV export
                        alert("CSV export coming soon!")
                      }}
                    >
                      Export as CSV
                    </button>
                  </div>
                </div>

                {/* Export History */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Export History</h3>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                    <p className="text-sm text-gray-500">No exports yet</p>
                  </div>
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  )
}
