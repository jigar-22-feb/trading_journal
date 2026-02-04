const router = require("express").Router();
const Tag = require("../models/Tag");
const { normalizeTagName } = require("../utils/tagHelpers");

/**
 * GET /tags – list all tags (id, tag_name, trade_ids).
 */
router.get("/", async (_, res) => {
  const tags = await Tag.find()
    .sort({ tag_name: 1 })
    .select("_id tag_name trade_ids")
    .lean();
  res.json(
    tags.map((t) => ({
      _id: t._id.toString(),
      tag_name: t.tag_name,
      trade_ids: t.trade_ids || [],
    }))
  );
});

/**
 * POST /tags – create a new tag (no trade ids).
 * Body: { tag_name: string }
 */
router.post("/", async (req, res) => {
  const raw = (req.body.tag_name ?? req.body.name ?? "").trim();
  const tag_name = normalizeTagName(raw);
  if (!tag_name) {
    return res.status(400).json({ error: "Tag name is required." });
  }
  const existing = await Tag.findOne({ tag_name });
  if (existing) {
    return res.status(409).json({ error: "A tag with this name already exists." });
  }
  const tag = await Tag.create({ tag_name, trade_ids: [] });
  res.status(201).json({
    _id: tag._id.toString(),
    tag_name: tag.tag_name,
    trade_ids: tag.trade_ids || [],
  });
});

/**
 * DELETE /tags/:id – delete a tag by _id.
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const tag = await Tag.findByIdAndDelete(id);
  if (!tag) {
    return res.status(404).json({ error: "Tag not found." });
  }
  res.status(204).send();
});

module.exports = () => router;
