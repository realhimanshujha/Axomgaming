const API_URL = "https://script.google.com/macros/s/AKfycbzhYFcW9RB7zFKMsn0CURttmL-t3j3Uk8PFTyx-FKUBA8mQKXVu0Yb5R4RDsZcGh6Gy4g/exec";

const token = sessionStorage.getItem("axomToken");

let memberData = [];
let consoleData = [];

const $ = (id) => document.getElementById(id);

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));

const formatHours = (value) =>
  `${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}h`;

// ================================
// API CONNECTION
// ================================

async function api(action, payload = {}) {
  if (!token) {
    throw new Error(
      "Your admin session is missing. Please log in on the main dashboard first, then open this page."
    );
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action,
      token,
      ...payload
    })
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

// ================================
// NOTIFICATIONS
// ================================

function notice(message, error = false) {
  $("notice").textContent = message;
  $("notice").classList.toggle("error", error);
  $("notice").classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function hideNotice() {
  $("notice").classList.add("hidden");
}

// ================================
// DATE FORMATTING
// ================================

function prettyDate(value) {
  if (!value) return "—";

  const d = new Date(`${value}T00:00:00`);

  return isNaN(d)
    ? value
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
}

// ================================
// DISPLAY MEMBERS
// ================================

function renderMembers() {
  const q = $("searchMembers").value.trim().toLowerCase();

  const filtered = memberData.filter(m =>
    [m.name, m.phone, m.memberId, m.email].some(v =>
      String(v || "").toLowerCase().includes(q)
    )
  );

  $("membersBody").innerHTML = filtered.length
    ? filtered.map(m => {
        const statusClass =
          m.status === "Active"
            ? ""
            : m.status === "Expired" ||
              m.status === "Hours Exhausted"
            ? "expired"
            : "inactive";

        return `
          <tr>
            <td>
              <div class="member-name">${esc(m.name)}</div>
              <div class="member-sub">
                ${esc(m.memberId)} · ${esc(m.phone)}
              </div>
            </td>

            <td>${esc(m.planName)}</td>

            <td>${formatHours(m.usedHours)}</td>

            <td class="hours">
              ${formatHours(m.remainingHours)}
            </td>

            <td>${formatHours(m.usedToday)}</td>

            <td>${prettyDate(m.expiryDate)}</td>

            <td>
              <span class="status ${statusClass}">
                ${esc(m.status)}
              </span>
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="7" class="empty">
          No members found.
        </td>
      </tr>
    `;

  const active = memberData.filter(m => m.status === "Active");

  $("statMembers").textContent = memberData.length;

  $("statActive").textContent = active.length;

  $("statHours").textContent = formatHours(
    active.reduce(
      (sum, m) => sum + Number(m.remainingHours || 0),
      0
    )
  );

  const current = $("memberSelect").value;

  $("memberSelect").innerHTML = `
    <option value="">Choose a member…</option>
  ` + memberData.map(m => `
    <option
      value="${esc(m.memberId)}"
      ${m.memberId === current ? "selected" : ""}
    >
      ${esc(m.name)} — ${esc(m.memberId)}
      (${formatHours(m.remainingHours)} left · ${esc(m.status)})
    </option>
  `).join("");

  updateMemberCard();
}

// ================================
// MEMBER BALANCE CARD
// ================================

function updateMemberCard() {
  const m = memberData.find(
    x => x.memberId === $("memberSelect").value
  );

  if (!m) {
    $("memberCard").innerHTML =
      "<span>Select a member to see their balance.</span>";

    return;
  }

  $("memberCard").innerHTML = `
    <div>
      <strong>${esc(m.name)}</strong> · ${esc(m.memberId)}
      <br>
      ${esc(m.email)} · ${esc(m.phone)}
    </div>

    <div class="balance">
      ${formatHours(m.remainingHours)} remaining
    </div>

    <div>
      Total ${formatHours(m.totalHours)}
      · Used ${formatHours(m.usedHours)}
      · Used today ${formatHours(m.usedToday)}
      <br>
      Expires ${prettyDate(m.expiryDate)}
      · Max ${m.maxPlayers} player(s)
      · ${esc(m.status)}
    </div>
  `;

  const maxPlayers = Math.max(
    1,
    Math.min(4, Number(m.maxPlayers) || 2)
  );

  $("playersSelect").innerHTML = Array.from(
    { length: maxPlayers },
    (_, i) => `
      <option value="${i + 1}">
        ${i + 1} player${i === 0 ? "" : "s"}
      </option>
    `
  ).join("");
}

// ================================
// BOOKING DURATION SUMMARY
// Supports 30-minute intervals
// ================================

function updateSummary() {
  const mins = Number(
    $("bookingForm").durationMinutes.value || 60
  );

  const start =
    $("bookingForm").startTime.value || "16:00";

  const [h, m] = start.split(":").map(Number);

  const startMinutes = h * 60 + m;
  const end = startMinutes + mins;

  const wholeHours = Math.floor(mins / 60);
  const remainder = mins % 60;

  let durationLabel;

  if (wholeHours && remainder) {
    durationLabel =
      `${wholeHours} hour${wholeHours === 1 ? "" : "s"} ` +
      `${remainder} minutes`;
  } else if (wholeHours) {
    durationLabel =
      `${wholeHours} hour${wholeHours === 1 ? "" : "s"}`;
  } else {
    durationLabel = `${remainder} minutes`;
  }

  $("durationSummary").textContent = durationLabel;

  const endHour = Math.floor(end / 60);
  const endMinute = end % 60;

  $("endSummary").textContent =
    `${String(endHour).padStart(2, "0")}:` +
    `${String(endMinute).padStart(2, "0")}`;
}

// ================================
// REFRESH MEMBERS AND CONSOLES
// ================================

async function refresh() {
  hideNotice();

  $("refreshBtn").disabled = true;

  try {
    const data = await api("getMembershipData");

    memberData = data.members || [];
    consoleData = data.consoles || [];

    $("consoleSelect").innerHTML = `
      <option value="">Choose PS5 console…</option>
    ` + consoleData.map(c => `
      <option value="${esc(c.consoleName)}">
        ${esc(c.consoleName)}
      </option>
    `).join("");

    renderMembers();

  } catch (e) {
    notice(e.message, true);

  } finally {
    $("refreshBtn").disabled = false;
  }
}

// ================================
// CREATE MEMBERSHIP
// ================================

$("memberForm").addEventListener("submit", async event => {
  event.preventDefault();

  hideNotice();

  const form = event.currentTarget;

  const button = form.querySelector(
    'button[type="submit"]'
  );

  const values = Object.fromEntries(
    new FormData(form).entries()
  );

  values.pricePaid = Number(values.pricePaid);
  values.totalHours = Number(values.totalHours);
  values.validityDays = Number(values.validityDays);
  values.maxPlayers = Number(values.maxPlayers);

  button.disabled = true;
  button.textContent = "Creating membership…";

  try {
    const result = await api("addMember", values);

    notice(
      `${result.message} Member ID: ${result.memberId}` +
      (
        result.emailStatus &&
        result.emailStatus !== "Sent"
          ? ` (Email status: ${result.emailStatus})`
          : ""
      )
    );

    form.reset();

    form.elements.planName.value = "PS5 Membership";
    form.elements.pricePaid.value = "1299";
    form.elements.totalHours.value = "10";
    form.elements.validityDays.value = "30";
    form.elements.maxPlayers.value = "2";

    await refresh();

    $("memberSelect").value = result.memberId;

    updateMemberCard();

  } catch (e) {
    notice(e.message, true);

  } finally {
    button.disabled = false;
    button.textContent = "＋ Create membership";
  }
});

// ================================
// CREATE MEMBERSHIP BOOKING
// ================================

$("bookingForm").addEventListener("submit", async event => {
  event.preventDefault();

  hideNotice();

  const form = event.currentTarget;

  const button = form.querySelector(
    'button[type="submit"]'
  );

  const values = Object.fromEntries(
    new FormData(form).entries()
  );

  values.durationMinutes = Number(
    values.durationMinutes
  );

  values.players = Number(values.players);

  // Validate duration: minimum 30 minutes,
  // in multiples of 30 minutes.
  if (
    !Number.isInteger(values.durationMinutes) ||
    values.durationMinutes < 30 ||
    values.durationMinutes % 30 !== 0
  ) {
    notice(
      "Booking duration must be in 30-minute intervals.",
      true
    );

    return;
  }

  button.disabled = true;
  button.textContent = "Confirming booking…";

  try {
    const result = await api(
      "createMembershipBooking",
      values
    );

    notice(
      `${result.message} ` +
      `Booking ID: ${result.bookingId}. ` +
      `Remaining: ${formatHours(result.remainingHours)}. ` +
      `Used today after booking: ` +
      `${formatHours(result.hoursUsedTodayAfter)}.`
    );

    await refresh();

  } catch (e) {
    notice(e.message, true);

  } finally {
    button.disabled = false;
    button.textContent =
      "Confirm booking & email member";
  }
});

// ================================
// EVENT LISTENERS
// ================================

$("refreshBtn").addEventListener("click", refresh);

$("searchMembers").addEventListener(
  "input",
  renderMembers
);

$("memberSelect").addEventListener(
  "change",
  updateMemberCard
);

$("bookingForm").durationMinutes.addEventListener(
  "change",
  updateSummary
);

$("bookingForm").startTime.addEventListener(
  "input",
  updateSummary
);

// ================================
// PREVENT PAST BOOKING DATES
// ================================

const localToday = new Date(
  Date.now() - new Date().getTimezoneOffset() * 60000
).toISOString().slice(0, 10);

$("bookingDate").min = localToday;
$("bookingDate").value = localToday;

// ================================
// INITIALIZE PAGE
// ================================

updateSummary();
refresh();  