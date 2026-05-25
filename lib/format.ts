/**
 * Currency formatting helpers. Single source of truth so totals, list rows,
 * and tooltips render rupee values identically across the app.
 */

const INTL_OPTS_0: Intl.NumberFormatOptions = { maximumFractionDigits: 0 }
const INTL_OPTS_2: Intl.NumberFormatOptions = { maximumFractionDigits: 2, minimumFractionDigits: 0 }

/**
 * Format a number as Indian-locale rupees, e.g. `1,23,456`. Does NOT include
 * the ₹ symbol — callers prepend it so they can apply their own colour /
 * alignment classes.
 *
 * Default rounds to whole rupees (matches the headline totals + every
 * transaction row); pass `{ decimals: 2 }` for explicit paise.
 */
export function formatINR(value: number, opts: { decimals?: 0 | 2 } = {}): string {
  return value.toLocaleString('en-IN', opts.decimals === 2 ? INTL_OPTS_2 : INTL_OPTS_0)
}
