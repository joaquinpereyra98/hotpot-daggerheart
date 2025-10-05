import CONSTANTS from "../constants.mjs";
import HotpotMessageData from "../data/hotpot-message-data.mjs";
import IngredientModel from "../data/ingredient.mjs";

const { DocumentSheetV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * @typedef {import("@client/applications/_types.mjs").ApplicationFormSubmission} ApplicationFormSubmission
 * @typedef {import("@client/applications/_types.mjs").ApplicationConfiguration} ApplicationConfiguration
 * @typedef {import("@client/applications/_types.mjs").ApplicationClickAction} ApplicationClickAction
 * @typedef {import("@client/applications/_types.mjs").ApplicationRenderOptions} ApplicationRenderOptions
 * @typedef {import("@client/applications/_types.mjs").ApplicationRenderContext} ApplicationRenderContext 
 * @typedef {import("@client/applications/api/handlebars-application.mjs").HandlebarsTemplatePart} HandlebarsTemplatePart
 * @typedef {import("@client/applications/api/handlebars-application.mjs").HandlebarsRenderOptions} HandlebarsRenderOptions 
 */

/**
 * @extends {foundry.applications.api.DocumentSheetV2}
 * @mixes foundry.applications.api.HandlebarsApplicationMixin
 */
export default class HotpotConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /**@type {ApplicationConfiguration} */
  static DEFAULT_OPTIONS = {
    classes: ["hotpot", "hotpot-config", "daggerheart", "dh-style", "dialog"],
    window: {
      title: "Hotpot!",
      icon: "fa-solid fa-bowl-food",
      resizable: true,
    },
    position: {
      width: 560,
      height: 530,
    },
    form: {
      submitOnChange: true,
    },
    actions: {
      nextStep: HotpotConfig.#onNextStep,
      previousStep: HotpotConfig.#onPreviousStep,
      modifyItemQuantity: HotpotConfig.#onModifyItemQuantity,
      removeIngredient: HotpotConfig.#onRemoveIngredient,
      collectMatched: HotpotConfig.#onCollectMatched,
      rollFlavor: HotpotConfig.#onRollFlavor,
      finishHotpot: HotpotConfig.#onFinishHotpot,
    },
  };

  /**@type {Record<string, HandlebarsTemplatePart>} */
  static PARTS = {
    header: {
      template: `${CONSTANTS.TEMPLATE_PATH}/hotpot-config/header.hbs`,
    },
    ingredients: {
      template: `${CONSTANTS.TEMPLATE_PATH}/hotpot-config/ingredients.hbs`,
      scrollable: [".scrollable"]
    },
    record: {
      template: `${CONSTANTS.TEMPLATE_PATH}/hotpot-config/record.hbs`,
      scrollable: [".scrollable"]
    },
    roll: {
      template: `${CONSTANTS.TEMPLATE_PATH}/hotpot-config/roll.hbs`,
      scrollable: [".scrollable"]
    },
  }

  /* -------------------------------------------- */

  /**@inheritdoc */
  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.classes = initialized.classes.filter(cls => cls !== "sheet");
    initialized.window.controls = [];
    return initialized;
  }

  /** @override */
  get title() {
    return game.i18n.localize(this.options.window.title);
  }

  /** @override */
  _canRender(_options) {
    return !this.document.system.completed;
  }

  /**@override */
  get isEditable() {
    if (this.document.pack) {
      const pack = game.packs.get(this.document.pack);
      if (pack.locked) return false;
    }
    return true;
  }

  /** @inheritDoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    Object.values(this.document.system.ingredients).forEach(i => i.document.apps[this.id] = this)
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new foundry.applications.ux.DragDrop.implementation({
      dropSelector: ".ingredients-section",
      callbacks: {
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);

    this._addDiceHoverListener();
  }

  /** @inheritDoc */
  _onClose(options) {
    super._onClose(options);
     Object.values(this.document.system.ingredients).forEach(i => delete i.document.apps[this.id])
  } 

  /**
   * Handle mouse-in and mouse-out events on a dice.
   * @param {PointerEvent} event
   */
  _addDiceHoverListener() {
    const selector = ".dice";
    this.element.querySelectorAll(selector).forEach(div => {
      div.addEventListener("mouseover", (event) => {
        const target = event.currentTarget;
        const { result } = target.dataset;

        target.closest(".dice-pool")
          .querySelectorAll(`${selector}[data-result="${result}"]`)
          .forEach(die => die.classList.add("hovered"));
      });

      div.addEventListener("mouseout", (event) => {
        const target = event.currentTarget;
        const { result } = target.dataset;

        target.closest(".dice-pool")
          .querySelectorAll(`${selector}[data-result="${result}"]`)
          .forEach(die => die.classList.remove("hovered"));
      });
    });
  }

  /**
   * An event that occurs when data is dropped into a drop target.
   * @param {DragEvent} event
   * @returns {Promise<void>}
   * @protected
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

    // Dropped Documents
    const documentClass = foundry.utils.getDocumentClass(data.type);
    if (!documentClass) return

    const { collection, embedded } = foundry.utils.parseUuid(data.uuid);
    if (collection instanceof foundry.documents.collections.CompendiumCollection) return ui.notifications.warn("The document must exist in the world, it is not a compendium");
    if (!embedded.length) return ui.notifications.warn("may not be an embedded document");

    const doc = await documentClass.fromDropData(data);
    if (doc.type !== IngredientModel.metadata.type) return;

    return this.#submitUpdate({
      [`system.ingredients.${doc.id}`]: {
        uuid: doc.uuid,
        quantity: 1,
      }
    });
  }

  /* -------------------------------------------- */
  /*  Context                                     */
  /* -------------------------------------------- */

  get currentStep() { return this.document.system.currentStep; }
  get previousStep() { return this.document.system.previousStep; }
  get nextStep() { return this.document.system.nextStep; }

  /**@inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.status = {
      currentStep: this.currentStep,
      previousStep: this.previousStep,
      nextStep: this.nextStep,
    };

    context.ingredients = Object.values(this.document.system.ingredients).sort((a, b) => {
      if (a.document.isOwner && !b.document.isOwner) return -1;
      if (b.document.isOwner && !a.document.isOwner) return 1;
      const parentSort = a.document.parent.name.localeCompare(b.document.parent.name);
      if (parentSort !== 0) return parentSort;
      return a.document.name.localeCompare(b.document.name);
    })

    context.isGM = game.user.isGM;

    return context;
  }

  /**@inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options)
    context.step = {
      ...CONSTANTS.STEPS.find(({ id }) => id === partId),
      class: `${partId}${this.currentStep.id === partId ? " active" : ""}`,
    };

    switch (partId) {
      case "header":
        await this._prepareHeaderContext(context, options);
        break;
      case "roll":
        await this._prepareRollContext(context, options);
        break;
      case "record":
        await this._prepareRecordContext(context, options);
        break
    }
    return context;
  }

  /**
   * 
   * @param {ApplicationRenderContext} context 
   * @param {HandlebarsRenderOptions} options 
   */
  async _prepareHeaderContext(context, _options) {
    const { currentStep, previousStep, nextStep } = this;

    const getClasses = (stepIndex) => {
      if (stepIndex === currentStep.index) return ["active"];
      if (stepIndex < currentStep.index) return ["completed"];
      return ["inactive"];
    };

    context.steps = CONSTANTS.STEPS.map((s) => {
      const classes = getClasses(s.index);
      let action;
      if (s.index === previousStep?.index) action = "previousStep";
      else if (s.index === nextStep?.index) action = "nextStep";
      if (action && this.document.isOwner) classes.push("clickable");

      return { ...s, classes: classes.join(" "), action };
    });
  }

  /**
   * 
   * @param {ApplicationRenderContext} context 
   * @param {HandlebarsRenderOptions} options 
   */
  async _prepareRollContext(context, _options) {
    const { dicePool, currentPool, matchedDice } = this.document.system;

    context.dice = dicePool;
    context.dicePoolIsEmpty = !Object.values(currentPool).some(v => v > 0);
    context.matchedDice = matchedDice;
    context.totalMatch = Object.keys(matchedDice).reduce((acc, k) => acc += Number(k), 0);
  }

  async _prepareRecordContext(context, _options) {
    /**@type {HotpotMessageData} */
    const { schema, recipe } = this.document.system;
    const { TextEditor } = foundry.applications.ux;

    context.journal = {
      field: schema.getField("recipe.journal"),
      value: recipe.journal,
    };

    context.description = {
      field: schema.getField("recipe.description"),
      value: recipe.description,
      enriched: await TextEditor.implementation.enrichHTML(recipe.description, {
        relativeTo: this.document,
        secrets: game.user.isGM,
      })
    };
  }

  /* -------------------------------------------- */
  /*  Form Submit Handlers                        */
  /* -------------------------------------------- */

  /** @inheritdoc*/
  async _processSubmitData(event, form, submitData, options = {}) {
    if (this.document.isOwner) return await super._processSubmitData(event, form, submitData, options);
    const gm = game.users.activeGM;
    if (!gm) return;

    return gm.query(CONSTANTS.queries.updateHotpotAsGm, {
      messageId: this.document.id,
      data: updateData,
    });
  }

  /**
   * Submit an update to this document.
   * @param {Object} updateData - The data changes to apply.
   * @returns {Promise<foundry.abstract.Document|void>} The updated document if local, or nothing if handled by a GM.
   */
  #submitUpdate(updateData) {
    if (this.document.isOwner) return this.document.update(updateData);

    const gm = game.users.activeGM;
    if (!gm) return;

    return gm.query(
      CONSTANTS.queries.updateHotpotAsGm,
      {
        messageId: this.document.id,
        data: updateData,
      });
  }

  /* -------------------------------------------- */
  /*  Application Click Handlers                  */
  /* -------------------------------------------- */

  /**
   * @type {ApplicationClickAction}
   * @this HotpotConfig
   */
  static async #onNextStep() {
    if (this.document.isOwner) return await this.document.system.moveStep(1);
  }

  /**
   * @type {ApplicationClickAction}
   * @this HotpotConfig
   */
  static async #onPreviousStep(event) {
    if (!this.document.isOwner) return;
    const { DialogV2 } = foundry.applications.api;
    if (!event.shiftKey) {
      const confirm = await DialogV2.confirm({
        window: { title: "Previous Step" },
        content: "<p>Return to a previous step? This could reset some fields.</p>"
      });
      if (!confirm) return;
    }
    return await this.document.system.moveStep(-1);
  }

  /**
   * @type {ApplicationClickAction}
   * @this HotpotConfig
   */
  static #onModifyItemQuantity(_, target) {
    const addend = target.dataset.modification === "increase" ? 1 : -1;
    const { itemId } = target.closest("[data-item-id]").dataset;
    if (!itemId) return;
    const { quantity, document } = this.document.system.ingredients[itemId]
    const newQty = Math.clamp(quantity + addend, 1, document.system.quantity);
    return this.#submitUpdate({ [`system.ingredients.${itemId}.quantity`]: newQty });
  }

  /**
   * @type {ApplicationClickAction}
   * @this HotpotConfig
   */
  static #onRemoveIngredient(_, target) {
    const { itemId } = target.closest("[data-item-id]").dataset;
    if (!itemId) return;
    return this.#submitUpdate({ [`system.ingredients.-=${itemId}`]: null });
  }

  /**
   * @type {ApplicationClickAction}
   * @this HotpotConfig
   */
  static async #onCollectMatched() {
    const { dicePool, currentPool, mealRating, matchedDice } = this.document.system;

    const newPool = dicePool.reduce((acc, d) => ({ ...acc, [`d${d.faces}`]: Math.max(0, currentPool[`d${d.faces}`] - d.results.filter(r => r.matched).length) }), {});
    const newTotal = mealRating + Object.keys(matchedDice).reduce((acc, k) => acc += Number(k), 0);

    return await this.document.update({
      "system.currentPool": newPool,
      "system.mealRating": newTotal,
    });
  }

  /**
   * @type {ApplicationClickAction}
   * @this HotpotConfig
   */
  static async #onRollFlavor() {
    const { Die } = foundry.dice.terms;
    const { currentPool } = this.document.system;

    /**@type {Promise<foundry.dice.terms.Die>[]} */
    const diceTerms = Object.entries(currentPool)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => new Die({ number: v, faces: Number(k.slice(1)) }).evaluate());
    const dice = await Promise.all(diceTerms);

    return await this.document.update({ "system.dicePool": dice.map(d => d.toJSON()) });
  }

  /**
   * @type {ApplicationClickAction}
   * @this HotpotConfig
   */
  static async #onFinishHotpot() {
    if (!game.user.isGM) return;
    /**@type {HotpotMessageData} */
    const system = this.document.system;
    const { recipe } = system;

    if (recipe.journal) await system._createJournal();

    await this.document.update({ "system.completed": true });

    return await this.close();
  }

}