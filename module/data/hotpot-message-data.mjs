import HotpotConfig from "../apps/hotpot-config.mjs";
import CONSTANTS from "../constants.mjs";
import { findDocByFlag } from "../utils.mjs";

/**
 * @typedef DieData
 * @property {number|foundry.dice.Roll} [number = 1] - The number of dice of this term to roll, before modifiers are applied, or a Roll instance that will be evaluated to a number.
 * @property {number|foundry.dice.Roll} [faces = 1] - The number of faces on each die of this type, or a Roll instance that will be evaluated to a number.
 * @property {string} method - The resolution method used to resolve DiceTerm.
 * @property {string[]} [modifiers] - An array of modifiers applied to the results
 * @property {import("@client/dice/_types.mjs").DiceTermResult[]} results - An optional array of pre-cast results for the term
 * @property {boolean} [evaluated] - An internal flag for whether the term has been evaluated
 * @property {Object} options - Additional options that modify the term
 */

/**
 * Hotpot Message Data model.
 */
export default class HotpotMessageData extends foundry.abstract.TypeDataModel {
  /**
   * Metadata definition for this DataModel.
   */
  static get metadata() {
    return {
      type: `${CONSTANTS.MODULE_ID}.hotpot`,
      template: `${CONSTANTS.TEMPLATE_PATH}/chat-message/hotpot.hbs`,
      actions: {
        openHotpot: HotpotMessageData.#onOpenHotpot,
      }
    }
  }

  /**
   * Template to use when rendering this message.
   * @type {string}
   */
  get template() {
    return HotpotMessageData.metadata.template;
  }

  /**@type {foundry.documents.ChatMessage} */
  get #document() {
    return this.parent;
  }

  /**@override */
  static defineSchema() {
    const { TypedObjectField, SchemaField, DocumentUUIDField, StringField, NumberField, BooleanField, ArrayField, HTMLField, ObjectField, ForeignDocumentField } = foundry.data.fields;
    return {
      recipe: new SchemaField({
        name: new StringField({ initial: "New Recipe" }),
        description: new HTMLField(),
        journal: new ForeignDocumentField(foundry.documents.BaseJournalEntry, { required: true }),
      }),
      completed: new BooleanField({ gmOnly: true }),
      ingredients: new TypedObjectField(new SchemaField({
        uuid: new DocumentUUIDField({ embedded: true, type: "Item", blank: false, }),
        quantity: new NumberField({ initial: 1, integer: true, nullable: false, required: true })
      })),
      currentPool: new SchemaField(
        Object.values(CONFIG.HOTPOT.flavors).reduce((acc, v) => {
          acc[`d${v.dieFace}`] = new NumberField({ initial: 0, integer: true, nullable: false, required: true })
          return acc;
        }, {})),
      mealRating: new NumberField({ integer: true, initial: 0, nullable: false, required: true }),
      dicePool: new ArrayField(new ObjectField({ validate: (v) => v._evaluated, validationError: "Must be a evaluated Die" })),
      tokens: new NumberField({ initial: 0, nullable: false, integer: true, min: 0 }),
      step: new NumberField({ initial: 0, min: 0, max: CONSTANTS.STEPS.length - 1 }),
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**@override */
  prepareBaseData() {
    for (const ingredient of Object.values(this.ingredients)) {
      ingredient.document ??= foundry.utils.fromUuidSync(ingredient.uuid);
    }

    /**@type {foundry.dice.terms.Die[]} */
    this.dicePool = this.dicePool.map(d => new foundry.dice.terms.Die(d));
    this.matchedDice = this.dicePool.flatMap(die =>
      die.results
        .filter(r => r.matched)
        .map(r => ({ faces: die.faces, result: r.result }))
    ).reduce((acc, r) => {
      if (!acc[r.result]) acc[r.result] = [];
      acc[r.result].push(r.faces);
      return acc;
    }, {});

  }

  /**
 * Compute the total flavor strengths dynamically based on prepared ingredient documents.
 *
 * @type {Record<string, {strength:number}>}
 */
  get totals() {
    const totals = foundry.utils.duplicate(CONFIG.HOTPOT.flavors);
    Object.values(totals).forEach(f => f.strength = 0);

    for (const ingredient of Object.values(this.ingredients)) {
      const doc = ingredient.document;
      if (!doc) continue;

      const qty = ingredient.quantity ?? 1;
      for (const [key, { strength = 0 }] of Object.entries(doc.system.flavors)) {
        if (totals[key]) totals[key].strength += strength * qty;
      }
    }

    return totals;
  }

  /**
   * Party’s tier.
   * @returns {Number}
   */
  get partyTier() {
    const actors = Object.values(this.ingredients).map(i => i.document.actor);
    const tiers = new Set(actors).reduce((acc, a) => [...acc, a.system.tier], []);
    return Math.max(1, Math.min(...tiers));
  }
  /* -------------------------------------------- */
  /*  Step Logic                                  */
  /* -------------------------------------------- */

  /**
   * The current step name.
   * @returns {Object}
   */
  get currentStep() {
    return CONSTANTS.STEPS[this.step] ?? null;
  }

  /**
 * Previous step name
 * @returns {Object}
 */
  get previousStep() {
    return this.step > 0 ? CONSTANTS.STEPS[this.step - 1] : null;
  }

  /**
   * Next step name
   * @returns {Object}
   */
  get nextStep() {
    return this.step < CONSTANTS.STEPS.length - 1
      ? CONSTANTS.STEPS[this.step + 1]
      : null;
  }


  /**
   * Move the current step forward or backward in the step list.
   * Emits a socket event and re-renders if the new index is valid.
   *
   * @param {number} delta - The number of steps to move
   */
  async moveStep(delta) {
    const newIndex = this.step + delta;
    if (!Number.isInteger(newIndex) || !CONSTANTS.STEPS[newIndex]) return;
    return await this.#document.update({ "system.step": newIndex });
  }

  /* -------------------------------------------- */
  /*  Hotpot Logic                                */
  /* -------------------------------------------- */

  /**
   * Get the number of tokens.
   * @returns {number}
   */
  _getTokenInitials() {
    const { FLAVORS } = CONSTANTS.JOURNAL_FLAGS;
    const { objectsEqual } = foundry.utils;

    const recipeJournal = this.recipe?.journal;
    if (!recipeJournal) return 0;

    const storedRecipePages = findDocByFlag(recipeJournal.pages, FLAVORS, { multiple: true });
    const currentFlavorProfile = Object.fromEntries(Object.entries(this.totals).map(([k, v]) => [k, v.strength]));
    const hasMatchingProfile = storedRecipePages.some(p => objectsEqual(currentFlavorProfile, p.getFlag(CONSTANTS.MODULE_ID, FLAVORS)));

    return hasMatchingProfile ? this.partyTier ?? 0 : 0;
  }

  /**
   * Process duplicate results in dice and mark them as active if repeated.
   * @param {foundry.dice.terms.Die[]} dice 
   */
  _processMatches(dice) {
    const allResults = dice.flatMap(die => die.results.map(r => r.result));

    const counts = allResults.reduce((acc, value) => {
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});

    for (const die of dice) {
      for (const res of die.results) {
        res.matched = counts[res.result] > 1;
      }
    }
  }

  /**
   * Creates (if necessary) a journal category and a journal entry page
   * in the journal specified in the recipe.
   * @returns {Promise<foundry.documents.JournalEntryPage|void>}
   */
  async _createJournal() {
    const { JournalEntryPage } = foundry.documents;
    const { journal, name, description } = this.recipe;
    if (!journal) return;

    const category = findDocByFlag(journal.categories, CONSTANTS.JOURNAL_FLAGS.CATEGORY) ?? await this.#createCategory(journal);

    const flavorProfile = Object.fromEntries(
      Object.entries(this.totals).map(([k, v]) => [k, v.strength])
    );

    const flavorProfileText = `<h2>Flavor Profile</h2> ${Object.values(this.totals).map(v => `<p>${v.label}(d${v.dieFace}): ${v.strength}</p>`).join("")}`
    return JournalEntryPage.implementation.create({
      name,
      "text.content": description + flavorProfileText,
      category: category._id,
      [`flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.JOURNAL_FLAGS.FLAVORS}`]: flavorProfile
    }, { parent: journal });
  }

  /**
   * Creates a new "Hotpot Recipes" category in the given journal.
   * @param {foundry.documents.JournalEntry} parent he journal where the category will be created.
   * @returns {Promise<foundry.documents.JournalEntryCategory>}
   */
  async #createCategory(parent) {
    const { JournalEntryCategory } = foundry.documents;
    const categories = parent.categories.contents ?? [];

    return JournalEntryCategory.implementation.create({
      name: "Hotpot Recipes",
      sort: (categories.length + 1) * CONST.SORT_INTEGER_DENSITY,
      [`flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.JOURNAL_FLAGS.CATEGORY}`]: true
    }, { parent });
  }



  /* -------------------------------------------- */
  /*  Lifecycle Methods                           */
  /* -------------------------------------------- */

  /**
   * 
   * @param {foundry.documents.types.ChatMessageData} data 
   */
  static async create(data = {}) {
    const cls = foundry.documents.ChatMessage;

    /**@type {foundry.documents.types.ChatMessageData} */
    const createData = foundry.utils.mergeObject(data, {
      type: HotpotMessageData.metadata.type,
      "system.step": 0,
    }, { inplace: false });

    return await cls.create(createData)
  }

  /**
   * 
   * @param {import("@common/documents/_types.mjs").ChatMessageData} data - The initial data object provided to the document creation request
   * @param {Object} options - Additional options which modify the creation request
   * @param {foundry.documents.User} user - The id of the User requesting the document update
   * @inheritdoc
   */
  async _preCreate(data, options, user) {
    data.content = await this.render(options);
  }

  /** @inheritDoc */
  async _preUpdate(changed, options, user) {
    const allowed = await super._preUpdate(changed, options, user);
    if (allowed === false) return false;

    if ("system" in changed) {
      if ("dicePool" in changed.system) await this._prepareDiePoolUpdate(changed.system.dicePool);
      if ("step" in changed.system) await this._prepareStepUpdate(changed);
      options.context = { system: changed.system };
      changed.content = await this.render(options);
    }
  }

  /**
   * Normalize and evaluate all dice in a system's dice pool.
   * @param {Array<foundry.dice.terms.Die|Object>} dicePool - The dice pool to process.
   * @returns {Promise<void>} Resolves once all dice have been evaluated and converted to JSON.
   * @async
   */
  async _prepareDiePoolUpdate(dicePool) {
    const { Die } = foundry.dice.terms;
    dicePool = await Promise.all(dicePool.map(async die => {

      if (!(die instanceof Die)) die = new Die(die);
      if (!die._evaluated) await die.evaluate();
      return die.toJSON();
    }));

    this._processMatches(dicePool);
  }

  /**
   * Normalize and evaluate all dice in a system's dice pool.
   * @param {Number} step - .
   * @returns {Promise<void>} Resolves once all dice have been evaluated and converted to JSON.
   * @async
   */
  async _prepareStepUpdate(changed) {
    const STEPS = Object.fromEntries(CONSTANTS.STEPS.map(step => [step.id, step.index]));
    const goingForward = changed.system.step > this.step;
    if (goingForward) {
      switch (changed.system.step) {
        case STEPS.roll:
          changed.system.dicePool ??= [];
          changed.system.mealRating ??= 0;
          changed.system.currentPool ??= Object.fromEntries(Object.values(this.totals).map(v => [`d${v.dieFace}`, v.strength]));
          changed.system.tokens ??= this._getTokenInitials();
          break;
      }
    }
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
 * Render the contents of this chat message.
 * @param {object} options  Rendering options.
 * @returns {Promise<string>}
 */
  async render(options) {
    if (!this.template) return "";
    return foundry.applications.handlebars.renderTemplate(this.template, await this._prepareContext(options));
  }

  /**
 * Prepare application rendering context data for a given render request.
 * @param {object} options  Rendering options.
 * @returns {Promise<ApplicationRenderContext>}   Context data for the render operation.
 * @protected
 */
  async _prepareContext(options) {
    const system = foundry.utils.mergeObject(this, options?.context?.system ?? {}, { inplace: false })
    const getClasses = (stepIndex) => {
      if (this.completed) return ["completed"];
      if (stepIndex === system.step) return ["active"];
      if (stepIndex < system.step) return ["completed"];
      return ["inactive"];
    };

    const steps = CONSTANTS.STEPS.map((s) => {
      const classes = getClasses(s.index).join(" ");
      return { ...s, classes };
    });

    return {
      system,
      steps,
    };
  }

  /* -------------------------------------------- */
  /*  Hook Callback Handler                       */
  /* -------------------------------------------- */

  /**
   * Add event listeners to the Hotpot Message Data.
   * @param {foundry.documents.ChatMessage} chatMessage 
   * @param {HTMLElement} html 
   * @param {Object} messageData 
   */
  static onRenderChatMessageHTML(chatMessage, html, messageData) {
    if (chatMessage.type !== HotpotMessageData.metadata.type) return;

    html.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", (event) => {
        const target = event.currentTarget;
        const { action } = target.dataset;
        const fn = HotpotMessageData.metadata.actions[action];
        if (fn instanceof Function) fn.call(chatMessage.system, event, target)
      })

    })
  }

  /* -------------------------------------------- */
  /*  Click Callbacks                             */
  /* -------------------------------------------- */

  /**
   * @type {ApplicationClickAction}
   * @this {HotpotMessageData}
   */
  static #onOpenHotpot() {
    const app = new HotpotConfig({ document: this.#document });
    app.render({ force: true });
  }

}