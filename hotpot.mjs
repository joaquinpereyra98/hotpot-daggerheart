import * as data from "./module/data/_module.mjs";
import * as apps from "./module/apps/_module.mjs";
import * as hooks from "./module/hooks/_module.mjs";
import * as socket from "./module/sockets-callbacks.mjs";

import { moduleToObject } from "./module/utils.mjs";
import HOTPOT_CONFIG from "./module/config.mjs";
import CONSTANTS from "./module/constants.mjs";

const { DocumentSheetConfig } = foundry.applications.apps;

foundry.utils.setProperty(
  globalThis,
  "HOTPOT",
  {
    data: moduleToObject(data, false),
    apps: moduleToObject(apps, false),
    socket: moduleToObject(socket, false),
    hooks: moduleToObject(hooks, false),
    api: {
      startFeast: data.HotpotMessageData.create,
    },
  }
)

Hooks.on("init", () => {
  const { data, socket, apps } = HOTPOT;

  CONFIG.HOTPOT = HOTPOT_CONFIG;

  CONFIG.Item.dataModels[data.IngredientModel.metadata.type] = data.IngredientModel;
  CONFIG.ChatMessage.dataModels[data.HotpotMessageData.metadata.type] = data.HotpotMessageData;
  CONFIG.queries[CONSTANTS.queries.updateHotpotAsGm] = socket._onUpdateHotpotAsGm;

  apps.IngredientSheet = apps.createIngredientSheet();

  DocumentSheetConfig.registerSheet(foundry.documents.Item, CONSTANTS.MODULE_ID, apps.IngredientSheet, {
    makeDefault: true,
    types: [data.IngredientModel.metadata.type],
  });

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
