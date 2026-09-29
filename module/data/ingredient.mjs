import CONSTANTS from "../constants.mjs";

/**
 * Creates the IngredientModel class extending the system's DHLoot DataModel.
 * @returns {typeof IngredientModel}
 */
export default function createIngredientModel() {
  /** @type {typeof foundry.abstract.TypeDataModel} */
  const DHLoot = game.system.api.models.items.DHLoot;

  class IngredientModel extends DHLoot {
    static get metadata() {
      return {
        documentName: foundry.documents.Item.metadata.name,
        label: "Ingredient",
        labelPlural: "Ingredients",
        type: `${CONSTANTS.MODULE_ID}.ingredient`,
        isInventoryItem: true,
        hasDescription: true,
        hasActions: false,
        hasAttribution: false,
      };
    }

    /**
     * @param {object} [options]
     * @returns {object}
     */
    getRollData(options = {}) {
      const data = this.actor?.getRollData(options) ?? {};
      data.item = { ...this };
      return data;
    }

    static defineSchema() {
      const { TypedObjectField, NumberField, SchemaField } =
        foundry.data.fields;
      return {
        ...super.defineSchema(),
        flavors: new TypedObjectField(
          new SchemaField({
            strength: new NumberField({
              initial: 1,
              min: 1,
              max: 3,
            }),
          }),
          {
            validateKey: (k) => Boolean(CONFIG.HOTPOT?.flavors?.[k]),
          },
        ),
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
          label: _loc(cfg.label),
          dieFace: cfg.dieFace,
        };
      }
    }

    /**
     * @type {Record<string, { strength: number, label: string, dieFace: string }>}
     */
    get preparedFlavors() {
      const prepared = {};
      for (const [k, v] of Object.entries(this.flavors ?? {})) {
        const cfg = CONFIG.HOTPOT?.flavors?.[k];
        if (!cfg) continue;
        prepared[k] = {
          strength: v.strength ?? 0,
          label: _loc(cfg.label),
          dieFace: cfg.dieFace,
        };
      }
      return prepared;
    }

    static DEFAULT_ICON = null;
  }

  return IngredientModel;
}
