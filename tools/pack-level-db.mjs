import fs from "fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";

/**
 * Folder where the compiled compendium packs should be located relative to the base module folder.
 * @type {string}
 */
const PACK_DEST = "packs";

/**
 * Folder where source JSON files should be located relative to the module folder.
 * @type {string}
 */
const PACK_SRC = "packs/.src";

/* -------------------------------------------------- */

/**
 * Parse CLI args and register the `package` command.
 * Keeps the original CLI surface: `package [action] [pack] [entry]`.
 */
// eslint-disable-next-line no-unused-vars
const argv = yargs(hideBin(process.argv))
  .command(packageCommand())
  .help()
  .alias("help", "h").argv;

/* -------------------------------------------------- */

function packageCommand() {
  return {
    command: "package [action] [pack] [entry]",
    describe: "Manage packages",
    builder: (y) => {
      y.positional("action", {
        describe: "The action to perform.",
        type: "string",
        choices: ["unpack", "pack", "clean"],
      });
      y.positional("pack", {
        describe: "Name of the pack upon which to work.",
        type: "string",
      });
      y.positional("entry", {
        describe:
          "Name of any entry within a pack upon which to work. Only applicable to extract & clean commands.",
        type: "string",
      });
    },
    handler: async (argv) => {
      const { action, pack, entry } = argv;
      switch (action) {
        case "clean":
          return await cleanPacks(pack, entry);
        case "pack":
          return await compilePacks(pack);
        case "unpack":
          return await extractPacks(pack, entry);
        default:
          return;
      }
    },
  };
}
/* -------------------------------------------------- */
/*   Clean packs                                      */
/* -------------------------------------------------- */

/**
 * Removes unwanted flags, permissions, and other transient data from an entry.
 *
 * This ensures exported/compiled JSON is deterministic and free of runtime-specific fields.
 *
 * @param {object} data                           Data for a single entry to clean.
 * @param {object} [options={}]                   Options.
 * @param {number} [options.ownership=0]          Value to reset default ownership to.
 */
function cleanPackEntry(data, { ownership = 0 } = {}) {
  // Normalize ownership to the expected shape
  if (data.ownership) data.ownership = { default: ownership };

  // Remove common runtime flags & sources
  delete data.flags?.core?.sourceId;
  delete data.flags?.importSource;
  delete data.flags?.exportSource;

  // Reset non-zero sorts to 0
  if (parseInt(data.sort) && parseInt(data.sort) !== 0) data.sort = 0;

  // Ensure flags exists, then remove empty flag namespaces
  if (!data.flags) data.flags = {};
  Object.entries(data.flags).forEach(([key, contents]) => {
    if (!contents || Object.keys(contents).length === 0) delete data.flags[key];
  });

  // Recursively clean known nested collections
  const cleanCollection = (collName, own = 0) => {
    if (data[collName])
      data[collName].forEach((i) => cleanPackEntry(i, { ownership: own }));
  };
  cleanCollection("pages", -1);
  cleanCollection("categories");
  cleanCollection("results");
  cleanCollection("items");
  cleanCollection("effects");

  // Clean textual fields
  if (data.name) data.name = cleanString(data.name);

  // Adjust metadata that would otherwise be environment-specific
  if (data._stats) {
    data._stats.lastModifiedBy = "HotpotBuilder000"; // 16 char string, must conform to id
    data._stats.exportSource = null;
  }
}

/* -------------------------------------------------- */

/**
 * Removes invisible whitespace characters and normalizes single- and double-quotes.
 *
 * @param {string} str  The string to be cleaned.
 * @returns {string}    The cleaned string.
 */
function cleanString(str) {
  return str
    .replace(/\u2060/gu, "")
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"');
}

/* -------------------------------------------------- */

/**
 * Cleans and formats source JSON files, removing unnecessary permissions and flags and adding proper spacing.
 *
 * @param {string} [packName]   Name of pack to clean. If none provided, all packs will be cleaned.
 * @param {string} [entryName]  Name of a specific entry to clean.
 *
 * Usage examples:
 * - `npm run build:clean` - Clean all source JSON files.
 * - `npm run build:clean -- classes` - Only clean the source files for the specified compendium.
 * - `npm run build:clean -- classes Barbarian` - Only clean a single item from the specified compendium.
 */
async function cleanPacks(packName, entryName) {
  const targetEntry = entryName?.toLowerCase();

  // Find the folders to process (same logic used in compilePacks)
  const folders = fs
    .readdirSync(PACK_SRC, { withFileTypes: true })
    .filter(
      (file) => file.isDirectory() && (!packName || packName === file.name)
    );

  /**
   * Walk through directories to find JSON files.
   * @param {string} directoryPath
   * @yields {string}
   */
  async function* _walkDir(directoryPath) {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) yield* _walkDir(entryPath);
      else if (path.extname(entry.name) === ".json") yield entryPath;
    }
  }

  for (const folder of folders) {
    console.log(`Cleaning pack ${folder.name}`);
    for await (const src of _walkDir(path.join(PACK_SRC, folder.name))) {
      const json = JSON.parse(await readFile(src, { encoding: "utf8" }));
      if (targetEntry && targetEntry !== json.name.toLowerCase()) continue;
      if (!json._id || !json._key) {
        console.log(
          `Failed to clean \x1b[31m${src}\x1b[0m, must have _id and _key.`
        );
        continue;
      }
      cleanPackEntry(json);
      // Overwrite with consistent indentation and newline
      fs.rmSync(src, { force: true });
      await writeFile(src, `${JSON.stringify(json, null, 2)}\n`, {
        mode: 0o664,
      });
    }
  }
}

/* -------------------------------------------------- */
/*   Compile packs                                    */
/* -------------------------------------------------- */

/**
 * Compile the source JSON files into compendium packs.
 *
 * @param {string} [packName] Name of pack to compile. If none provided, all packs will be packed.
 *
 * Usage examples:
 * - `npm run build:db` - Compile all JSON files into their LevelDB files.
 * - `npm run build:db -- classes` - Only compile the specified pack.
 */
async function compilePacks(packName) {
  // Determine which source folders to process
  const folders = fs
    .readdirSync(PACK_SRC, { withFileTypes: true })
    .filter(
      (file) => file.isDirectory() && (!packName || packName === file.name)
    );

  for (const folder of folders) {
    const src = path.join(PACK_SRC, folder.name);
    const dest = path.join(PACK_DEST, folder.name);
    console.log(`Compiling pack ${folder.name}`);
    await compilePack(src, dest, {
      recursive: true,
      log: true,
      transformEntry: cleanPackEntry,
    });
  }
}

/* -------------------------------------------------- */
/*   Extract Packs                                    */
/* -------------------------------------------------- */

/**
 * Extract the contents of compendium packs to JSON files.
 *
 * @param {string} [packName]  Name of pack to extract. If none provided, all packs will be unpacked.
 * @param {string} [entryName] Name of a specific entry to extract.
 *
 * Usage examples:
 * - `npm build:json` - Extract all compendium LevelDB files into JSON files.
 * - `npm build:json -- classes` - Only extract the contents of the specified compendium.
 * - `npm build:json -- classes Barbarian` - Only extract a single item from the specified compendium.
 */
async function extractPacks(packName, entryName) {
  const targetEntry = entryName?.toLowerCase();

  // Load package manifest
  const manifest = JSON.parse(
    fs.readFileSync("./module.json", { encoding: "utf8" })
  );

  // Determine which packs to process
  const packs = manifest.packs.filter((p) => !packName || p.name === packName);

  for (const packInfo of packs) {
    const dest = path.join(PACK_SRC, packInfo.name);
    console.log(`Extracting pack ${packInfo.name}`);

    const folders = {};
    // First pass: extract only folder records to build paths
    await extractPack(path.join(PACK_DEST, packInfo.name), dest, {
      log: false,
      transformEntry: (e) => {
        if (e._key.startsWith("!folders")) {
          folders[e._id] = {
            name: slugify(e.name),
            folder: e.folder,
          };
        }
        return false;
      },
    });

    // Helper to build full folder paths (folder.path)
    const buildPath = (collection, entry, parentKey) => {
      let parent = collection[entry[parentKey]];
      entry.path = entry.name;
      while (parent) {
        entry.path = path.join(parent.name, entry.path);
        parent = collection[parent[parentKey]];
      }
    };
    Object.values(folders).forEach((f) => buildPath(folders, f, "folder"));

    // Second pass: extract entries with transformation + proper filenames
    await extractPack(path.join(PACK_DEST, packInfo.name), dest, {
      log: true,
      clean: true,
      transformEntry: (entry) => {
        if (targetEntry && targetEntry !== entry.name.toLowerCase())
          return false;
        cleanPackEntry(entry);
      },
      transformName: (entry) => {
        if (entry._id in folders)
          return path.join(folders[entry._id].path, "_folder.json");
        const outputName = slugify(entry.name);
        const parent = folders[entry.folder];
        return path.join(parent?.path ?? "", `${outputName}-${entry._id}.json`);
      },
    });
  }
}

/* -------------------------------------------------- */

/**
 * Standardize name format.
 *
 * @param {string} name
 * @returns {string}
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace("'", "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .replace(/\s+|-{2,}/g, "-");
}
