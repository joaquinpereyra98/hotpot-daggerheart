import * as data from "./module/data/_module.mjs";
import * as apps from "./module/apps/_module.mjs";
import * as hooks from "./module/hooks/_module.mjs";

import { moduleToObject } from "./module/utils.mjs";
import HOTPOT_CONFIG from "./module/config.mjs";
import CONSTANTS from "./module/constants.mjs";

globalThis.HOTPOT = {
  data: moduleToObject(data),
  apps: {},
}

Hooks.on("init", () => {
  CONFIG.HOTPOT = HOTPOT_CONFIG;
  CONFIG.Item.dataModels[HOTPOT.data.IngredientModel.metadata.type] = data.IngredientModel;
  HOTPOT.apps.IngredientSheet = apps.createIngredientSheet();

  foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.Item, CONSTANTS.MODULE_ID, HOTPOT.apps.IngredientSheet, {
    makeDefault: true,
    types: [HOTPOT.data.IngredientModel.metadata.type],
  });
});

Hooks.on("renderCharacterSheet", hooks.onRenderCharacterSheet)
