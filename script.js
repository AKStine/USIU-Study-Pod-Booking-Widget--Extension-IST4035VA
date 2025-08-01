/*
 * USIU-Africa Study Pod Booking -- Extension -- System - JavaScript Implementation
 * [Includes Undo Booking Feature Using Stack + Prepares for Backend Integration]
 */

// Core data structures
const pods = [
    { id: "POD-A", capacity: 4 },
    { id: "POD-B", capacity: 4 },
    { id: "POD-C", capacity: 4 }
];

const initialBookings = [
    { podId: "POD-A", time: "09:00", students: ["SIT-001", "SIT-045"] },
    { podId: "POD-B", time: "10:00", students: ["SMC-210"] }
];

let bookings = JSON.parse(JSON.stringify(initialBookings));
let duplicateAttempts = 0;
let bookingHistoryStack = [];

// DOM references
const podSelect = document.getElementById('pod-select');
const timeInput = document.getElementById('time-input');
const studentsInput = document.getElementById('students-input');
const bookingForm = document.getElementById('booking-form');
const errorsDiv = document.getElementById('errors');
const successDiv = document.getElementById('success-message');
const bookingsTableBody = document.getElementById('bookings-tbody');
const insightsContainer = document.getElementById('insights-container');

// Utility
function parseStudentIds(inputString) {
  const rawIds = inputString.split(',');
  const clean = [];
  for (let i = 0; i < rawIds.length; i++) {
    const id = rawIds[i].trim().toUpperCase();
    if (id !== '') clean.push(id);
  }
  return clean;
}

function isWithinOperatingHours(time) {
  const [hour, min] = time.split(':').map(Number);
  return hour >= 8 && hour < 20;
}

function findBooking(podId, time) {
  for (let i = 0; i < bookings.length; i++) {
    if (bookings[i].podId === podId && bookings[i].time === time) return bookings[i];
  }
  return null;
}

function hasCrossPodClash(studentId, time, excludePod) {
  for (let i = 0; i < bookings.length; i++) {
    if (bookings[i].time === time && bookings[i].podId !== excludePod) {
      if (bookings[i].students.includes(studentId)) return true;
    }
  }
  return false;
}

function validateBooking(podId, time, studentIds) {
  const errors = [];
  if (!isWithinOperatingHours(time)) errors.push("Booking must be between 08:00 and 19:59.");
  if (studentIds.length === 0) errors.push("Provide at least one student ID.");

  const existing = findBooking(podId, time);
  const current = existing ? existing.students.length : 0;
  if (current + studentIds.length > 4) {
    errors.push("Pod capacity exceeded.");
  }

  for (let i = 0; i < studentIds.length; i++) {
    const id = studentIds[i];
    if (existing && existing.students.includes(id)) {
      errors.push(`Student ${id} already booked in ${podId} at ${time}`);
      duplicateAttempts++;
    }
    if (hasCrossPodClash(id, time, podId)) {
      errors.push(`Student ${id} has a conflict at ${time} in another pod.`);
      duplicateAttempts++;
    }
  }

  return errors;
}

function round1(num) {
  return Math.round(num * 10) / 10;
}

function recomputeInsights(bookingsArray, podsArray) {
  const unique = [];
  const hourCount = {};
  const insights = {
    totalBookings: bookingsArray.length,
    uniqueStudents: 0,
    busiestHour: 'N/A',
    podFillRates: [],
    duplicateAttempts: duplicateAttempts
  };

  for (let i = 0; i < bookingsArray.length; i++) {
    const b = bookingsArray[i];
    hourCount[b.time] = (hourCount[b.time] || 0) + b.students.length;
    for (let j = 0; j < b.students.length; j++) {
      if (!unique.includes(b.students[j])) unique.push(b.students[j]);
    }
  }
  insights.uniqueStudents = unique.length;

  let max = 0;
  for (let h in hourCount) {
    if (hourCount[h] > max) {
      max = hourCount[h];
      insights.busiestHour = h;
    }
  }

  for (let i = 0; i < podsArray.length; i++) {
    const pod = podsArray[i];
    let total = 0, slots = 0, seen = {};
    for (let j = 0; j < bookingsArray.length; j++) {
      const b = bookingsArray[j];
      if (b.podId === pod.id) {
        total += b.students.length;
        if (!seen[b.time]) {
          seen[b.time] = true;
          slots++;
        }
      }
    }
    const capacity = pod.capacity * slots;
    const fill = capacity > 0 ? (total / capacity) * 100 : 0;
    insights.podFillRates.push({
      podId: pod.id,
      fillRate: round1(fill),
      slotsUsed: slots,
      bookedSeats: total
    });
  }

  return insights;
}

function populatePodSelect() {
  podSelect.innerHTML = '';
  const def = document.createElement('option');
  def.value = '';
  def.textContent = 'Choose a study pod...';
  podSelect.appendChild(def);
  for (let i = 0; i < pods.length; i++) {
    const pod = pods[i];
    const option = document.createElement('option');
    option.value = pod.id;
    option.textContent = `${pod.id} (Capacity: ${pod.capacity} students)`;
    podSelect.appendChild(option);
  }
}

function renderBookingsTable() {
  bookingsTableBody.innerHTML = '';
  if (bookings.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'no-bookings';
    cell.textContent = 'No bookings yet. Create your first booking above! 📅';
    row.appendChild(cell);
    bookingsTableBody.appendChild(row);
    return;
  }

  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    const row = document.createElement('tr');

    const cells = [
      i + 1,
      b.podId,
      b.time,
      b.students.length,
      b.students.join(', ')
    ];

    for (let j = 0; j < cells.length; j++) {
      const td = document.createElement('td');
      td.textContent = cells[j];
      row.appendChild(td);
    }

    const actionCell = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.className = 'remove-btn';
    btn.onclick = function () {
      bookings.splice(i, 1);
      renderBookingsTable();
      renderInsightsPanel();
    };
    actionCell.appendChild(btn);
    row.appendChild(actionCell);
    bookingsTableBody.appendChild(row);
  }
}

function renderInsightsPanel() {
  const insights = recomputeInsights(bookings, pods);
  insightsContainer.innerHTML = '';

  const summary = [
    ['Total Bookings', insights.totalBookings],
    ['Unique Students', insights.uniqueStudents],
    ['Busiest Hour', insights.busiestHour],
    ['Duplicate Rule Attempts', insights.duplicateAttempts]
  ];

  for (let i = 0; i < summary.length; i++) {
    const card = document.createElement('div');
    card.className = 'insight-card';
    card.innerHTML = `<div class="insight-title">${summary[i][0]}</div><div class="insight-value">${summary[i][1]}</div>`;
    insightsContainer.appendChild(card);
  }

  const podSection = document.createElement('div');
  podSection.className = 'pod-fill-rates';
  for (let i = 0; i < insights.podFillRates.length; i++) {
    const r = insights.podFillRates[i];
    const d = document.createElement('div');
    d.className = 'pod-fill-rate';
    d.innerHTML = `<strong>${r.podId}</strong> – ${r.fillRate}% filled (${r.slotsUsed} slots used)`;
    podSection.appendChild(d);
  }
  insightsContainer.appendChild(podSection);
}

function undoLastBooking() {
  if (bookingHistoryStack.length === 0) return alert("Nothing to undo.");
  const last = bookingHistoryStack.pop();
  for (let i = 0; i < bookings.length; i++) {
    if (
      bookings[i].podId === last.podId &&
      bookings[i].time === last.time &&
      bookings[i].students.length === last.students.length &&
      bookings[i].students.every((id, j) => id === last.students[j])
    ) {
      bookings.splice(i, 1);
      break;
    }
  }
  renderBookingsTable();
  renderInsightsPanel();
}

bookingForm.addEventListener('submit', function (e) {
  e.preventDefault();
  errorsDiv.classList.remove('show');
  successDiv.classList.remove('show');

  const podId = podSelect.value;
  const time = timeInput.value;
  const studentIds = parseStudentIds(studentsInput.value);

  const errors = validateBooking(podId, time, studentIds);
  if (errors.length > 0) {
    errorsDiv.innerHTML = errors.map(e => `<p>${e}</p>`).join('');
    errorsDiv.classList.add('show');
    return;
  }

  const existing = findBooking(podId, time);
  if (existing) {
    existing.students = existing.students.concat(studentIds);
  } else {
    const newBooking = { podId, time, students: studentIds };
    bookings.push(newBooking);
    bookingHistoryStack.push(newBooking);
  }

  studentsInput.value = '';
  timeInput.value = '';
  podSelect.value = '';

  successDiv.textContent = 'Booking successful!';
  successDiv.classList.add('show');

  renderBookingsTable();
  renderInsightsPanel();
});

function addUndoButton() {
  const section = document.querySelector('.form-section');
  const btn = document.createElement('button');
  btn.textContent = '↩️ Undo Last Booking';
  btn.type = 'button';
  btn.style.marginTop = '20px';
  btn.addEventListener('click', undoLastBooking);
  section.appendChild(btn);
}

function init() {
  populatePodSelect();
  renderBookingsTable();
  renderInsightsPanel();
  addUndoButton();
}

init();
