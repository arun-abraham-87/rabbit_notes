const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const HABITS_DIR = path.join(__dirname, '../../habits');

async function initHabitsDir() {
  try {
    await fs.access(HABITS_DIR);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(HABITS_DIR, { recursive: true });
    }
  }
}

initHabitsDir().catch(console.error);

const HABITS_FILE = path.join(HABITS_DIR, 'habits.json');
const COMPLETIONS_FILE = path.join(HABITS_DIR, 'completions.json');
const QUICK_LISTS_FILE = path.join(HABITS_DIR, 'quick-lists.json');

async function readJson(filePath, defaultVal) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return defaultVal;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function resolveHabitGroup(body, fallback = 'General') {
  return normalizeString(body.timeframe) || normalizeString(body.group) || fallback;
}

function normalizeHabitUpdates(body, existingHabit = {}) {
  const updates = { ...body };

  if (Object.prototype.hasOwnProperty.call(body, 'timeframe') || Object.prototype.hasOwnProperty.call(body, 'group')) {
    updates.group = resolveHabitGroup(body, existingHabit.group || 'General');
  }

  if (Object.prototype.hasOwnProperty.call(body, 'tag')) {
    updates.tag = normalizeString(body.tag);
  }

  delete updates.timeframe;

  return updates;
}

// ── IMPORTANT: specific routes BEFORE /:id wildcard ──────────────────────────

function normalizeQuickList(rawList, index = 0) {
  const now = new Date().toISOString();
  return {
    id: rawList.id || uuidv4(),
    title: normalizeString(rawList.title, 'Untitled list'),
    createdAt: rawList.createdAt || now,
    updatedAt: rawList.updatedAt || rawList.createdAt || now,
    order: Number.isFinite(rawList.order) ? rawList.order : index,
    items: Array.isArray(rawList.items)
      ? rawList.items.map((item, itemIndex) => ({
          id: item.id || uuidv4(),
          text: normalizeString(item.text, 'Untitled item'),
          done: !!item.done,
          createdAt: item.createdAt || now,
          updatedAt: item.updatedAt || item.createdAt || now,
          order: Number.isFinite(item.order) ? item.order : itemIndex,
        }))
      : [],
  };
}

async function readQuickLists() {
  const lists = await readJson(QUICK_LISTS_FILE, []);
  return Array.isArray(lists)
    ? lists.map(normalizeQuickList).sort((a, b) => a.order - b.order)
    : [];
}

// GET /api/habits/quick-lists — list all quick lists
router.get('/quick-lists', async (req, res) => {
  try {
    res.json(await readQuickLists());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/habits/quick-lists — create quick list
router.post('/quick-lists', async (req, res) => {
  try {
    const lists = await readQuickLists();
    const now = new Date().toISOString();
    const list = normalizeQuickList({
      id: uuidv4(),
      title: req.body.title,
      createdAt: now,
      updatedAt: now,
      order: lists.length,
      items: [],
    });
    lists.push(list);
    await writeJson(QUICK_LISTS_FILE, lists);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/habits/quick-lists/:listId — update quick list
router.put('/quick-lists/:listId', async (req, res) => {
  try {
    const lists = await readQuickLists();
    const idx = lists.findIndex(list => list.id === req.params.listId);
    if (idx === -1) return res.status(404).json({ error: 'Quick list not found' });

    lists[idx] = normalizeQuickList({
      ...lists[idx],
      title: Object.prototype.hasOwnProperty.call(req.body, 'title') ? req.body.title : lists[idx].title,
      updatedAt: new Date().toISOString(),
    }, idx);

    await writeJson(QUICK_LISTS_FILE, lists);
    res.json(lists[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/habits/quick-lists/:listId
router.delete('/quick-lists/:listId', async (req, res) => {
  try {
    const lists = await readQuickLists();
    const updated = lists.filter(list => list.id !== req.params.listId);
    await writeJson(QUICK_LISTS_FILE, updated.map((list, index) => ({ ...list, order: index })));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/habits/quick-lists/:listId/items — create quick list item
router.post('/quick-lists/:listId/items', async (req, res) => {
  try {
    const lists = await readQuickLists();
    const idx = lists.findIndex(list => list.id === req.params.listId);
    if (idx === -1) return res.status(404).json({ error: 'Quick list not found' });

    const now = new Date().toISOString();
    const item = {
      id: uuidv4(),
      text: normalizeString(req.body.text, 'Untitled item'),
      done: false,
      createdAt: now,
      updatedAt: now,
      order: lists[idx].items.length,
    };
    lists[idx].items.push(item);
    lists[idx].updatedAt = now;

    await writeJson(QUICK_LISTS_FILE, lists);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/habits/quick-lists/:listId/items/:itemId — update quick list item
router.put('/quick-lists/:listId/items/:itemId', async (req, res) => {
  try {
    const lists = await readQuickLists();
    const listIdx = lists.findIndex(list => list.id === req.params.listId);
    if (listIdx === -1) return res.status(404).json({ error: 'Quick list not found' });

    const itemIdx = lists[listIdx].items.findIndex(item => item.id === req.params.itemId);
    if (itemIdx === -1) return res.status(404).json({ error: 'Quick list item not found' });

    const now = new Date().toISOString();
    lists[listIdx].items[itemIdx] = {
      ...lists[listIdx].items[itemIdx],
      text: Object.prototype.hasOwnProperty.call(req.body, 'text')
        ? normalizeString(req.body.text, lists[listIdx].items[itemIdx].text)
        : lists[listIdx].items[itemIdx].text,
      done: Object.prototype.hasOwnProperty.call(req.body, 'done')
        ? !!req.body.done
        : lists[listIdx].items[itemIdx].done,
      updatedAt: now,
    };
    lists[listIdx].updatedAt = now;

    await writeJson(QUICK_LISTS_FILE, lists);
    res.json(lists[listIdx].items[itemIdx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/habits/quick-lists/:listId/items/:itemId
router.delete('/quick-lists/:listId/items/:itemId', async (req, res) => {
  try {
    const lists = await readQuickLists();
    const listIdx = lists.findIndex(list => list.id === req.params.listId);
    if (listIdx === -1) return res.status(404).json({ error: 'Quick list not found' });

    lists[listIdx].items = lists[listIdx].items
      .filter(item => item.id !== req.params.itemId)
      .map((item, index) => ({ ...item, order: index }));
    lists[listIdx].updatedAt = new Date().toISOString();

    await writeJson(QUICK_LISTS_FILE, lists);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/habits/completions?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/completions', async (req, res) => {
  try {
    const completions = await readJson(COMPLETIONS_FILE, {});
    const { from, to } = req.query;
    if (from && to) {
      const filtered = {};
      Object.keys(completions).forEach(date => {
        if (date >= from && date <= to) filtered[date] = completions[date];
      });
      return res.json(filtered);
    }
    res.json(completions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/habits/completions/:date/:habitId — toggle completion
router.post('/completions/:date/:habitId', async (req, res) => {
  try {
    const { date, habitId } = req.params;
    const completions = await readJson(COMPLETIONS_FILE, {});
    if (!completions[date]) completions[date] = {};
    if (completions[date][habitId]) {
      delete completions[date][habitId];
      await writeJson(COMPLETIONS_FILE, completions);
      return res.json({ done: false });
    } else {
      completions[date][habitId] = { completedAt: new Date().toISOString() };
      await writeJson(COMPLETIONS_FILE, completions);
      return res.json({ done: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRUD ──────────────────────────────────────────────────────────────────────

// GET /api/habits — list all habits
router.get('/', async (req, res) => {
  try {
    const habits = await readJson(HABITS_FILE, []);
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/habits — create habit
router.post('/', async (req, res) => {
  try {
    const habits = await readJson(HABITS_FILE, []);
    const group = resolveHabitGroup(req.body);
    const habit = {
      id: uuidv4(),
      name: req.body.name,
      group,
      tag: normalizeString(req.body.tag),
      frequency: req.body.frequency || 'daily',
      color: req.body.color || 'blue',
      emoji: req.body.emoji || '✅',
      notes: req.body.notes || '',
      createdAt: new Date().toISOString(),
      active: true,
      order: Number.isFinite(req.body.order) ? req.body.order : habits.length,
    };
    habits.push(habit);
    await writeJson(HABITS_FILE, habits);
    res.json(habit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/habits/:id — update habit
router.put('/:id', async (req, res) => {
  try {
    const habits = await readJson(HABITS_FILE, []);
    const idx = habits.findIndex(h => h.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Habit not found' });
    const updates = normalizeHabitUpdates(req.body, habits[idx]);
    habits[idx] = { ...habits[idx], ...updates, id: habits[idx].id };
    delete habits[idx].timeframe;
    await writeJson(HABITS_FILE, habits);
    res.json(habits[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/habits/:id
router.delete('/:id', async (req, res) => {
  try {
    const habits = await readJson(HABITS_FILE, []);
    const updated = habits.filter(h => h.id !== req.params.id);
    await writeJson(HABITS_FILE, updated);
    const completions = await readJson(COMPLETIONS_FILE, {});
    Object.keys(completions).forEach(date => {
      if (completions[date][req.params.id]) delete completions[date][req.params.id];
    });
    await writeJson(COMPLETIONS_FILE, completions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
