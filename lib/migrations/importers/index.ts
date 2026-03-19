/**
 * Importer Factory
 * Returns the appropriate importer based on provider
 */

import type { ImportProvider } from '../types'
import { BaseImporter } from './base'
import { TrelloImporter } from './trello'
import { AsanaImporter } from './asana'
import { GenericCSVImporter } from './csv'

/**
 * Get importer instance for provider
 */
export function getImporter(provider: ImportProvider): BaseImporter {
  switch (provider) {
    case 'trello':
      return new TrelloImporter()
    case 'asana':
      return new AsanaImporter()
    case 'generic_csv':
      return new GenericCSVImporter()
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
    new AsanaImporter(),
    new GenericCSVImporter(),
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
export { AsanaImporter } from './asana'
export { GenericCSVImporter } from './csv'
