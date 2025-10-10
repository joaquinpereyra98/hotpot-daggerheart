

/**
 * @import HotpotMessageData from "./data/hotpot-message-data.mjs";
 * @typedef {foundry.documents.ChatMessage & { system: HotpotMessageData & HotpotMessageDataInterface }} HotPotChatMessage
 */

/**
 * @callback ChatMessagesClickAction - An on-click action supported by HotpotMessageData.
 * @param {PointerEvent} event - The originating click event
 * @param {HTMLElement} target - The capturing HTML element which defines the [data-action]
 * @returns {void|Promise<void>}
 */

/**
 * @typedef {Object} IngredientFieldData
 * @property {string} uuid
 * @property {number} quantity
 */

/**
 * @typedef {Object} FlavorPoolData
 * @property {number} d4
 * @property {number} d6
 * @property {number} d8  
 * @property {number} d10
 * @property {number} d12
 */

/**
 * @typedef {Object} RecipeData
 * @property {string} name
 * @property {string} description
 * @property {foundry.documents.JournalEntry} journal  
 * @property {number} d10
 * @property {number} d12
 */

/**
 * @typedef {object} HotpotMessageDataInterface
 * @property {RecipeData} recipe
 * @property {Boolean} completed
 * @property {Record<string, IngredientFieldData>} ingredients
 * @property {FlavorPoolData} currentPool
 * @property {Number} mealRating
 * @property {foundry.dice.terms.Die[]} dicePool
 * @property {Number} tokens
 * @property {Number} step
 */


