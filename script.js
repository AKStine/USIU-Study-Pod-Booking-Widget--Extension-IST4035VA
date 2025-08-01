/*
 * USIU-Africa Study Pod Booking -- Extension -- System - JavaScript Implementation
 * [This includes the Undo Booking Feature Using Stack]
 */

// Core data structures
const pods = [
    { id: "POD-A", capacity: 4 },
    { id: "POD-B", capacity: 4 },
    { id: "POD-C", capacity: 4 },
];

const initialBookings = [
    { podId: "POD-A", time: "09:00", students: ["SIT-001", "SIT-045"] },
    { podId: "POD-B", time: "10:00", students: ["SMC-210"] },
];

let bookings = JSON.parse(JSON.stringify(initialBookings)); // deep copy
let duplicateAttempts = 0;
let bookingHistoryStack = []; // for undo feature

// DOM elements
const podSelect = document.getElementById('pod-select');
const timeInput = document.getElementById('time-input');
const studentsInput = document.getElementById('students-input');
const bookingForm = document.getElementById('booking-form');
const errorsDiv = document.getElementById('errors');
const successDiv = document.getElementById('success-message');
const bookingsTableBody = document.getElementById('bookings-tbody');
const insightsContainer = document.getElementById('insights-container');

// Populates the dropdown menu with available pods
function populatePodSelect() {
  podSelect.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Choose a study pod...';
  podSelect.appendChild(defaultOption);

  for (let i = 0; i < pods.length; i++) {
    const pod = pods[i];
    const option = document.createElement('option');
    option.value = pod.id;
    option.textContent = `${pod.id} (Capacity: ${pod.capacity} students)`;
    podSelect.appendChild(option);
  }
}

// CONTINUING renderBookingsTable()
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
        const booking = bookings[i];
        const row = document.createElement('tr');

        const indexCell = document.createElement('td');
        indexCell.textContent = (i + 1).toString();
        row.appendChild(indexCell);

        const podCell = document.createElement('td');
        podCell.textContent = booking.podId;
        row.appendChild(podCell);

        const timeCell = document.createElement('td');
        timeCell.textContent = booking.time;
        row.appendChild(timeCell);

        const countCell = document.createElement('td');
        countCell.textContent = booking.students.length.toString();
        row.appendChild(countCell);

        const studentsCell = document.createElement('td');
        studentsCell.textContent = booking.students.join(', ');
        row.appendChild(studentsCell);

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

// INSIGHTS RENDERING
function renderInsightsPanel() {
    const insights = recomputeInsights(bookings, pods);
    insightsContainer.innerHTML = '';

    const card1 = createInsightCard('Total Bookings', insights.totalBookings);
    const card2 = createInsightCard('Unique Students', insights.uniqueStudents);
    const card3 = createInsightCard('Busiest Hour', insights.busiestHour);
    const card4 = createInsightCard('Duplicate Rule Attempts', insights.duplicateAttempts);

    insightsContainer.appendChild(card1);
    insightsContainer.appendChild(card2);
    insightsContainer.appendChild(card3);
    insightsContainer.appendChild(card4);

    const podSection = document.createElement('div');
    podSection.className = 'pod-fill-rates';

    for (let i = 0; i < insights.podFillRates.length; i++) {
        const rate = insights.podFillRates[i];
        const div = document.createElement('div');
        div.className = 'pod-fill-rate';
        div.innerHTML = `<strong>${rate.podId}</strong> – ${rate.fillRate}% filled (${rate.slotsUsed} slots used)`;
        podSection.appendChild(div);
    }

    insightsContainer.appendChild(podSection);
}

function createInsightCard(title, value) {
    const card = document.createElement('div');
    card.className = 'insight-card';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'insight-title';
    titleDiv.textContent = title;

    const valueDiv = document.createElement('div');
    valueDiv.className = 'insight-value';
    valueDiv.textContent = value;

    card.appendChild(titleDiv);
    card.appendChild(valueDiv);

    return card;
}

// UNDO FEATURE (NEW)
function undoLastBooking() {
    if (bookingHistoryStack.length === 0) {
        alert("Nothing to undo.");
        return;
    }

    const lastBooking = bookingHistoryStack.pop();

    for (let i = 0; i < bookings.length; i++) {
        if (bookings[i].podId === lastBooking.podId &&
            bookings[i].time === lastBooking.time &&
            bookings[i].students.length === lastBooking.students.length &&
            bookings[i].students.every((id, idx) => id === lastBooking.students[idx])) {
            bookings.splice(i, 1);
            break;
        }
    }

    renderBookingsTable();
    renderInsightsPanel();
}

// FORM SUBMISSION HANDLER
bookingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    errorsDiv.classList.remove('show');
    successDiv.classList.remove('show');

    const podId = podSelect.value;
    const time = timeInput.value;
    const studentIds = parseStudentIds(studentsInput.value);

    const errors = validateBooking(podId, time, studentIds);

    if (errors.length > 0) {
        errorsDiv.innerHTML = errors.map(err => `<p>${err}</p>`).join('');
        errorsDiv.classList.add('show');
        return;
    }

    // Valid booking: push to state
    const existing = findBooking(podId, time);
    if (existing) {
        existing.students = existing.students.concat(studentIds);
    } else {
        const newBooking = { podId: podId, time: time, students: studentIds };
        bookings.push(newBooking);
        bookingHistoryStack.push(newBooking); // Store for undo
    }

    studentsInput.value = '';
    timeInput.value = '';
    podSelect.value = '';

    successDiv.textContent = 'Booking successful!';
    successDiv.classList.add('show');

    renderBookingsTable();
    renderInsightsPanel();
});

// Add Undo Button to DOM
function addUndoButton() {
    const formSection = document.querySelector('.form-section');
    const undoBtn = document.createElement('button');
    undoBtn.textContent = '↩️ Undo Last Booking';
    undoBtn.type = 'button';
    undoBtn.style.marginTop = '20px';
    undoBtn.addEventListener('click', undoLastBooking);
    formSection.appendChild(undoBtn);
}

// Initialize App
function init() {
    populatePodSelect();
    renderBookingsTable();
    renderInsightsPanel();
    addUndoButton();
}

init();
