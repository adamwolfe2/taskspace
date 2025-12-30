/**
 * Jest Setup File
 *
 * Configures the test environment and global mocks
 */

// Mock environment variables
process.env.POSTGRES_URL = 'postgres://test:test@localhost:5432/test'
process.env.NODE_ENV = 'test'

// Mock console.error to keep test output clean (optional)
// Uncomment if needed:
// const originalError = console.error
// beforeAll(() => {
//   console.error = (...args) => {
//     if (args[0]?.includes?.('Warning:')) return
//     originalError.call(console, ...args)
//   }
// })
// afterAll(() => {
//   console.error = originalError
// })

// Global test utilities
global.testUtils = {
  /**
   * Create a mock NextRequest
   */
  createMockRequest: (url, options = {}) => {
    const { method = 'GET', headers = {}, body = null } = options
    return {
      url: `http://localhost:3000${url}`,
      method,
      headers: new Map(Object.entries(headers)),
      json: () => Promise.resolve(body),
      nextUrl: new URL(`http://localhost:3000${url}`),
    }
  },

  /**
   * Generate a random UUID for testing
   */
  uuid: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  },

  /**
   * Create a mock organization
   */
  mockOrg: (overrides = {}) => ({
    id: global.testUtils.uuid(),
    name: 'Test Organization',
    slug: 'test-org',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Create a mock user
   */
  mockUser: (overrides = {}) => ({
    id: global.testUtils.uuid(),
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Create a mock task
   */
  mockTask: (overrides = {}) => ({
    id: global.testUtils.uuid(),
    title: 'Test Task',
    description: 'A test task description',
    status: 'pending',
    priority: 'normal',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
}

// Mock database module
jest.mock('@/lib/db', () => ({
  db: {
    sql: jest.fn(),
    users: {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organizations: {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn(),
    },
    assignedTasks: {
      findByOrganizationId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    rocks: {
      findByOrganizationId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    eodReports: {
      findByOrganizationId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    },
    members: {
      findByOrganizationId: jest.fn(),
      findWithUsersByOrganizationId: jest.fn(),
    },
    organizationMembers: {
      findByOrganizationId: jest.fn(),
    },
  },
}))
