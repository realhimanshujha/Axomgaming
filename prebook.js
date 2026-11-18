const API_URL = "https://script.google.com/macros/s/AKfycbzhYFcW9RB7zFKMsn0CURttmL-t3j3Uk8PFTyx-FKUBA8mQKXVu0Yb5R4RDsZcGh6Gy4g/exec";

const $ = id => document.getElementById(id);

const token =
    localStorage.getItem("axomToken") ||
    sessionStorage.getItem("axomToken") ||
    "";


// API CONNECTION
async function api(data) {
    if (!token) {
        throw Error("No active login session. Log in from the dashboard first.");
    }

    const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ ...data, token })
    });

    if (!response.ok) {
        throw Error("Unable to connect to the server.");
    }

    const result = await response.json();

    if (!result.success) {
        throw Error(result.message || "Request failed.");
    }

    return result;
}


// NOTIFICATIONS
function notice(message, error = false) {
    $("notice").textContent = message;
    $("notice").classList.remove("hidden", "error");

    if (error) {
        $("notice").classList.add("error");
    }

    scrollTo({ top: 0, behavior: "smooth" });
}


// DURATION
function mins() {
    return $("durationPreset").value === "custom"
        ? Number($("customDuration").value)
        : Number($("durationPreset").value);
}


// CONVERT 12-HOUR TIME TO 24-HOUR TIME
function syncStartTime() {
    const hour = Number($("startHour").value);
    const minute = Number($("startMinute").value);
    const period = $("startPeriod").value;

    let hour24 = hour % 12;

    if (period === "PM") {
        hour24 += 12;
    }

    $("startTime").value =
        String(hour24).padStart(2, "0") +
        ":" +
        String(minute).padStart(2, "0");
}


// DISPLAY TIME IN AM/PM FORMAT
function displayTime(value) {
    const [h, m] = value.split(":").map(Number);

    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;

    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}


// BOOKING PREVIEW
function preview() {
    syncStartTime();

    const date = $("bookingDate").value;
    const time = $("startTime").value;
    const duration = mins();

    if (
        !date ||
        !time ||
        !Number.isInteger(duration) ||
        duration < 15 ||
        duration % 15
    ) {
        $("bookingPreview").textContent =
            "Choose a valid date, start time and duration.";

        return;
    }

    const [hours, minutes] = time.split(":").map(Number);

    const end = hours * 60 + minutes + duration;

    if (end > 1320) {
        $("bookingPreview").textContent =
            "Booking must end by 10:00 PM.";

        return;
    }

    const endTime =
        String(Math.floor(end / 60)).padStart(2, "0") +
        ":" +
        String(end % 60).padStart(2, "0");

    $("bookingPreview").textContent =
        `Reservation: ${date} · ${displayTime(time)} to ${displayTime(endTime)} · ${duration} minutes`;
}


// HTML SECURITY
function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}


// FORMAT DATE
function formatBookingDate(value) {
    const raw = String(value || "").trim();

    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
        return raw || "Date not available";
    }

    const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
    );

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}


// FORMAT TIME
function formatBookingTime(value) {

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    }

    const raw = String(value || "").trim();

    const match = raw.match(
        /(?:T|\s|^)(\d{1,2}):(\d{2})(?::\d{2})?/
    );

    if (!match) {
        return raw || "Time not available";
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours > 23 || minutes > 59) {
        return raw;
    }

    const period = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}


// FORMAT DURATION
function formatDuration(value) {
    const total = Number(value);

    if (!Number.isFinite(total) || total <= 0) {
        return "Duration not available";
    }

    const hours = Math.floor(total / 60);
    const minutes = total % 60;

    if (hours && minutes) {
        return `${hours} hr ${minutes} min`;
    }

    if (hours) {
        return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    }

    return `${minutes} min`;
}


// BOOKING CARD
function card(x) {

    const paymentClass =
        x.paymentStatus === "Not Paid"
            ? "unpaid"
            : x.paymentStatus === "Advance Received"
                ? "advance"
                : "";

    const start = formatBookingTime(x.startTime);
    const end = formatBookingTime(x.endTime);
    const date = formatBookingDate(x.bookingDate);

    return `
        <article class="booking">

            <div class="booking-customer">
                <h3>${esc(x.customerName)}</h3>
                <p>${esc(x.phone)}</p>
                <p class="booking-id">${esc(x.bookingId)}</p>
            </div>

            <div class="booking-schedule">

                <b>${esc(x.consoleType)}</b>

                <p>📅 ${esc(date)}</p>

                <p>🕒 ${esc(start)} – ${esc(end)}</p>

                <p>⏱ ${esc(formatDuration(x.durationMinutes))}</p>

            </div>

            <div class="booking-payment">

                <strong class="booking-price">
                    ₹${Number(x.price || 0).toLocaleString("en-IN")}
                </strong>

                <p>${esc(x.paymentMethod || "Payment method not set")}</p>

                <span class="status ${paymentClass}">
                    ${esc(x.paymentStatus || "Payment status not set")}
                </span>

            </div>

            <div class="booking-state">
                <span class="status">
                    ${esc(x.status || "Booked")}
                </span>
            </div>

        </article>
    `;
}


// LOAD BOOKINGS
async function load() {

    try {

        $("upcomingList").textContent = "Loading…";
        $("pastList").textContent = "Loading…";

        const data = await api({
            action: "prebookList"
        });

        $("upcomingCount").textContent = data.upcoming.length;
        $("pastCount").textContent = data.past.length;

        $("upcomingList").innerHTML =
            data.upcoming.length
                ? data.upcoming.map(card).join("")
                : '<div class="empty">No upcoming pre-bookings.</div>';

        $("pastList").innerHTML =
            data.past.length
                ? data.past.map(card).join("")
                : '<div class="empty">No past pre-bookings.</div>';

    } catch (error) {

        $("upcomingList").innerHTML =
            '<div class="empty">Could not load bookings.</div>';

        $("pastList").innerHTML =
            '<div class="empty">Could not load history.</div>';

        notice(error.message, true);
    }
}


// DURATION SELECTOR
$("durationPreset").onchange = () => {

    $("customDurationWrap").classList.toggle(
        "hidden",
        $("durationPreset").value !== "custom"
    );

    preview();
};


// DATE AND TIME PREVIEW
["bookingDate", "customDuration"].forEach(id => {
    $(id).addEventListener("input", preview);
});

["startHour", "startMinute", "startPeriod"].forEach(id => {
    $(id).addEventListener("change", preview);
});


// PAYMENT CHECKBOXES
$("advanceReceived").onchange = () => {
    if ($("advanceReceived").checked) {
        $("notPaid").checked = false;
    }
};

$("notPaid").onchange = () => {
    if ($("notPaid").checked) {
        $("advanceReceived").checked = false;
    }
};


// REFRESH BUTTON
$("refreshBtn").onclick = load;


// CREATE PRE-BOOKING
$("prebookForm").onsubmit = async event => {

    event.preventDefault();

    syncStartTime();

    const duration = mins();

    if (
        !Number.isInteger(duration) ||
        duration < 15 ||
        duration % 15
    ) {

        notice(
            "Duration must be at least 15 minutes in 15-minute intervals.",
            true
        );

        return;
    }

    const button = $("saveBtn");

    button.disabled = true;
    button.textContent = "SAVING…";

    try {

        const result = await api({

            action: "prebookCreate",

            customerName: $("customerName").value.trim(),

            phone: $("phone").value.trim(),

            consoleType: $("consoleType").value,

            price: Number($("price").value),

            bookingDate: $("bookingDate").value,

            startTime: $("startTime").value,

            durationMinutes: duration,

            paymentMethod: $("paymentMethod").value,

            paymentStatus:
                $("notPaid").checked
                    ? "Not Paid"
                    : $("advanceReceived").checked
                        ? "Advance Received"
                        : "Paid in Full"

        });


        // RESET FORM
        $("prebookForm").reset();

        $("durationPreset").value = "60";

        $("startHour").value = "10";
        $("startMinute").value = "00";
        $("startPeriod").value = "AM";

        syncStartTime();

        $("customDurationWrap").classList.add("hidden");

        $("bookingDate").value = new Date().toLocaleDateString("en-CA");

        $("bookingDate").min = $("bookingDate").value;

        preview();

        notice("Pre-booking saved. ID: " + result.bookingId);

        await load();

    } catch (error) {

        notice(error.message, true);

    } finally {

        button.disabled = false;

        button.textContent = "＋ Create pre-booking";
    }
};


// INITIALIZE PAGE
const today = new Date().toLocaleDateString("en-CA");

$("bookingDate").min = today;

$("bookingDate").value = today;

syncStartTime();

preview();

load();