"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error loading ${key} from localStorage:`, error)
      }
      Sentry.captureException(error)
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error saving ${key} to localStorage:`, error)
      }
      Sentry.captureException(error)
    }
  }

  return [storedValue, setValue] as const
}
