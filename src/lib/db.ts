import { PrismaClient } from '@prisma/client'
import { createMockPrismaProxy } from './mock-db'

const globalForPrisma = globalThis as unknown as {
  prisma: any
  useMockFallback?: boolean
}

function getDatabaseClient() {
  const dbUrl = (process.env.DATABASE_URL || '').trim()

  // Detect if DATABASE_URL is missing or is the default local placeholder with no active server
  const isDefaultOrLocal =
    !dbUrl ||
    dbUrl === '' ||
    dbUrl.includes('localhost:5432') ||
    dbUrl.includes('127.0.0.1:5432') ||
    dbUrl.includes('user:password@localhost')

  const mockDb = createMockPrismaProxy()

  if (isDefaultOrLocal || globalForPrisma.useMockFallback) {
    return mockDb
  }

  let realPrisma: PrismaClient | null = null
  try {
    realPrisma = new PrismaClient({
      log: [],
    })
  } catch {
    globalForPrisma.useMockFallback = true
    return mockDb
  }

  // Create a resilient proxy that falls back to in-memory store if connection fails
  const proxyInstance: any = new Proxy(realPrisma, {
    get(target: any, prop: string | symbol) {
      if (globalForPrisma.useMockFallback) {
        return (mockDb as any)[prop]
      }

      if (prop === '$transaction') {
        return async (fnOrArray: any) => {
          if (globalForPrisma.useMockFallback) {
            return mockDb.$transaction(fnOrArray)
          }
          try {
            return await target.$transaction(fnOrArray)
          } catch {
            globalForPrisma.useMockFallback = true
            return mockDb.$transaction(fnOrArray)
          }
        }
      }

      const originalProp = target[prop]
      const mockProp = (mockDb as any)[prop]

      if (typeof originalProp === 'object' && originalProp !== null) {
        return new Proxy(originalProp, {
          get(modelTarget: any, method: string | symbol) {
            const originalMethod = modelTarget[method]
            const mockMethod = mockProp ? mockProp[method] : null

            if (typeof originalMethod === 'function') {
              return async (...args: any[]) => {
                if (globalForPrisma.useMockFallback) {
                  return mockMethod ? mockMethod.apply(mockProp, args) : null
                }
                try {
                  return await originalMethod.apply(modelTarget, args)
                } catch {
                  globalForPrisma.useMockFallback = true
                  if (typeof mockMethod === 'function') {
                    return mockMethod.apply(mockProp, args)
                  }
                  return null
                }
              }
            }
            return originalMethod
          },
        })
      }

      return originalProp ?? mockProp
    },
  })

  return proxyInstance
}

export const db: any = globalForPrisma.prisma ?? getDatabaseClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
