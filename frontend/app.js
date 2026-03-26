const API = 'https://habitflow-backend-7ful.onrender.com/api/habits';

// ── State ──────────────────────────────────────────────────────────────────
let habits = [];
let currentCat = 'all';
let editingId = null;
let detailHabitId = null;
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let reminderTimers = [];

// ── On load ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initName();
  initDate();
  fetchHabits();
  requestNotificationPermission();
});

// ── Name handling ──────────────────────────────────────────────────────────
function initName() {
  const name = localStorage.getItem('habitflow_name');
  if (!name) {
    document.getElementById('name-overlay').classList.add('open');
    setTimeout(() => document.getElementById('user-name-input').focus(), 100);
  } else {
    setGreeting(name);
  }
  document.getElementById('user-name-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') saveName();
  });
}

function saveName() {
  const name = document.getElementById('user-name-input').value.trim();
  if (!name) { alert('Please enter your name!'); return; }
  localStorage.setItem('habitflow_name', name);
  document.getElementById('name-overlay').classList.remove('open');
  setGreeting(name);
}

function setGreeting(name) {
  const hour = new Date().getHours();
  const time = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = `${time}, ${name}!`;
}

function changeName() {
  localStorage.removeItem('habitflow_name');
  document.getElementById('user-name-input').value = '';
  document.getElementById('name-overlay').classList.add('open');
  setTimeout(() => document.getElementById('user-name-input').focus(), 100);
}

// ── Date handling ──────────────────────────────────────────────────────────
function initDate() {
  const d = new Date();
  document.getElementById('page-date').textContent =
    d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const picker = document.getElementById('log-date');
  picker.value = getToday();
  picker.max = getToday();
}

function getSelectedDate() {
  const picker = document.getElementById('log-date');
  return picker && picker.value ? picker.value : getToday();
}

// ── Notifications ──────────────────────────────────────────────────────────
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function scheduleReminders() {
  reminderTimers.forEach(t => clearTimeout(t));
  reminderTimers = [];

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  habits.forEach(h => {
    if (!h.reminderTime) return;
    const [hours, minutes] = h.reminderTime.split(':').map(Number);
    const now = new Date();
    const reminder = new Date();
    reminder.setHours(hours, minutes, 0, 0);
    if (reminder <= now) reminder.setDate(reminder.getDate() + 1);
    const delay = reminder - now;
    const timer = setTimeout(() => {
      new Notification('HabitFlow Reminder', {
        body: `Time to: ${h.name}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png'
      });
    }, delay);
    reminderTimers.push(timer);
  });
}

// ── Fetch habits ───────────────────────────────────────────────────────────
async function fetchHabits() {
  try {
    const res = await fetch(API);
    habits = await res.json();
    renderAll();
    scheduleReminders();
  } catch (err) {
    console.error('Cannot connect to backend.');
  }
}

// ── Render all ─────────────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderHabits();
  renderChart();
  renderProgress();
}

// ── Stats ──────────────────────────────────────────────────────────────────
function renderStats() {
  const today = getSelectedDate();
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
  const today = getSelectedDate();

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

      // Per-habit progress since creation
      const createdDate = new Date(h.createdAt).toISOString().split('T')[0];
      const start = new Date(createdDate);
      const end = new Date(getToday());
      const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
      const totalDone = h.completedDates.length;
      const rate = Math.round(totalDone / totalDays * 100);
      const fillClass = rate >= 70 ? '' : rate >= 40 ? 'mid' : 'low';

      const card = document.createElement('div');
      card.className = 'habit-card' + (isDone ? ' done' : '');
      card.innerHTML = `
        <div class="habit-top">
          <button class="check ${isDone ? 'done' : ''}" onclick="toggleHabit('${h._id}')">
            ${isDone ? '✓' : ''}
          </button>
          <div class="habit-info">
            <div class="habit-name ${isDone ? 'done' : ''}">${h.name}</div>
            ${h.description ? `<div class="habit-desc">${h.description}</div>` : ''}
            ${h.reminderTime ? `<div class="habit-reminder">⏰ Reminder: ${formatTime(h.reminderTime)}</div>` : ''}
          </div>
          <div class="habit-right">
            <span class="streak-badge ${h.streak >= 7 ? 'hot' : ''}">
              ${h.streak > 0 ? '🔥 ' + h.streak + 'd' : 'No streak'}
            </span>
            <button class="btn-detail" onclick="openDetailModal('${h._id}')">📅 View</button>
            <button class="btn-edit" onclick="openEditModal('${h._id}')">✏️</button>
            <button class="btn-delete" onclick="deleteHabit('${h._id}')">🗑️</button>
          </div>
        </div>
        <div class="habit-progress">
          <div class="habit-progress-top">
            <span>Overall progress</span>
            <span>${totalDone} of ${totalDays} days — ${rate}%</span>
          </div>
          <div class="habit-progress-bar-bg">
            <div class="habit-progress-bar-fill ${fillClass}" style="width:${rate}%"></div>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  });
}

// ── Weekly chart ───────────────────────────────────────────────────────────
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
      <div class="cat-card-sub">${done} of ${total} check-ins this week</div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill ${fillClass}" style="width:${rate}%"></div>
      </div>
    `;
    el.appendChild(card);
  });

  if (el.children.length === 0) {
    el.innerHTML = '<p style="color:#aaa;font-size:13px">Add some habits to see your breakdown.</p>';
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
    const start = new Date(createdDate);
    const end = new Date(today);
    const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const totalDone = h.completedDates.length;
    const rate = Math.round(totalDone / totalDays * 100);
    return { ...h, rate, totalDays, totalDone, createdDate };
  }).sort((a, b) => b.rate - a.rate);

  withRate.forEach(h => {
    const fillClass = h.rate >= 70 ? '' : h.rate >= 40 ? 'mid' : 'low';
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
      <div class="progress-bar-bg" style="margin:8px 0">
        <div class="progress-bar-fill ${fillClass}" style="width:${h.rate}%"></div>
      </div>
      <div class="dates-row">${datesHtml}</div>
    `;
    el.appendChild(row);
  });
}

// ── Detail modal with calendar ─────────────────────────────────────────────
function openDetailModal(id) {
  const h = habits.find(h => h._id === id);
  if (!h) return;
  detailHabitId = id;
  calendarMonth = new Date().getMonth();
  calendarYear = new Date().getFullYear();
  document.getElementById('detail-title').textContent = h.name;
  renderDetailContent(h);
  document.getElementById('detail-modal').classList.add('open');
}

function renderDetailContent(h) {
  const today = getToday();
  const createdDate = new Date(h.createdAt).toISOString().split('T')[0];
  const start = new Date(createdDate);
  const end = new Date(today);
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const totalDone = h.completedDates.length;
  const rate = Math.round(totalDone / totalDays * 100);

  const content = document.getElementById('detail-content');
  content.innerHTML = `
    <div class="detail-stats">
      <div class="detail-stat">
        <div class="detail-stat-val">${h.streak}</div>
        <div class="detail-stat-lbl">Current streak</div>
      </div>
      <div class="detail-stat">
        <div class="detail-stat-val">${h.bestStreak}</div>
        <div class="detail-stat-lbl">Best streak</div>
      </div>
      <div class="detail-stat">
        <div class="detail-stat-val">${rate}%</div>
        <div class="detail-stat-lbl">Completion rate</div>
      </div>
    </div>
    <div class="calendar-section">
      <div class="calendar-nav">
        <button class="calendar-nav-btn" onclick="changeCalendarMonth(-1)">&#8592;</button>
        <span class="calendar-month" id="cal-month-label"></span>
        <button class="calendar-nav-btn" onclick="changeCalendarMonth(1)">&#8594;</button>
      </div>
      <div class="calendar-grid" id="cal-grid"></div>
      <div class="calendar-legend">
        <span><span class="legend-dot" style="background:#2d6a4f"></span>Completed</span>
        <span><span class="legend-dot" style="background:#f0f9f4;border:1px solid #b7d5c8"></span>Not done</span>
      </div>
    </div>
    <p style="font-size:12px;color:#aaa;margin-top:8px">Click any past date to toggle completion for that date.</p>
  `;
  renderCalendar(h);
}

function renderCalendar(h) {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-label').textContent = `${monthNames[calendarMonth]} ${calendarYear}`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  days.forEach(d => {
    const el = document.createElement('div');
    el.className = 'calendar-day-header';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const today = getToday();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isCompleted = h.completedDates.includes(dateStr);
    const isToday = dateStr === today;
    const isFuture = dateStr > today;
    const isBeforeCreation = dateStr < new Date(h.createdAt).toISOString().split('T')[0];

    const el = document.createElement('div');
    let cls = 'calendar-day';
    if (isCompleted) cls += ' completed';
    if (isToday) cls += ' today';
    if (isFuture || isBeforeCreation) cls += ' future';
    el.className = cls;
    el.textContent = d;

    if (!isFuture && !isBeforeCreation) {
      el.onclick = () => toggleHabitDate(h._id, dateStr);
    }

    grid.appendChild(el);
  }
}

function changeCalendarMonth(dir) {
  calendarMonth += dir;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  const h = habits.find(h => h._id === detailHabitId);
  if (h) renderCalendar(h);
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.remove('open');
  detailHabitId = null;
}

// Toggle habit for any date (from calendar)
async function toggleHabitDate(id, date) {
  try {
    const res = await fetch(`${API}/${id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });
    const updated = await res.json();
    habits = habits.map(h => h._id === id ? updated : h);
    renderAll();
    const h = habits.find(h => h._id === id);
    if (h) {
      renderDetailContent(h);
    }
  } catch (err) {
    console.error('Toggle failed:', err);
  }
}

// ── Toggle habit (today/selected date) ────────────────────────────────────
async function toggleHabit(id) {
  await toggleHabitDate(id, getSelectedDate());
}

// ── Delete habit ───────────────────────────────────────────────────────────
async function deleteHabit(id) {
  if (!confirm('Are you sure you want to delete this habit?')) return;
  try {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    habits = habits.filter(h => h._id !== id);
    renderAll();
    scheduleReminders();
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
  document.getElementById('m-reminder').value = '';
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
  document.getElementById('m-reminder').value = h.reminderTime || '';
  document.getElementById('modal-bg').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
  editingId = null;
}

async function saveHabit() {
  const name = document.getElementById('m-name').value.trim();
  if (!name) { alert('Please enter a habit name.'); return; }

  const body = {
    name,
    description: document.getElementById('m-desc').value.trim(),
    category: document.getElementById('m-cat').value,
    reminderTime: document.getElementById('m-reminder').value || ''
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
    scheduleReminders();
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

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2,'0')} ${ampm}`;
}

// ── Close modals ───────────────────────────────────────────────────────────
document.getElementById('modal-bg').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
document.getElementById('detail-modal').addEventListener('click', function(e) {
  if (e.target === this) closeDetailModal();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeModal(); closeDetailModal(); }
});
