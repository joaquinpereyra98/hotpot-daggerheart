/**
 * Convert a module namespace into a plain object.
 * Strips off default exports and meta-properties.
 *
 * @param {object} module - The imported module namespace.
 * @param {boolean} [includeDefault=false] - Whether to keep the default export.
 * @returns {object} A plain object with only named exports.
 */
export function moduleToObject(module, includeDefault = false) {
  const obj = {};
  for (const [key, value] of Object.entries(module)) {
    if (key === "default" && !includeDefault) continue;
    obj[key] = value;
  }
  return obj;
}
