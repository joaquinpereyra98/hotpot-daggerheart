import * as data from "./module/data/_module.mjs";
import * as apps from "./module/apps/_module.mjs";
import * as hooks from "./module/hooks/_module.mjs";
import * as socket from "./module/sockets-callbacks.mjs";

import { moduleToObject, registerDataModel, registerModuleSheet } from "./module/utils.mjs";
import HOTPOT_CONFIG from "./module/config.mjs";
import CONSTANTS from "./module/constants.mjs";

foundry.utils.setProperty(
  globalThis,
  "HOTPOT",
  {
    data: moduleToObject(data, false),
    apps: moduleToObject(apps, false),
    socket: moduleToObject(socket, false),
    hooks: moduleToObject(hooks, false),
    api: { startFeast: data.HotpotMessageData.create },
  },
);

CONFIG.HOTPOT = HOTPOT_CONFIG;

Hooks.on("init", () => {
  const { data, socket, apps } = HOTPOT;

  data.IngredientModel = data.createIngredientModel();

  CONFIG.queries[CONSTANTS.queries.updateHotpotAsGm] = socket._onUpdateHotpotAsGm;

  registerDataModel(data.IngredientModel);
  registerDataModel(data.HotpotMessageData);
  registerDataModel(data.RecipeJournalPageData);

  apps.IngredientSheet = apps.createIngredientSheet();
  
  registerModuleSheet(apps.IngredientSheet, foundry.documents.Item, { types: [data.IngredientModel.metadata.type] });
  registerModuleSheet(apps.JournalEntryPageRecipeSheet, foundry.documents.JournalEntryPage, { types: [data.RecipeJournalPageData.metadata.type] });

});

Hooks.on("renderCharacterSheet", hooks.onRenderCharacterSheet);