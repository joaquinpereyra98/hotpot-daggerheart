/**
 * 
 * @param {foundry.applications.sheets.ActorSheetV2} application 
 * @param {HTMLElement} element 
 * @param {import("@client/applications/_types.mjs").ApplicationRenderContext} context 
 * @param {import("@client/applications/_types.mjs").ApplicationRenderOptions} options 
 */
export default async function onRenderCharacterSheet(application, element, context, options) {
  const template = await foundry.applications.handlebars.renderTemplate("daggerheart.inventory-items", {
    title: 'TYPES.Item.hot-pot-daggerheart.ingredient',
    type: 'hot-pot-daggerheart.ingredient',
    collection: application.actor.itemTypes["hot-pot-daggerheart.ingredient"],
    isGlassy: true,
    canCreate: true,
    hideTooltip: true,
    hideResources: true,
    showActions: false,
    hideDescription: true,
  });

  const itemSection = element.querySelector(".tab.inventory .items-section");
  itemSection.insertAdjacentHTML("beforeend", template);


  const syntheticEvent = { type: 'pointerdown', bubbles: true, cancelable: true, pointerType: 'mouse', isPrimary: true, button: 0 };
  const contentElement = element.querySelector("[data-application-part='inventory'] .items-section");
  await application._onMenuFilterInventory(syntheticEvent, contentElement, []);
  if (options.isFirstRender) {
    application._createContextMenu(
      () => application._getContextMenuCommonOptions.call(application, { usable: false, toChat: false }),
      "[data-item-uuid][data-type='hot-pot-daggerheart.ingredient']",
      { parentClassHooks: false, fixed: true });
  }
}