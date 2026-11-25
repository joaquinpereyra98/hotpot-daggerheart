import CONSTANTS from "../constants.mjs";

const type = CONSTANTS.DOCS_TYPE.ingredient;

/**
 * Prepares the character sheet render context and context menus for ingredient items.
 * @param {foundry.applications.sheets.ActorSheetV2} application - The character sheet application instance.
 * @param {import("@client/applications/_types.mjs").ApplicationRenderContext} context - The render context data.
 * @param {import("@client/applications/_types.mjs").ApplicationRenderOptions} _options - The render options.
 * @returns {void}
 */
export default function preRenderCharacterSheet(
  application,
  context,
  _options,
) {
  ensureIngredientsSection(application, context);
  ensureIngredientsContextMenu(application);
}

/**
 * Adds an Ingredients section to the inventory context if it does not already exist.
 * @param {foundry.applications.sheets.ActorSheetV2} application - The character sheet application instance.
 * @param {import("@client/applications/_types.mjs").ApplicationRenderContext} context - The render context data.
 * @returns {void}
 */
function ensureIngredientsSection(application, context) {
  const sections = context.inventory?.sections;
  if (!sections || sections.some((section) => section.type === type)) return;

  const collection = (application.actor.itemTypes[type] ?? []).toSorted(
    (a, b) => a.sort - b.sort,
  );

  sections.push({
    canCreate: true,
    collection,
    isQuantifiable: true,
    title: "Ingredients",
    type,
  });
}

/**
 * Registers a context menu configuration for ingredient items if not already present.
 * @param {foundry.applications.sheets.ActorSheetV2} application - The character sheet application instance.
 * @returns {void}
 */
function ensureIngredientsContextMenu(application) {
  const selector = `[data-item-uuid][data-type="${type}"]`;
  const menus = application.options.contextMenus;
  if (!menus || menus.some((entry) => entry.selector?.includes(selector)))
    return;

  menus.push({
    handler() {
      return this._getContextMenuCommonOptions({ usable: false, toChat: true });
    },
    selector,
    options: {
      parentClassHooks: false,
      fixed: true,
    },
  });
}
