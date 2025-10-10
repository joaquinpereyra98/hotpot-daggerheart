import HotpotConfig from "../apps/hotpot-config.mjs";
import CONSTANTS from "../constants.mjs";
import { findDocByFlag } from "../utils.mjs";

/**
 * @import {HotPotChatMessage, ChatMessagesClickAction, HotpotMessageDataInterface} from "../_types.mjs";
 */

/**
 * Hotpot Message Data model.
 * @extends  {Hotpofoundry.abstract.TypeDataModel<HotpotMessageDataInterface>}
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
        toggleCompleted: HotpotMessageData.#onToggleCompleted,
        openCookbook: HotpotMessageData.#onOpenCookbook,
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

  /**@type {HotPotChatMessage} */
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

  /**@type {HotpotConfig} */
  _app;

  /**@type {HotpotConfig} */
  get app() {
    if (!this._app) this._app = new HotpotConfig({ document: this.#document });
    return this._app;
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
    const { JOURNAL_FLAGS, MODULE_ID, FLAVORS } = CONSTANTS;
    const { objectsEqual } = foundry.utils;

    const journal = this.recipe?.journal;
    if (!journal) return 0;

    const profile = Object.fromEntries(Object.entries(this.totals).map(([k, v]) => [k, v.strength]));
    const match = journal.pages.some(p => {
      const flag = p.getFlag(MODULE_ID, JOURNAL_FLAGS);
      return flag && objectsEqual(profile, p.getFlag(MODULE_ID, FLAVORS));
    });

    return match ? this.partyTier : 0;

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

    const flavorProfileText = `<h2>Flavor Profile</h2> ${Object.values(this.totals).map(v => `<p>${v.label}(d${v.dieFace}): ${v.strength}</p>`).join("")}`;
    const page = findDocByFlag(journal.pages, CONSTANTS.JOURNAL_FLAGS.MESSAGE, this.#document.id);
    if (page) {
      return page.update({
        "text.content": description + flavorProfileText,
        [`flags.${CONSTANTS.MODULE_ID}`]: {
          [CONSTANTS.JOURNAL_FLAGS.FLAVORS]: flavorProfile,
        }
      })
    }
    return JournalEntryPage.implementation.create({
      name,
      "text.content": description + flavorProfileText,
      category: category._id,
      [`flags.${CONSTANTS.MODULE_ID}`]: {
        [CONSTANTS.JOURNAL_FLAGS.FLAVORS]: flavorProfile,
        [CONSTANTS.JOURNAL_FLAGS.MESSAGE]: this.#document.id,
      }
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
   * @param {foundry.documents.types.ChatMessageData} data 
   * @returns {HotPotChatMessage}
   */
  static async create(data = {}) {
    if (!game.user.isGM) return;
    const cls = foundry.documents.ChatMessage;

    /**@type {foundry.documents.types.ChatMessageData} */
    const createData = foundry.utils.mergeObject(data, {
      type: HotpotMessageData.metadata.type,
      "system.step": 0,
    }, { inplace: false });

    return await cls.create(createData)
  }

  /** @inheritDoc */
  async _preUpdate(changed, options, user) {
    const { hasProperty } = foundry.utils;

    const allowed = await super._preUpdate(changed, options, user);
    if (allowed === false) return false;

    if (hasProperty(changed, "system.dicePool")) await this._prepareDiePoolUpdate(changed.system.dicePool);
    if (hasProperty(changed, "system.step")) await this._prepareStepUpdate(changed);
    if (hasProperty(changed, "system.ingredients")) await this._prepareIngredientsUpdate(changed);
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
   * @param {any} changed - The candidate changes to the Document
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

  /**
   * Add or delete apps from ingredients apps collecitons.
   * @param {any} changed - The candidate changes to the Document
   * @returns {Promise<void>} Resolves once all dice have been evaluated and converted to JSON.
   * @async
   */
  async _prepareIngredientsUpdate(changed) {
    const utils = foundry.utils;

    // Find the active HotpotConfig app
    const app = this.app;
    if (!app) return;

    for (const [key, ingredient] of Object.entries(changed.system.ingredients)) {
      // Handle deletion
      if (ingredient === null && utils.isDeletionKey(key)) {
        utils.deleteProperty(this.ingredients[key.slice(2)]?.document.apps, app.id);
        continue;
      }

      // Handle addition
      if (ingredient && !utils.hasProperty(this.ingredients, key)) {
        const doc = utils.fromUuidSync(ingredient.uuid);
        doc.apps[app.id] = app;
      }
    }
  }


  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Render the HTML for the ChatMessage which should be added to the log
   * @param {object} [options]             Additional options passed to the Handlebars template.
   * @param {boolean} [options.canDelete]  Render a delete button. By default, this is true for GM users.
   * @param {boolean} [options.canClose]   Render a close button for dismissing chat card notifications.
   * @returns {Promise<HTMLElement>}
   */
  async renderHTML(options = {}) {
    const html = foundry.utils.parseHTML(await this.render(options));
    this.#attachFrameListeners(html);
    return html;
  }

  /**
   * Render the contents of this chat message.
   * @param {object} options  Rendering options.
   * @returns {Promise<string>}
   */
  async render(options) {
    if (!this.template) return "";
    const context = await this._prepareContext(options);
    return foundry.applications.handlebars.renderTemplate(this.template, context);
  }

  /**
   * Prepare application rendering context data for a given render request.
   * @param {object} options  Rendering options.
   * @returns {Promise<ApplicationRenderContext>}   Context data for the render operation.
   * @protected
   */
  async _prepareContext({ canDelete, canClose, ...rest } = {}) {
    const doc = this.#document;

    const data = doc.toObject(false);

    const TextEditor = foundry.applications.ux.TextEditor.implementation;

    data.content = await TextEditor.enrichHTML(doc.content, {
      rollData: doc.getRollData(),
      secrets: game.user.isGM,
    });

    const recipe = await TextEditor.enrichHTML(this.recipe.description, {
      rollData: doc.getRollData(),
      secrets: game.user.isGM,
    });

    const isWhisper = !!doc.whisper.length;

    const steps = CONSTANTS.STEPS.map(s => {
      const status = this.completed
        ? "completed"
        : s.index === this.step
          ? "active"
          : s.index < this.step
            ? "completed"
            : "inactive";

      return { ...s, classes: status };
    });

    return {
      ...rest,
      system: this,
      recipe,
      steps,
      canDelete, canClose,
      message: data,
      user: game.user,
      author: doc.author,
      alias: doc.alias,
      cssClass: [
        doc.style === CONST.CHAT_MESSAGE_STYLES.IC ? "ic" : null,
        doc.style === CONST.CHAT_MESSAGE_STYLES.EMOTE ? "emote" : null,
        isWhisper ? "whisper" : null,
        this.#document.blind ? "blind" : null
      ].filterJoin(" "),
      isWhisper,
      whisperTo: doc.whisper.map(u => game.users.get(u)?.name).filterJoin(", ")
    };
  }

  /**
   * Add event listeners to the HTML Message.
   * @param {HTMLElement} html 
   */
  #attachFrameListeners(html) {
    html.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", (event) => {
        const target = event.currentTarget;
        const { action } = target.dataset;
        const fn = HotpotMessageData.metadata.actions[action];
        if (fn instanceof Function) fn.call(this.#document, event, target)
      })
    })

    const finishBtn = html.querySelector(".finish-button");
    if (finishBtn) {
      const toggleIcons = (lockOn) => {
        finishBtn.classList.toggle("fa-lock", lockOn);
        finishBtn.classList.toggle("fa-lock-open", !lockOn);
      };

      finishBtn.addEventListener("mouseover", () => toggleIcons(!this.completed));
      finishBtn.addEventListener("mouseout", () => toggleIcons(this.completed));
    }

  }

  /* -------------------------------------------- */
  /*  Click Callbacks                             */
  /* -------------------------------------------- */

  /**
   * @type {ChatMessagesClickAction}
   * @this {HotPotChatMessage}
   */
  static #onOpenHotpot() {
    this.system.app.render({ force: true });
  }

  /**
   * @type {ChatMessagesClickAction}
   * @this {HotPotChatMessage}
   */
  static async #onToggleCompleted(event) {
    if (!game.user.isGM) return;
    const { completed } = this.system;
    await this.update({ "system.completed": !completed });
    if (!event.shiftKey) this.system.app.render({ force: true });
  }

  /**
 * @type {ChatMessagesClickAction}
 * @this {HotPotChatMessage}
 */
  static #onOpenCookbook() {
    const journal = this.system.recipe.journal;
    if (!journal);
    journal.sheet.render({ force: true });
  }
}