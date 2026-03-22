const API = 'https://habitflow-backend-7ful.onrender.com/api/habits';

// ── State ──────────────────────────────────────────────────────────────────
let habits = [];
let currentCat = 'all';
let editingId = null;

// ── On load ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const d = new Date();
  document.getElementById('page-date').textContent =
    d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  fetchHabits();
});

// ── Fetch habits from backend ──────────────────────────────────────────────
async function fetchHabits() {
  try {
    const res = await fetch(API);
    habits = await res.json();
    renderAll();
  } catch (err) {
    console.error('Cannot connect to backend. Is the server running?');
  }
}

// ── Render everything ──────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderHabits();
  renderChart();
  renderProgress();
}

// ── Stats ──────────────────────────────────────────────────────────────────
function renderStats() {
  const today = getToday();
  const done = habits.filter(h => h.completedDates.includes(today)).length;
  const total = habits.length;
  const best = habits.reduce((m, h) => Math.max(m, h.bestStreak), 0);
  const rate = total > 0 ? Math.round(done / total * 100) : 0;

  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-streak').textContent = best;
  document.getElementById('stat-rate').textContent = rate + '%';
}

// ── Habits list ────────────────────────────────────────────────────────────
function renderHabits() {
  const list = document.getElementById('habits-list');
  list.innerHTML = '';

  const today = getToday();

  const filtered = currentCat === 'all'
    ? habits
    : habits.filter(h => h.category === currentCat);

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty">No habits here yet — click "+ Add Habit" to get started!</div>';
    return;
  }

  const cats = [
    { key: 'health', label: 'Health & Fitness' },
    { key: 'money',  label: 'Money & Finance' },
    { key: 'mind',   label: 'Mind & Learning' },
    { key: 'work',   label: 'Work & Productivity' },
  ];

  cats.forEach(cat => {
    const catHabits = filtered.filter(h => h.category === cat.key);
    if (catHabits.length === 0) return;

    const label = document.createElement('div');
    label.className = 'cat-label';
    label.textContent = cat.label;
    list.appendChild(label);

    catHabits.forEach(h => {
      const isDone = h.completedDates.includes(today);
      const card = document.createElement('div');
      card.className = 'habit-card' + (isDone ? ' done' : '');
      card.innerHTML = `
        <button class="check ${isDone ? 'done' : ''}" onclick="toggleHabit('${h._id}')">
          ${isDone ? '✓' : ''}
        </button>
        <div class="habit-info">
          <div class="habit-name ${isDone ? 'done' : ''}">${h.name}</div>
          ${h.description ? `<div class="habit-desc">${h.description}</div>` : ''}
        </div>
        <div class="habit-right">
          <span class="streak-badge ${h.streak >= 7 ? 'hot' : ''}">
            ${h.streak > 0 ? '🔥 ' + h.streak + ' day streak' : 'No streak yet'}
          </span>
          <button class="btn-edit" onclick="openEditModal('${h._id}')">✏️</button>
          <button class="btn-delete" onclick="deleteHabit('${h._id}')">🗑️</button>
        </div>
      `;
      list.appendChild(card);
    });
  });
}

// ── Weekly bar chart ───────────────────────────────────────────────────────
function renderChart() {
  const barsEl = document.getElementById('chart-bars');
  const labelsEl = document.getElementById('chart-labels');
  if (!barsEl) return;

  barsEl.innerHTML = '';
  labelsEl.innerHTML = '';

  const last7 = getLast7Days();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = getToday();
  const maxVal = habits.length || 1;

  last7.forEach((date, i) => {
    const done = habits.filter(h => h.completedDates.includes(date)).length;
    const heightPct = Math.round(done / maxVal * 100);

    const bar = document.createElement('div');
    bar.className = 'chart-bar' + (done > 0 ? ' has-data' : '') + (date === today ? ' today' : '');
    bar.style.height = Math.max(4, heightPct) + 'px';
    bar.title = `${date}: ${done} habits done`;

    if (done > 0) {
      const val = document.createElement('div');
      val.className = 'bar-val';
      val.textContent = done;
      bar.appendChild(val);
    }

    barsEl.appendChild(bar);

    const label = document.createElement('div');
    label.className = 'chart-label';
    label.textContent = date === today ? 'Today' : dayNames[i];
    labelsEl.appendChild(label);
  });
}

// ── Progress page ──────────────────────────────────────────────────────────
function renderProgress() {
  renderCatBreakdown();
  renderProgressList();
}

function renderCatBreakdown() {
  const el = document.getElementById('cat-breakdown');
  if (!el) return;
  el.innerHTML = '';

  const last7 = getLast7Days();
  const cats = [
    { key: 'health', label: 'Health & Fitness' },
    { key: 'money',  label: 'Money & Finance' },
    { key: 'mind',   label: 'Mind & Learning' },
    { key: 'work',   label: 'Work & Productivity' },
  ];

  cats.forEach(cat => {
    const catHabits = habits.filter(h => h.category === cat.key);
    if (catHabits.length === 0) return;

    let done = 0, total = 0;
    catHabits.forEach(h => {
      const habitCreated = new Date(h.createdAt).toISOString().split('T')[0];
      last7.forEach(d => {
        if (d >= habitCreated) {
          total++;
          if (h.completedDates.includes(d)) done++;
        }
      });
    });

    const rate = total > 0 ? Math.round(done / total * 100) : 0;
    const fillClass = rate >= 70 ? '' : rate >= 40 ? 'mid' : 'low';

    const card = document.createElement('div');
    card.className = 'cat-card';
    card.innerHTML = `
      <div class="cat-card-name">${cat.label}</div>
      <div class="cat-card-rate">${rate}%</div>
      <div class="cat-card-sub">${done} of ${total} possible check-ins this week</div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill ${fillClass}" style="width:${rate}%"></div>
      </div>
    `;
    el.appendChild(card);
  });

  if (el.children.length === 0) {
    el.innerHTML = '<p style="color:#aaa;font-size:13px">Add some habits to see your category breakdown.</p>';
  }
}

function renderProgressList() {
  const el = document.getElementById('progress-list');
  if (!el) return;
  el.innerHTML = '';

  const catLabels = { health: 'Health', money: 'Finance', mind: 'Learning', work: 'Work' };

  if (habits.length === 0) {
    el.innerHTML = '<div class="empty">No habits yet.</div>';
    return;
  }

  const today = getToday();

  const withRate = habits.map(h => {
    const createdDate = new Date(h.createdAt).toISOString().split('T')[0];

    // Total days since creation up to today
    const start = new Date(createdDate);
    const end = new Date(today);
    const totalDays = Math.round((end - start) / 86400000) + 1;

    // Total times completed ever
    const totalDone = h.completedDates.length;

    // Completion rate since creation
    const rate = totalDays > 0 ? Math.round(totalDone / totalDays * 100) : 0;

    return { ...h, rate, totalDays, totalDone, createdDate };
  }).sort((a, b) => b.rate - a.rate);

  withRate.forEach(h => {
    const fillClass = h.rate >= 70 ? '' : h.rate >= 40 ? 'mid' : 'low';

    // Sort completed dates newest first
    const sortedDates = [...h.completedDates].sort((a, b) => new Date(b) - new Date(a));
    const datesHtml = sortedDates.length > 0
      ? sortedDates.map(d => `<span class="date-tag">${formatDate(d)}</span>`).join('')
      : '<span style="color:#bbb;font-size:12px">No completions yet</span>';

    const row = document.createElement('div');
    row.className = 'progress-row-big';
    row.innerHTML = `
      <div class="progress-row-top">
        <div class="progress-name">${h.name}</div>
        <span class="progress-cat">${catLabels[h.category] || h.category}</span>
        <div class="progress-pct" style="color:${h.rate >= 70 ? '#2d6a4f' : h.rate >= 40 ? '#f4a261' : '#e76f51'}">${h.rate}%</div>
      </div>
      <div class="progress-meta-row">
        <span>📅 Created: ${formatDate(h.createdDate)}</span>
        <span>✅ Done ${h.totalDone} of ${h.totalDays} days</span>
        <span>🔥 Best streak: ${h.bestStreak} days</span>
      </div>
      <div class="progress-bar-bg" style="margin: 8px 0;">
        <div class="progress-bar-fill ${fillClass}" style="width:${h.rate}%"></div>
      </div>
      <div class="dates-row">${datesHtml}</div>
    `;
    el.appendChild(row);
  });
}

// ── Toggle habit done ──────────────────────────────────────────────────────
async function toggleHabit(id) {
  try {
    const today = getToday();
    const res = await fetch(`${API}/${id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today })
    });
    const updated = await res.json();
    habits = habits.map(h => h._id === id ? updated : h);
    renderAll();
  } catch (err) {
    console.error('Toggle failed:', err);
  }
}

// ── Delete habit ───────────────────────────────────────────────────────────
async function deleteHabit(id) {
  if (!confirm('Are you sure you want to delete this habit?')) return;
  try {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    habits = habits.filter(h => h._id !== id);
    renderAll();
  } catch (err) {
    console.error('Delete failed:', err);
  }
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Add a Habit';
  document.getElementById('m-name').value = '';
  document.getElementById('m-desc').value = '';
  document.getElementById('m-cat').value = 'health';
  document.getElementById('modal-bg').classList.add('open');
  setTimeout(() => document.getElementById('m-name').focus(), 100);
}

function openEditModal(id) {
  const h = habits.find(h => h._id === id);
  if (!h) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'Edit Habit';
  document.getElementById('m-name').value = h.name;
  document.getElementById('m-desc').value = h.description || '';
  document.getElementById('m-cat').value = h.category;
  document.getElementById('modal-bg').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
  editingId = null;
}

async function saveHabit() {
  const name = document.getElementById('m-name').value.trim();
  if (!name) {
    alert('Please enter a habit name.');
    return;
  }

  const body = {
    name: name,
    description: document.getElementById('m-desc').value.trim(),
    category: document.getElementById('m-cat').value
  };

  try {
    if (editingId) {
      const res = await fetch(`${API}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const updated = await res.json();
      habits = habits.map(h => h._id === editingId ? updated : h);
    } else {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const created = await res.json();
      habits.push(created);
    }
    closeModal();
    renderAll();
  } catch (err) {
    console.error('Save failed:', err);
    alert('Something went wrong. Make sure the backend is running.');
  }
}

// ── Page switching ─────────────────────────────────────────────────────────
function showPage(page, btn) {
  document.getElementById('page-habits').style.display   = page === 'habits'   ? 'block' : 'none';
  document.getElementById('page-progress').style.display = page === 'progress' ? 'block' : 'none';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (page === 'progress') renderProgress();
}

// ── Category filter ────────────────────────────────────────────────────────
function filterCat(cat, btn) {
  currentCat = cat;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderHabits();
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Close modal when clicking outside
document.getElementById('modal-bg').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});