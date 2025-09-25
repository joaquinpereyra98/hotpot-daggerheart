const CONSTANTS = foundry.utils.deepFreeze({
  MODULE_ID: "hotpot-daggerheart",
  TEMPLATE_PATH: "modules/hotpot-daggerheart/templates",
  STEPS: [{
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
  }],
  queries: {
    updateHotpotAsGm: "hotpot-daggerheart.updateHotpotAsGm"
  },
  JOURNAL_FLAGS: {
    CATEGORY: "isRecipeCategory",
    FLAVORS: "flavorProfile",
  }
});

export default CONSTANTS;