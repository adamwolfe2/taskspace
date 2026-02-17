/**
 * Importer Factory
 * Returns the appropriate importer based on provider
 */

import type { ImportProvider } from '../types'
import { BaseImporter } from './base'
import { TrelloImporter } from './trello'

/**
 * Get importer instance for provider
 */
export function getImporter(provider: ImportProvider): BaseImporter {
  switch (provider) {
    case 'trello':
      return new TrelloImporter()
    case 'asana':
      throw new Error('Asana importer not yet implemented')
    case 'generic_csv':
      throw new Error('Generic CSV importer not yet implemented')
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * Auto-detect provider from file
 */
export function detectProvider(
  file: File | Buffer,
  fileName: string
): ImportProvider | null {
  const importers: BaseImporter[] = [
    new TrelloImporter(),
    // Add more importers as they're implemented
  ]

  for (const importer of importers) {
    if (importer.detect(file, fileName)) {
      return importer.provider
    }
  }

  return null
}

// Re-export types and classes
export { BaseImporter } from './base'
export { TrelloImporter } from './trello'
