import HotpotMessageData from "./data/hotpot-message-data.mjs";

const { type } = HotpotMessageData.metadata;
const { isEmpty } = foundry.utils;

/**
 * Update a Foundry document as the GM.
 * @param {Object} params - Parameters for the update operation.
 * @param {string} params.messageId - The UUID of the document to update.
 * @param {Object} params.data - Differential update data which modifies the existing values of this document
 * @param {Partial<Omit<import("@common/abstract/_types.mjs").DatabaseUpdateOperation, "updates">>} [params.operation] - Parameters of the update operation
 * @returns {Promise<foundry.abstract.Document|undefined>} The updated document, or `undefined` if no update occurred.
 */
export async function _onUpdateHotpotAsGm({ messageId, data, operation } = {}) {
  /**@type {import("./_types.mjs").HotpotChatMessage} */
  const doc = game.messages.get(messageId);

  if (
    isEmpty(data) ||
    doc?.type !== type ||
    doc?.system?.completed ||
    !game.user.isGM
  ) return;

  return await doc.update(data, operation);
}