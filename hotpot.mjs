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

Hooks.on("init", () => {
  const { data, socket, apps } = HOTPOT;
  apps.IngredientSheet = apps.createIngredientSheet();

  CONFIG.HOTPOT = HOTPOT_CONFIG;
  CONFIG.queries[CONSTANTS.queries.updateHotpotAsGm] = socket._onUpdateHotpotAsGm;

  registerDataModel(data.IngredientModel);
  registerDataModel(data.HotpotMessageData);
  registerDataModel(data.RecipeJournalPageData);
  
  registerModuleSheet(apps.IngredientSheet, foundry.documents.Item, { types: [data.IngredientModel.metadata.type] });
  registerModuleSheet(apps.JournalEntryPageRecipeSheet, foundry.documents.JournalEntryPage, { types: [data.RecipeJournalPageData.metadata.type] });

  stupidPatchIMustRemove();
});

function stupidPatchIMustRemove() {
  const { id, fn } = Hooks.events.renderChatMessageHTML[0];
  Hooks.on("renderChatMessageHTML", (message, html, context) => {
    fn(message, html, context ?? { message: message.toObject() });
  });
  Hooks.off("renderChatMessageHTML", id);
}

Hooks.on("renderCharacterSheet", hooks.onRenderCharacterSheet);
