import CONSTANTS from "./constants.mjs";

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
/**
 * 
 * @param {foundry.abstract.TypeDataModel} datamodel 
 */
export function registerDataModel(datamodel) {
  const { type, documentName } = datamodel.metadata;
  if(!type || !documentName) return;
  CONFIG[documentName].dataModels[type] = datamodel;
}

/**
 * 
 * @param {foundry.applications.api.ApplicationV2} applicationClass - An Application class used to render the sheet.
 * @param {foundry.abstract.Document} documentClass - The Document class to register a new sheet for.
 * @param {import("@client/applications/apps/document-sheet-config.mjs").SheetRegistrationOptions} options - Sheet registration configuration options
 */
export function registerModuleSheet(applicationClass, documentClass, { makeDefault = true, ...rest } = {}) {
  foundry.applications.apps.DocumentSheetConfig.registerSheet(documentClass, CONSTANTS.MODULE_ID, applicationClass, {
    makeDefault,
    ...rest,
  });

}
