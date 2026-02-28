const Entry = require('../models/Entry');

function toImageUrl(req, filename) {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${filename}`;
}

async function createEntry(req, res) {
  const { title, description = '', latitude, longitude } = req.body;

  if (!title || !latitude || !longitude) {
    return res.status(400).json({ message: 'Title, latitude and longitude are required' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Image is required' });
  }

  const entry = await Entry.create({
    title,
    description,
    latitude: Number(latitude),
    longitude: Number(longitude),
    imageUrl: toImageUrl(req, req.file.filename),
    user: req.userId,
  });

  return res.status(201).json(entry);
}

async function getEntries(req, res) {
  const entries = await Entry.find({ user: req.userId }).sort({ createdAt: -1 });
  return res.json(entries);
}

async function updateEntry(req, res) {
  const entry = await Entry.findOne({ _id: req.params.id, user: req.userId });

  if (!entry) {
    return res.status(404).json({ message: 'Entry not found' });
  }

  const {
    title = entry.title,
    description = entry.description,
    latitude = entry.latitude,
    longitude = entry.longitude,
  } = req.body;

  entry.title = String(title).trim();
  entry.description = String(description ?? '').trim();
  entry.latitude = Number(latitude);
  entry.longitude = Number(longitude);

  if (!entry.title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  if (!Number.isFinite(entry.latitude) || !Number.isFinite(entry.longitude)) {
    return res.status(400).json({ message: 'Latitude and longitude must be valid numbers' });
  }

  if (req.file) {
    entry.imageUrl = toImageUrl(req, req.file.filename);
  }

  await entry.save();

  return res.json(entry);
}

async function deleteEntry(req, res) {
  const entry = await Entry.findOne({ _id: req.params.id, user: req.userId });

  if (!entry) {
    return res.status(404).json({ message: 'Entry not found' });
  }

  await entry.deleteOne();

  return res.json({ message: 'Entry deleted' });
}

module.exports = {
  createEntry,
  getEntries,
  updateEntry,
  deleteEntry,
};