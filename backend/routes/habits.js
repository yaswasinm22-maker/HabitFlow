const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const auth = require('../middleware/auth');

// GET all habits for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single habit
router.get('/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.userId });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json(habit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE habit
router.post('/', auth, async (req, res) => {
  try {
    const habit = new Habit({
      user: req.userId,
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      reminderTime: req.body.reminderTime || '',
      customCategory: req.body.customCategory
    });
    const newHabit = await habit.save();
    res.status(201).json(newHabit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE habit
router.put('/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.userId });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    if (req.body.name !== undefined) habit.name = req.body.name;
    if (req.body.description !== undefined) habit.description = req.body.description;
    if (req.body.category !== undefined) habit.category = req.body.category;
    if (req.body.reminderTime !== undefined) habit.reminderTime = req.body.reminderTime;
    if (req.body.customCategory !== undefined) habit.customCategory = req.body.customCategory;

    const updated = await habit.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// MARK habit as done for a specific date
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.userId });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    const date = req.body.date || new Date().toISOString().split('T')[0];
    const todayDate = new Date().toISOString().split('T')[0];
    const isPastDate = date < todayDate;

    if (!habit.completedDates.includes(date)) {
      habit.completedDates.push(date);
      if (!isPastDate) {
        habit.streak += 1;
        if (habit.streak > habit.bestStreak) habit.bestStreak = habit.streak;
      }
    } else {
      habit.completedDates = habit.completedDates.filter(d => d !== date);
      if (!isPastDate) {
        habit.streak = Math.max(0, habit.streak - 1);
      }
    }

    const updated = await habit.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE habit
router.delete('/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
