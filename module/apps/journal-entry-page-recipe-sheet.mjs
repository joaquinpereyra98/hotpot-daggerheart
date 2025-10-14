import CONSTANTS from "../constants.mjs";

const { JournalEntryPageHandlebarsSheet } = foundry.applications.sheets.journal;

/**
 * An Application responsible for displaying and editing a recipe-type JournalEntryPage Document.
 * @extends foundry.applications.sheets.journal.JournalEntryPageHandlebarsSheet
 */
export default class JournalEntryPageRecipeSheet extends JournalEntryPageHandlebarsSheet {
  /** @type {Partial<import("@client/applications/_types.mjs").ApplicationConfiguration>} */
  static DEFAULT_OPTIONS = {
    classes: ["hotpot", "recipe-sheet", "daggerheart", "dh-style"],
    window: { icon: "fa-solid fa-file-pdf" }, 
    viewClasses: ["hotpot"],
    actions: {
      createIngredient: JournalEntryPageRecipeSheet.#onCreateIngredient,
      deleteIngredient: JournalEntryPageRecipeSheet.#onDeleteIngredient,
    },
  };

  /** @inheritdoc */
  static EDIT_PARTS = {
    header: {
      template: `${CONSTANTS.TEMPLATE_PATH}/recipe-sheet/edit-header.hbs`,
      classes: ["header"],
    },
    content: {
      template: `${CONSTANTS.TEMPLATE_PATH}/recipe-sheet/edit.hbs`, 
      classes: ["standard-form", "content"],
      scrollable: [""],
    },
  };

  /** @inheritdoc */
  static VIEW_PARTS = {
    header: {
      template: `${CONSTANTS.TEMPLATE_PATH}/recipe-sheet/view-header.hbs`,
      classes: ["header"],
    },
    content: {
      template: `${CONSTANTS.TEMPLATE_PATH}/recipe-sheet/view.hbs`,
      classes: ["content"],
      scrollable: [""],
    },
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    await super._prepareContentContext(context, options);

    const { TextEditor } = foundry.applications.ux;
    
    context.flavors = Object.fromEntries(Object.entries(this.document.system.flavors).map(([k,s]) => {
      const cfg = CONFIG.HOTPOT.flavors[k];
      return [k, {
        strength: s ?? 0,
        label: game.i18n.localize(cfg.label),
        dieFace: cfg.dieFace,
      }]; 
    }));
    context.description = {
      value: this.document.text.content,
      field: this.document.schema.getField("text.content"),
      enriched: await TextEditor.implementation.enrichHTML(this.document.text.content, {
        relativeTo: this.document,
        secrets: game.user.isGM,
      }),
    };
  } 

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */
  /**
   * 
   * @this {IngredientSheet}
   * @type {import("@client/applications/_types.mjs").ApplicationClickAction}
   */
  static async #onCreateIngredient(){
    const id = foundry.utils.randomID();
    await this.document.update({ [`system.ingredients.${id}.name`]: "New Ingredient" });
  }
  /**
   * 
   * @this {IngredientSheet}
   * @type {import("@client/applications/_types.mjs").ApplicationClickAction}
   */
  static async #onDeleteIngredient(_, target){
    const { key } = target.dataset;
    await this.document.update({ [`system.ingredients.-=${key}`]: null });
  }

}