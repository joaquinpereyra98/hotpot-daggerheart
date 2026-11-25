const MODULE_ID = "hotpot-daggerheart";

/**
 * @typedef {Object} CookingStep
 * @property {number} index
 * @property {string} label
 * @property {"ingredients" | "record" | "roll"} id
 * @property {string} icon
 */

const CONSTANTS = foundry.utils.deepFreeze({
  MODULE_ID,

  DOCS_TYPE: /** @type {const} */ ({
    hotpot: `${MODULE_ID}.hotpot`,
    ingredient: `${MODULE_ID}.ingredient`,
    recipe: `${MODULE_ID}.recipe`,
  }),

  TEMPLATE_PATH: `modules/${MODULE_ID}/templates`,

  /** @type {readonly CookingStep[]} */
  STEPS: [
    {
      index: 0,
      label: "Select Ingredients",
      id: "ingredients",
      icon: "fa-solid fa-kitchen-set",
    },
    {
      index: 1,
      label: "Record Recipe",
      id: "record",
      icon: "fa-solid fa-book-bookmark",
    },
    {
      index: 2,
      label: "Roll Flavor",
      id: "roll",
      icon: "fa-solid fa-dice",
    },
  ],

  QUERIES: /** @type {const} */ ({
    updateHotpotAsGm: `${MODULE_ID}.updateHotpotAsGm`,
  }),

  JOURNAL_FLAGS: /** @type {const} */ ({
    CATEGORY: "isRecipeCategory",
    FLAVORS: "flavorProfile",
    MESSAGE: "sourceMessage",
  }),
});

export default CONSTANTS;
