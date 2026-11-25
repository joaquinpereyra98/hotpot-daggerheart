import CONSTANTS from "../constants.mjs";

/**
 * @typedef {Object} PreparedFlavor
 * @property {number} strength
 * @property {string} label
 * @property {string} dieFace
 */

/**
 * Creates the IngredientModel class extending the system's DHLoot DataModel.
 * @returns {typeof foundry.abstract.TypeDataModel}
 */
export default function createIngredientModel() {
  /** @type {typeof foundry.abstract.TypeDataModel} */
  const BaseDataItem = Object.getPrototypeOf(
    game.system.api.models.items.DHLoot,
  );

  class IngredientModel extends BaseDataItem {
    /** @inheritdoc */
    static get metadata() {
      return {
        documentName: foundry.documents.Item.metadata.name,
        label: "Ingredient",
        labelPlural: "Ingredients",
        type: CONSTANTS.DOCS_TYPE.ingredient,
        hasDescription: true,
        hasResource: false,
        isInventoryItem: true,
        hasActions: false,
        hasAttribution: true,
      };
    }

    /** @inheritdoc */
    static defineSchema() {
      const { TypedObjectField, SchemaField, NumberField } =
        foundry.data.fields;

      return {
        ...super.defineSchema(),
        flavors: new TypedObjectField(
          new SchemaField({
            strength: new NumberField({ initial: 1, min: 1, max: 3 }),
          }),
          {
            validateKey: (k) => !!CONFIG.HOTPOT?.flavors?.[k],
          },
        ),
      };
    }

    /** @inheritdoc */
    prepareBaseData() {
      super.prepareBaseData();

      const flavors = /** @type {Record<string, { strength?: number }>} */ (
        this.flavors ?? {}
      );
      const flavorConfigs =
        /** @type {Record<string, { label: string, dieFace: string }> | undefined} */ (
          CONFIG.HOTPOT?.flavors
        );

      for (const [k, v] of Object.entries(flavors)) {
        const cfg = flavorConfigs?.[k];
        if (!cfg) continue;
        v.strength ??= 0;
      }
    }

    /**
     * @returns {Record<string, PreparedFlavor>}
     */
    get preparedFlavors() {
      /** @type {Record<string, PreparedFlavor>} */
      const prepared = {};

      const flavors = /** @type {Record<string, { strength?: number }>} */ (
        this.flavors ?? {}
      );
      const flavorConfigs =
        /** @type {Record<string, { label: string, dieFace: string }> | undefined} */ (
          CONFIG.HOTPOT?.flavors
        );

      for (const [k, v] of Object.entries(flavors)) {
        const cfg = flavorConfigs?.[k];
        if (!cfg) continue;

        prepared[k] = {
          strength: v.strength ?? 0,
          label: _loc(cfg.label),
          dieFace: cfg.dieFace,
        };
      }

      return prepared;
    }
  }

  return IngredientModel;
}
