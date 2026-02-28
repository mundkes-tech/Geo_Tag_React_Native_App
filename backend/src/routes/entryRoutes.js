const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { createEntry, getEntries, updateEntry, deleteEntry } = require('../controllers/entryController');

const router = express.Router();

router.use(auth);

router.post('/', upload.single('image'), asyncHandler(createEntry));
router.get('/', asyncHandler(getEntries));
router.put('/:id', upload.single('image'), asyncHandler(updateEntry));
router.delete('/:id', asyncHandler(deleteEntry));

module.exports = router;