import CONSTANTS from '../constants.mjs';

/**
 * Factory function that creates a custom Item Sheet for ingredients.
 * This function is only because system classes are not exposed globally before init
 * @function createIngredientSheet
 * @returns {typeof foundry.applications.sheets.ItemSheetV2}
 */
export default function createIngredientSheet() {
  /**@type {foundry.applications.sheets.ItemSheetV2}} */
  const BaseItemSheet = game.system.api.applications.sheets.api.DHBaseItemSheet;

  /**
   * @extends foundry.applications.sheets.ItemSheetV2
   */
  class IngredientSheet extends BaseItemSheet {
    /**@inheritdoc */
    static DEFAULT_OPTIONS = {
      classes: ['ingredient', "hotpot"],
      position: { width: 550 },
      actions: {
        addFlavor: IngredientSheet.#onAddFlavor
      },
      contextMenus: [
        {
          handler: IngredientSheet.#getFlavorContextOptions,
          selector: "[data-flavor]",
          options: { parentClassHooks: false, fixed: true }
        }
      ]
    };

    /**@override */
    static TABS = {}

    /**@override */
    static PARTS = {
      header: { template: `${CONSTANTS.TEMPLATE_PATH}/ingredient-sheet/header.hbs` },
      main: { template: `${CONSTANTS.TEMPLATE_PATH}/ingredient-sheet/main.hbs` }
    };

    /**@inheritdoc */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.flavorChoices = [{ key: "" },
      ...Object.entries(CONFIG.HOTPOT.flavors)
        .map(([key, v]) => ({ key, label: `${v.label} (d${v.dieFace})` }))
        .filter(f => !Object.keys(this.item.system.flavors).includes(f.key))];

      context.enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(this.item.system.description, {
        relativeTo: this.item,
        rollData: this.item.getRollData(),
        secrets: this.item.isOwner
      })

      return context;
    }

    /* -------------------------------------------- */
    /*  Context Menu                                */
    /* -------------------------------------------- */

    /**
   * Get the set of ContextMenu options for Features.
   * @returns {import('@client/applications/ux/context-menu.mjs').ContextMenuEntry[]} - The Array of context options passed to the ContextMenu instance
   * @this {IngredientSheet}
   * @protected
   */
    static #getFlavorContextOptions() {
      return [{
        name: 'CONTROLS.CommonDelete',
        icon: '<i class="fa-solid fa-trash"></i>',
        callback: async target => {
          const { flavor } = target.closest("[data-flavor]").dataset;
          if (!flavor) return;
          await this.document.update({ [`system.flavors.-=${flavor}`]: null });
        }
      }]
    }


    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * 
     * @this {IngredientSheet}
     * @type {import("@client/applications/_types.mjs").ApplicationClickAction}
     */
    static async #onAddFlavor() {
      /**@type {HTMLSelectElement} */
      const select = this.element.querySelector(`[id="${this.id}-newFlavorType"]`);
      if (!select.value) return;
      return await this.item.update({
        [`system.flavors.${select.value}.strength`]: 1
      });
    }

  }

  return IngredientSheet;
}