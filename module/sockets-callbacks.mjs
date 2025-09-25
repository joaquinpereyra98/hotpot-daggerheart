import HotpotMessageData from "./data/hotpot-message-data.mjs";

/**
 * Update a Foundry document as the GM.
 * @param {Object} params - Parameters for the update operation.
 * @param {string} params.messageId - The UUID of the document to update.
 * @param {Object} params.data - Differential update data which modifies the existing values of this document
 * @param {Partial<Omit<import("@common/abstract/_types.mjs").DatabaseUpdateOperation, "updates">>} [params.operation] - Parameters of the update operation
 * @returns {Promise<foundry.abstract.Document|undefined>} The updated document, or `undefined` if no update occurred.
 */
export async function _onUpdateHotpotAsGm({ messageId, data, operation } = {}) {
  /**@type {foundry.abstract.Document} */
  const doc = game.messages.get(messageId);
  if (!doc || foundry.utils.isEmpty(data)) return;
  if(doc.type !== HotpotMessageData.metadata.type || doc.system.completed) return;
  return await doc.update(data, operation);
}