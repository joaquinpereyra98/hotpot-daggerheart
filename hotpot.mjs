import * as data from "./module/data/_module.mjs";
import * as apps from "./module/apps/_module.mjs";
import * as hooks from "./module/hooks/_module.mjs";
import * as socket from "./module/sockets-callbacks.mjs";

import { moduleToObject } from "./module/utils.mjs";
import HOTPOT_CONFIG from "./module/config.mjs";
import CONSTANTS from "./module/constants.mjs";

const { DocumentSheetConfig } = foundry.applications.apps;

globalThis.HOTPOT = {
  data: moduleToObject(data),
  apps: {},
};

Hooks.on("init", () => {
  CONFIG.HOTPOT = HOTPOT_CONFIG;

  CONFIG.Item.dataModels[data.IngredientModel.metadata.type] = data.IngredientModel;
  CONFIG.ChatMessage.dataModels[data.HotpotMessageData.metadata.type] = data.HotpotMessageData;
  CONFIG.queries[CONSTANTS.queries.updateHotpotAsGm] = socket._onUpdateHotpotAsGm;

  HOTPOT.apps.IngredientSheet = apps.createIngredientSheet();
  HOTPOT.apps.HotpotConfig = apps.HotpotConfig

  DocumentSheetConfig.registerSheet(foundry.documents.Item, CONSTANTS.MODULE_ID, HOTPOT.apps.IngredientSheet, {
    makeDefault: true,
    types: [HOTPOT.data.IngredientModel.metadata.type],
  });
});

Hooks.on("renderCharacterSheet", hooks.onRenderCharacterSheet);
Hooks.on("renderChatMessageHTML", data.HotpotMessageData.onRenderChatMessageHTML);
