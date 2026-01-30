#!/usr/bin/env node

/**
 * End-to-End Workspace Functionality Test
 *
 * This script tests the complete workspace functionality:
 * 1. Lists existing workspaces
 * 2. Creates a new test workspace
 * 3. Creates tasks/rocks in different workspaces
 * 4. Verifies data isolation between workspaces
 */

const BASE_URL = 'http://localhost:3000'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logStep(step, message) {
  log(`\n[Step ${step}] ${message}`, colors.cyan)
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green)
}

function logError(message) {
  log(`❌ ${message}`, colors.red)
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow)
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()
    return { response, data }
  } catch (error) {
    logError(`Request failed: ${error.message}`)
    throw error
  }
}

async function testWorkspaceFunctionality() {
  log('\n' + '='.repeat(60), colors.blue)
  log('WORKSPACE FUNCTIONALITY END-TO-END TEST', colors.blue)
  log('='.repeat(60) + '\n', colors.blue)

  let defaultWorkspaceId = null
  let testWorkspaceId = null
  let defaultWorkspaceTaskId = null
  let testWorkspaceTaskId = null

  try {
    // Step 1: List existing workspaces
    logStep(1, 'Listing existing workspaces')
    const { data: workspacesData } = await makeRequest('/api/workspaces')

    if (!workspacesData.success) {
      logError(`Failed to list workspaces: ${workspacesData.error}`)
      return
    }

    const workspaces = workspacesData.data
    log(`Found ${workspaces.length} workspace(s):`)
    workspaces.forEach((ws, i) => {
      log(`  ${i + 1}. ${ws.name} (${ws.type}) ${ws.isDefault ? '[DEFAULT]' : ''}`)
      log(`     ID: ${ws.id}`)
      if (ws.isDefault) {
        defaultWorkspaceId = ws.id
      }
    })

    if (workspaces.length === 0) {
      logWarning('No workspaces found. Database migration may not have run.')
      return
    }

    logSuccess(`Found ${workspaces.length} workspace(s)`)

    // Step 2: Create a new test workspace
    logStep(2, 'Creating test workspace')
    const { data: createWorkspaceData } = await makeRequest('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Workspace - E2E',
        type: 'team',
        description: 'End-to-end testing workspace',
      }),
    })

    if (!createWorkspaceData.success) {
      logError(`Failed to create workspace: ${createWorkspaceData.error}`)
      return
    }

    testWorkspaceId = createWorkspaceData.data.id
    log(`Created test workspace:`)
    log(`  Name: ${createWorkspaceData.data.name}`)
    log(`  ID: ${testWorkspaceId}`)
    log(`  Type: ${createWorkspaceData.data.type}`)
    logSuccess('Test workspace created successfully')

    // Step 3: Fetch all tasks (without workspace filter)
    logStep(3, 'Fetching all tasks (organization-level)')
    const { data: allTasksData } = await makeRequest('/api/tasks')

    if (!allTasksData.success) {
      logError(`Failed to fetch tasks: ${allTasksData.error}`)
      return
    }

    log(`Total tasks in organization: ${allTasksData.data.length}`)
    logSuccess('Fetched organization-level tasks')

    // Step 4: Fetch tasks for default workspace
    logStep(4, `Fetching tasks for default workspace (${defaultWorkspaceId})`)
    const { data: defaultTasksData } = await makeRequest(`/api/tasks?workspaceId=${defaultWorkspaceId}`)

    if (!defaultTasksData.success) {
      logError(`Failed to fetch default workspace tasks: ${defaultTasksData.error}`)
      return
    }

    log(`Tasks in default workspace: ${defaultTasksData.data.length}`)
    logSuccess('Fetched default workspace tasks')

    // Step 5: Fetch tasks for test workspace (should be empty)
    logStep(5, `Fetching tasks for test workspace (${testWorkspaceId})`)
    const { data: testTasksData } = await makeRequest(`/api/tasks?workspaceId=${testWorkspaceId}`)

    if (!testTasksData.success) {
      logError(`Failed to fetch test workspace tasks: ${testTasksData.error}`)
      return
    }

    log(`Tasks in test workspace: ${testTasksData.data.length}`)
    if (testTasksData.data.length === 0) {
      logSuccess('Test workspace is empty (as expected)')
    } else {
      logWarning('Test workspace has existing tasks (unexpected)')
    }

    // Step 6: Create a task in the default workspace
    logStep(6, 'Creating task in default workspace')
    const { data: defaultTaskCreateData } = await makeRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Task - Default Workspace',
        description: 'This task should only appear in the default workspace',
        workspaceId: defaultWorkspaceId,
        priority: 'normal',
        dueDate: new Date().toISOString().split('T')[0],
      }),
    })

    if (!defaultTaskCreateData.success) {
      logError(`Failed to create task in default workspace: ${defaultTaskCreateData.error}`)
      return
    }

    defaultWorkspaceTaskId = defaultTaskCreateData.data.id
    log(`Created task:`)
    log(`  Title: ${defaultTaskCreateData.data.title}`)
    log(`  ID: ${defaultWorkspaceTaskId}`)
    log(`  Workspace ID: ${defaultTaskCreateData.data.workspaceId}`)
    logSuccess('Task created in default workspace')

    // Step 7: Create a task in the test workspace
    logStep(7, 'Creating task in test workspace')
    const { data: testTaskCreateData } = await makeRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Task - Test Workspace',
        description: 'This task should only appear in the test workspace',
        workspaceId: testWorkspaceId,
        priority: 'high',
        dueDate: new Date().toISOString().split('T')[0],
      }),
    })

    if (!testTaskCreateData.success) {
      logError(`Failed to create task in test workspace: ${testTaskCreateData.error}`)
      return
    }

    testWorkspaceTaskId = testTaskCreateData.data.id
    log(`Created task:`)
    log(`  Title: ${testTaskCreateData.data.title}`)
    log(`  ID: ${testWorkspaceTaskId}`)
    log(`  Workspace ID: ${testTaskCreateData.data.workspaceId}`)
    logSuccess('Task created in test workspace')

    // Step 8: Verify data isolation - Check default workspace
    logStep(8, 'Verifying data isolation in default workspace')
    const { data: defaultTasksAfter } = await makeRequest(`/api/tasks?workspaceId=${defaultWorkspaceId}`)

    const defaultWorkspaceHasTestTask = defaultTasksAfter.data.some(t => t.id === testWorkspaceTaskId)
    const defaultWorkspaceHasDefaultTask = defaultTasksAfter.data.some(t => t.id === defaultWorkspaceTaskId)

    log(`Default workspace contains:`)
    log(`  Default task (${defaultWorkspaceTaskId}): ${defaultWorkspaceHasDefaultTask ? 'YES ✓' : 'NO ✗'}`)
    log(`  Test task (${testWorkspaceTaskId}): ${defaultWorkspaceHasTestTask ? 'YES ✗' : 'NO ✓'}`)

    if (!defaultWorkspaceHasTestTask && defaultWorkspaceHasDefaultTask) {
      logSuccess('Default workspace isolation verified')
    } else {
      logError('Default workspace isolation FAILED - data leakage detected!')
      return
    }

    // Step 9: Verify data isolation - Check test workspace
    logStep(9, 'Verifying data isolation in test workspace')
    const { data: testTasksAfter } = await makeRequest(`/api/tasks?workspaceId=${testWorkspaceId}`)

    const testWorkspaceHasTestTask = testTasksAfter.data.some(t => t.id === testWorkspaceTaskId)
    const testWorkspaceHasDefaultTask = testTasksAfter.data.some(t => t.id === defaultWorkspaceTaskId)

    log(`Test workspace contains:`)
    log(`  Test task (${testWorkspaceTaskId}): ${testWorkspaceHasTestTask ? 'YES ✓' : 'NO ✗'}`)
    log(`  Default task (${defaultWorkspaceTaskId}): ${testWorkspaceHasDefaultTask ? 'YES ✗' : 'NO ✓'}`)

    if (testWorkspaceHasTestTask && !testWorkspaceHasDefaultTask) {
      logSuccess('Test workspace isolation verified')
    } else {
      logError('Test workspace isolation FAILED - data leakage detected!')
      return
    }

    // Step 10: Verify organization-level view includes both
    logStep(10, 'Verifying organization-level view includes all data')
    const { data: allTasksAfter } = await makeRequest('/api/tasks')

    const orgHasTestTask = allTasksAfter.data.some(t => t.id === testWorkspaceTaskId)
    const orgHasDefaultTask = allTasksAfter.data.some(t => t.id === defaultWorkspaceTaskId)

    log(`Organization-level view contains:`)
    log(`  Default task: ${orgHasDefaultTask ? 'YES ✓' : 'NO ✗'}`)
    log(`  Test task: ${orgHasTestTask ? 'YES ✓' : 'NO ✗'}`)

    if (orgHasTestTask && orgHasDefaultTask) {
      logSuccess('Organization-level view includes all workspace data')
    } else {
      logError('Organization-level view is missing data!')
      return
    }

    // Step 11: Cleanup - Delete test tasks
    logStep(11, 'Cleaning up test data')

    await makeRequest(`/api/tasks?id=${defaultWorkspaceTaskId}`, { method: 'DELETE' })
    log(`Deleted default workspace task`)

    await makeRequest(`/api/tasks?id=${testWorkspaceTaskId}`, { method: 'DELETE' })
    log(`Deleted test workspace task`)

    await makeRequest(`/api/workspaces/${testWorkspaceId}`, { method: 'DELETE' })
    log(`Deleted test workspace`)

    logSuccess('Test data cleaned up')

    // Final summary
    log('\n' + '='.repeat(60), colors.blue)
    log('TEST RESULTS', colors.blue)
    log('='.repeat(60), colors.blue)
    logSuccess('✅ All tests passed!')
    log('\nWorkspace functionality is working correctly:', colors.green)
    log('  • Workspaces can be created')
    log('  • Data is properly scoped to workspaces')
    log('  • Data isolation between workspaces is enforced')
    log('  • Organization-level view includes all workspace data')
    log('  • Workspace filtering works correctly')
    log('\n' + '='.repeat(60) + '\n', colors.blue)

  } catch (error) {
    log('\n' + '='.repeat(60), colors.red)
    log('TEST FAILED', colors.red)
    log('='.repeat(60), colors.red)
    logError(`Error: ${error.message}`)
    if (error.stack) {
      log(error.stack, colors.red)
    }
    log('='.repeat(60) + '\n', colors.red)
    process.exit(1)
  }
}

// Run the test
testWorkspaceFunctionality().catch(error => {
  logError(`Fatal error: ${error.message}`)
  process.exit(1)
})
