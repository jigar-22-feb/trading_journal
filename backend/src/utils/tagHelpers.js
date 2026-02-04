const Tag = require("../models/Tag");

/**
 * Normalize tag name: trim and collapse spaces.
 */
function normalizeTagName(name) {
  if (typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Set which tags a trade has. Adds trade_id to each tag's trade_ids;
 * removes trade_id from any tag that is no longer in the list.
 * @param {string} tradeId - e.g. "trd-1"
 * @param {string[]} tagNames - array of tag names
 */
async function syncTagsForTrade(tradeId, tagNames) {
  const names = (Array.isArray(tagNames) ? tagNames : [])
    .map(normalizeTagName)
    .filter(Boolean);
  const uniqueNames = [...new Set(names)];

  await Tag.updateMany(
    { trade_ids: tradeId },
    { $pull: { trade_ids: tradeId } }
  );

  for (const name of uniqueNames) {
    await Tag.findOneAndUpdate(
      { tag_name: name },
      { $addToSet: { trade_ids: tradeId } },
      { upsert: true, new: true }
    );
  }
}

/**
 * Remove a trade_id from all tags (e.g. when a trade is deleted).
 * @param {string} tradeId
 */
async function removeTradeIdFromAllTags(tradeId) {
  await Tag.updateMany(
    { trade_ids: tradeId },
    { $pull: { trade_ids: tradeId } }
  );
}

/**
 * Get tag names for a single trade (tags that include this trade_id).
 * @param {string} tradeId
 * @returns {Promise<string[]>}
 */
async function getTagNamesForTrade(tradeId) {
  const tags = await Tag.find({ trade_ids: tradeId }).select("tag_name").lean();
  return tags.map((t) => t.tag_name);
}

/**
 * Get tag names for multiple trades. Returns a Map<tradeId, string[]>.
 * @param {string[]} tradeIds
 * @returns {Promise<Map<string, string[]>>}
 */
async function getTagNamesByTradeId(tradeIds) {
  if (!tradeIds.length) return new Map();
  const tags = await Tag.find({ trade_ids: { $in: tradeIds } })
    .select("tag_name trade_ids")
    .lean();
  const map = new Map();
  for (const id of tradeIds) {
    map.set(id, []);
  }
  for (const tag of tags) {
    for (const id of tag.trade_ids) {
      if (map.has(id)) {
        map.get(id).push(tag.tag_name);
      }
    }
  }
  return map;
}

/**
 * Get all distinct tag names (for filters).
 * @returns {Promise<string[]>}
 */
async function getAllTagNames() {
  const tags = await Tag.find({}).select("tag_name").lean();
  return tags.map((t) => t.tag_name);
}

module.exports = {
  syncTagsForTrade,
  removeTradeIdFromAllTags,
  getTagNamesForTrade,
  getTagNamesByTradeId,
  getAllTagNames,
  normalizeTagName,
};
