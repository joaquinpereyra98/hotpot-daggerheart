/**
 * Data field representing an embedded ingredient entry backed by {@link EmbeddedIngredientModel}.
 */
export default class IngredientField
  extends foundry.data.fields.EmbeddedDataField
{
  /**
   * @param {foundry.data.types.DataFieldOptions} [options={}]
   * @param {foundry.data.types.DataFieldContext} [context={}]
   */
  constructor(options = {}, context = {}) {
    super(EmbeddedIngredientModel, options, context);
  }
}

/**
 * Data model for an individual ingredient entry.
 */
class EmbeddedIngredientModel extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    const f = foundry.data.fields;
    return {
      uuid: new f.DocumentUUIDField({
        embedded: true,
        type: "Item",
        blank: false,
      }),
      name: new f.StringField(),
      img: new f.FilePathField({ categories: ["IMAGE"] }),
      quantity: new f.NumberField({
        initial: 1,
        min: 1,
        integer: true,
        nullable: false,
        required: true,
      }),
    };
  }

  /**@override */
  prepareBaseData() {
    const doc = this.document;
    if (doc) {
      this.updateSource({
        img: doc.img,
        name: doc.name,
      });
    }
  }

  /**
   * Retrieve the Ingredient Document by the uuid sync.
   * @returns {foundry.documents.Item|null}
   */
  get document() {
    return foundry.utils.fromUuidSync(this.uuid);
  }

  /**
   * Compute flavor entries scaled by the quantity
   * @returns {Record<string, number>}
   */
  get flavors() {
    const quantity = this.quantity;
    const flavors = this.document?.system?.flavors ?? {};

    return Object.fromEntries(
      Object.entries(flavors).map(([key, flavorData]) => [
        key,
        (Number(flavorData?.strength) || 0) * quantity,
      ]),
    );
  }

  /**
   * Called by HotpotMessageData#_prepareIngredientsUpdate.
   * @param {object} changes - The candidate changes to the Document
   * @param {object} options - Additional options which modify the update request
   * @param {documents.BaseUser} user - The User requesting the document update
   * @returns {Promise<boolean|void>}   A return value of false indicates the update operation should be cancelled.
   */
  async _preUpdate(changes, options, user) {
    options.removedUuids ??= [];
    if (changes === _del) options.removedUuids.push(this.uuid);
    if (this.document) {
      changes.name = this.document.name;
      changes.img = this.document.img;
    }
  }

  /**
   * Called by HotpotMessageData#.
   * @param {object} changed - The differential data that was changed relative to the documents prior values
   * @param {object} options - Additional options which modify the update request
   * @param {string} userId - The id of the User requesting the document update
   * @protected
   */
  _onUpdate(changed, options, userId) {
    for (const uuid of options.removedUuids ?? []) {
      const doc = foundry.utils.fromUuidSync(uuid);
      const appId = this.parent?.app?.id;
      if (doc?.apps && appId) delete doc.apps[appId];
    }

    // Handle addition
    if (changed.uuid) {
      const app = this.parent?.app;
      const apps = this.document?.apps;
      if (app && apps) apps[app.id] = app;
    }
  }
}
