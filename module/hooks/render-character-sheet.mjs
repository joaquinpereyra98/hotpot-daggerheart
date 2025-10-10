/**
 * 
 * @param {foundry.applications.sheets.ActorSheetV2} application 
 * @param {HTMLElement} element 
 * @param {import("@client/applications/_types.mjs").ApplicationRenderContext} context 
 * @param {import("@client/applications/_types.mjs").ApplicationRenderOptions} options 
 */
export default function onRenderCharacterSheet(application, element, context, options) {
  const itemSection = element.querySelector(".tab.inventory .items-section");

  const template = Handlebars.partials["daggerheart.inventory-items"]({
    title: "TYPES.Item.hotpot-daggerheart.ingredient",
    type: "hotpot-daggerheart.ingredient",
    collection: application.actor.itemTypes["hotpot-daggerheart.ingredient"],
    isGlassy: true,
    canCreate: true,
    hideTooltip: true,
    hideResources: false,
    showActions: false,
    hideDescription: true,
  }, {
    allowProtoMethodsByDefault: true,
    allowProtoPropertiesByDefault: true, 
  });

  const fieldsset = foundry.utils.parseHTML(template);
  fieldsset.classList.add("hotpot");
  fieldsset.querySelectorAll(".inventory-item").forEach(el => {
    el.ondragstart = /** @param {DragEvent} event */ (event) => {
      const { itemId } = event.target.dataset;
      if (!itemId) return;
      const item = application.actor.items.get(itemId);
      event.dataTransfer.setData("text/plain", JSON.stringify(item.toDragData()));
    };
  });
  itemSection.appendChild(fieldsset);


  const syntheticEvent = {
    type: "pointerdown",
    bubbles: true,
    cancelable: true,
    pointerType: "mouse",
    isPrimary: true,
    button: 0, 
  };
  application._onMenuFilterInventory(syntheticEvent, itemSection, []);

  if (options.isFirstRender) {
    application._createContextMenu(
      () => application._getContextMenuCommonOptions.call(application, {
        usable: false,
        toChat: false, 
      }),
      "[data-item-uuid][data-type='hotpot-daggerheart.ingredient']",
      {
        parentClassHooks: false,
        fixed: true, 
      });
    fieldsset.querySelectorAll(".inventory-item-quantity").forEach(el => el.addEventListener("change", application.updateItemQuantity.bind(application)));
  }
}