const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');

// GET all habits
router.get('/', async (req, res) => {
  try {
    const habits = await Habit.find().sort({ createdAt: -1 });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single habit
router.get('/:id', async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    res.json(habit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE habit
router.post('/', async (req, res) => {
  try {
    const habit = new Habit({
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      customCategory: req.body.customCategory
    });
    const newHabit = await habit.save();
    res.status(201).json(newHabit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE habit
router.put('/:id', async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    if (req.body.name !== undefined) habit.name = req.body.name;
    if (req.body.description !== undefined) habit.description = req.body.description;
    if (req.body.category !== undefined) habit.category = req.body.category;
    if (req.body.customCategory !== undefined) habit.customCategory = req.body.customCategory;

    const updated = await habit.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// MARK habit as done for a specific date
router.patch('/:id/complete', async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
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
router.delete('/:id', async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    await habit.deleteOne();
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;