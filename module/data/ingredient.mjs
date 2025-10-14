import CONSTANTS from "../constants.mjs";

export default class IngredientModel extends foundry.abstract.TypeDataModel {
  static get metadata() {
    return {
      documentName: foundry.documents.Item.metadata.name,
      label: "Ingredient",
      labelPlural: "Ingredients",
      type: `${CONSTANTS.MODULE_ID}.ingredient`,
      isInventoryItem: true,
    };
  }

  get metadata() {
    return IngredientModel.metadata;
  }

  /**@override */
  static defineSchema() {
    const { HTMLField, TypedObjectField, NumberField, SchemaField } = foundry.data.fields;
    return {
      description: new HTMLField({
        required: true,
        nullable: true, 
      }),
      flavors: new TypedObjectField(new SchemaField({
        strength: new NumberField({
          initial: 1,
          min: 1,
          max: 3, 
        }),
      }), { validateKey: (k) => Object.keys(CONFIG.HOTPOT.flavors).includes(k) }),
      quantity: new NumberField({
        integer: true,
        initial: 1,
        positive: true,
        required: true, 
      }),
    };
  }

  /**@inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();

    for (const [k, v] of Object.entries(this.flavors)) {
      const cfg = CONFIG.HOTPOT.flavors[k];
      this.flavors[k] = {
        strength: v.strength ?? 0,
        label: game.i18n.localize(cfg.label),
        dieFace: cfg.dieFace,
      };
    }


  }

  /**
  * The default icon used for newly created Item documents
  * @type {string}
  */
  static DEFAULT_ICON = null;
}