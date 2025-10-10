/**FOUNDRY TYPES */
import "@client/global.mjs";
import Canvas from "@client/canvas/board.mjs";
import * as globalConfig from "@client/config.mjs";

/**MODULE TYPES */
import HOTPOT_CONFIG from "./module/config.mjs";
import * as apps from "./module/apps/_module.mjs";
import * as data from "./module/data/_module.mjs";
import * as socket from "./module/sockets-callbacks.mjs";
import * as hooks from "./module/hooks/_module.mjs";

// Foundry's use of `Object.assign(globalThis)` means many globally available objects are not read as such
// This declare global hopefully fixes that
declare global {
  /**
   * A simple event framework used throughout Foundry Virtual Tabletop.
   * When key actions or events occur, a "hook" is defined where user-defined callback functions can execute.
   * This class manages the registration and execution of hooked callback functions.
   */
  class Hooks extends foundry.helpers.Hooks {}

  const fromUuid: typeof foundry.utils.fromUuid;
  const fromUuidSync: typeof foundry.utils.fromUuidSync;

  /**
   * The singleton game canvas
   */
  const canvas: Canvas;

  const CONFIG: typeof globalConfig & {
    HOTPOT: typeof HOTPOT_CONFIG;
  };

  /**
   * Global HOTPOT API namespace.
   */
  const HOTPOT: {
    data: typeof data;
    apps: typeof apps & {
      IngredientSheet: typeof foundry.applications.sheets.ItemSheetV2;
    };
    socket: typeof socket;
    hooks: typeof hooks;
    api: {
      startFeast: (options?: foundry.documents.types.ChatMessageData) => foundry.documents.ChatMessage;
    };
  };
}
