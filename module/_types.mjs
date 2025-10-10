

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
 * @property {string} uuid - the Ingredient UUID
 * @property {number} quantity - the amount of the ingredient used
 */

/**
* @typedef {Object} FlavorPoolData - Represents a pool of flavor dice used during recipe rolls.
* @property {number} d4 - Number of d4 flavor dice available.
* @property {number} d6 - Number of d6 flavor dice available.
* @property {number} d8 - Number of d8 flavor dice available.
* @property {number} d10 - Number of d10 flavor dice available.
* @property {number} d12 - Number of d12 flavor dice available.
*/

/**
* @typedef {Object} RecipeData - Represents the basic information and bonuses of a recipe.
* @property {string} name - Name of the recipe.
* @property {string} description - Description or details of the recipe.
* @property {foundry.documents.JournalEntry} journal - Linked journal entry with full recipe notes.
*/

/**
* @typedef {object} HotpotMessageDataInterface - Data structure used when sending messages related to a Hotpot cooking session.
* @property {RecipeData} recipe - The selected recipe for this cooking session.
* @property {Boolean} completed - Whether the cooking session is finished.
* @property {Record<string, IngredientFieldData>} ingredients - Ingredients used, keyed by ID.
* @property {FlavorPoolData} currentPool - Current pool of flavor dice available.
* @property {Number} mealRating - Final rating of the meal after completion.
* @property {foundry.dice.terms.Die[]} dicePool - Dice rolled in the current step.
* @property {Number} tokens - Number of available cooking tokens.
* @property {Number} step - Current step in the cooking process.
*/