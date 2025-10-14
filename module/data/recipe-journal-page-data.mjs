import CONSTANTS from "../constants.mjs";

/**
 * @import HotpotChatMessage from "../_types.mjs"
 */

/**
 * Hotpot Message Data model.
 * @extends  {foundry.abstract.TypeDataModel<any>}
*/
export default class RecipeJournalPageData extends foundry.abstract.TypeDataModel {
  static get metadata() {
    return {
      label: "Recipe",
      labelPlural: "Recipes",
      type: `${CONSTANTS.MODULE_ID}.recipe`,
      icon: "icons/svg/book.svg",
    };
  }

  get metadata() {
    return this.constructor.metadata;
  }

  /** @inheritDoc */
  static defineSchema() {
    const { SchemaField, TypedObjectField, NumberField, ForeignDocumentField, StringField, FilePathField } = foundry.data.fields;
    return {
      flavors: new SchemaField(Object.fromEntries(
        Object.keys(CONFIG.HOTPOT.flavors).map(k => [k, new NumberField({ initial: 0 })]),
      )),
      img: new FilePathField({
        categories: ["IMAGE"],
        initial: RecipeJournalPageData.metadata.icon, 
      }),
      ingredients: new TypedObjectField(new SchemaField({
        name: new StringField(),
        quantity: new NumberField({
          min: 1,
          initial: 1,
          required: true,
        }),
      })),
      source: new ForeignDocumentField(foundry.documents.BaseChatMessage, { idOnly: true }),
    };
  }

  /**
   * Search for and, if not found, create a new category "Hotpot Recipes" in the indicated journal.
   * @param {foundry.documents.JournalEntry} journal - The jorunal where the category will be.
   * @returns {Promise<foundry.documents.JournalEntryCategory>}
   */
  static async getRecipeCategory(journal) {
    if(!(journal instanceof foundry.documents.JournalEntry)) return;
    const category = journal.categories.find(c => c.getFlag(CONSTANTS.MODULE_ID, CONSTANTS.JOURNAL_FLAGS.CATEGORY));
    if(category) return category;
    
    const { JournalEntryCategory } = foundry.documents;
    const categories = journal.categories.contents ?? [];
    
    return await JournalEntryCategory.implementation.create({
      name: "Hotpot Recipes",
      sort: (categories.length + 1) * CONST.SORT_INTEGER_DENSITY,
      [`flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.JOURNAL_FLAGS.CATEGORY}`]: true,
    }, { parent: journal });
  }
}