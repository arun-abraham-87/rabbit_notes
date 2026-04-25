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
