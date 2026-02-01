/**
 * Trace filename template system.
 *
 * Available variables:
 * - $date     - YYMMDD format (e.g., "260201")
 * - $datetime - YYMMDD_HHMMSS format (e.g., "260201_143052")
 * - $steps    - Total number of steps (e.g., "8201")
 * - $loss     - Best error in 1-sig-fig scientific notation (e.g., "6e-9")
 * - $shapes   - Number of shapes (e.g., "3")
 * - $type     - Shape types shorthand (e.g., "3e" for 3 ellipses, "2c1e" for 2 circles + 1 ellipse)
 *
 * Default template: "apvd_$date_x$steps_$loss"
 * Example output: "apvd_260201_x8201_6e-9.json"
 */

export const DEFAULT_TEMPLATE = "apvd_$date_x$steps_$loss"

// All available template variables
export const TEMPLATE_VARS = {
  date: "YYMMDD date (e.g., 260201)",
  datetime: "YYMMDD_HHMMSS (e.g., 260201_143052)",
  steps: "Total steps (e.g., 8201)",
  loss: "Best error, 1 sig fig (e.g., 6e-9)",
  shapes: "Number of shapes (e.g., 3)",
  type: "Shape types (e.g., 3e, 2c1e)",
} as const

export type TemplateVarName = keyof typeof TEMPLATE_VARS

// Values for template interpolation
export interface TemplateValues {
  date: string
  datetime: string
  steps: string
  loss: string
  shapes: string
  type: string
}

/**
 * Format error to 1 sig fig scientific notation (e.g., 2.3e-8 -> "2e-8")
 */
export function formatError1sf(err: number): string {
  if (err === 0) return "0"
  if (!isFinite(err)) return "inf"
  const exp = Math.floor(Math.log10(Math.abs(err)))
  const mantissa = Math.round(err / Math.pow(10, exp))
  return `${mantissa}e${exp}`
}

/**
 * Build template values from current state.
 */
export function buildTemplateValues(
  totalSteps: number,
  minError: number,
  shapeTypes: Array<"Circle" | "XYRR" | "XYRRT" | "Polygon">,
): TemplateValues {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')

  // Count shape types for $type variable
  const typeCounts: Record<string, number> = {}
  for (const t of shapeTypes) {
    const short = t === "Circle" ? "c" : t === "Polygon" ? "p" : "e"
    typeCounts[short] = (typeCounts[short] || 0) + 1
  }
  // Format as "3e" or "2c1e" etc.
  const typeStr = Object.entries(typeCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => `${count}${type}`)
    .join("")

  return {
    date: `${yy}${mm}${dd}`,
    datetime: `${yy}${mm}${dd}_${hh}${min}${ss}`,
    steps: String(totalSteps),
    loss: formatError1sf(minError),
    shapes: String(shapeTypes.length),
    type: typeStr || "0",
  }
}

/**
 * Parse template and identify any invalid variables.
 * Variable names are alphanumeric only (no underscores) to allow underscores as delimiters.
 * Returns array of invalid variable names found.
 */
export function validateTemplate(template: string): string[] {
  const varPattern = /\$([a-zA-Z][a-zA-Z0-9]*)/g
  const invalid: string[] = []
  let match

  while ((match = varPattern.exec(template)) !== null) {
    const varName = match[1]
    if (!(varName in TEMPLATE_VARS)) {
      invalid.push(varName)
    }
  }

  return invalid
}

/**
 * Interpolate template with values.
 * Variable names are alphanumeric only (no underscores).
 * Unknown variables are left as-is (e.g., "$unknown" stays "$unknown").
 */
export function interpolateTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\$([a-zA-Z][a-zA-Z0-9]*)/g, (match, varName) => {
    if (varName in values) {
      return values[varName as TemplateVarName]
    }
    return match // Leave unknown variables as-is
  })
}

/**
 * Generate filename from template and values.
 * Adds .json extension if not present.
 * If template ends with .gz, the caller should compress.
 */
export function generateFilename(template: string, values: TemplateValues): {
  filename: string
  compress: boolean
} {
  let filename = interpolateTemplate(template, values)

  // Check for .gz suffix
  const compress = filename.endsWith('.gz')
  if (compress) {
    filename = filename.slice(0, -3) // Remove .gz for now, will be added back after compression
  }

  // Ensure .json extension
  if (!filename.endsWith('.json')) {
    filename += '.json'
  }

  // Add .gz back if compression requested
  if (compress) {
    filename += '.gz'
  }

  return { filename, compress }
}
