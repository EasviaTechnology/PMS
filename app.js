/* StayDesk Demo PMS — app logic. Static, localStorage only. */
(function () {
"use strict";
const KEY = "staydesk-demo-v1";
let state = null;
let fdFilter = "All";
let fdQuery = "";
let roomStatusFilter = "All";
let roomTypeFilter = "All";
let hkStaffFilter = "All";
let guestQuery = "";
let currentView = "dashboard";

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function fmtDate(s) {
  if (!s) return "—";
  const parts = s.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtMoney(n) { return "$" + Number(n || 0).toFixed(2); }
function nightsBetween(a, b) {
  const d1 = new Date(a + "T00:00:00"); const d2 = new Date(b + "T00:00:00");
  return Math.max(0, Math.round((d2 - d1) / 86400000));
}
function folioFor(r) {
  const nights = nightsBetween(r.checkIn, r.checkOut);
  const roomCharges = r.rate * nights;
  const incidentals = (r.charges || []).reduce(function (s, c) { return s + Number(c.amount || 0); }, 0);
  const subtotal = roomCharges + incidentals;
  const tax = subtotal * (state.settings.taxRate / 100);
  const total = subtotal + tax;
  const paid = (r.payments || []).reduce(function (s, p) { return s + Number(p.amount || 0); }, 0);
  return { nights: nights, roomCharges: roomCharges, incidentals: incidentals, subtotal: subtotal, tax: tax, total: total, paid: paid, balance: total - paid };
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const parsed = JSON.parse(raw); if (parsed && parsed.reservations && parsed.rooms) return parsed; }
  } catch (e) { /* fall through to seed */ }
  return null;
}
function seed() { state = window.StayDeskSeed.buildSeed(); save(); }
function logActivity(text) {
  const now = new Date();
  const stamp = todayStr() + " " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  state.activity.unshift({ time: stamp, text: text });
  state.activity = state.activity.slice(0, 30);
}
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("show");
  setTimeout(function () { el.classList.remove("show"); }, 2600);
}
function statusClass(s) { return "badge " + String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function roomStatusLabel(s) {
  const map = { "vacant-clean": "Vacant Clean", "vacant-dirty": "Vacant Dirty", "occupied-clean": "Occupied Clean", "occupied-dirty": "Occupied Dirty", "out-of-order": "Out of Order" };
  return map[s] || s;
}
function findRoom(num) { return state.rooms.find(function (r) { return r.number === String(num); }); }
function findRes(id) { return state.reservations.find(function (r) { return r.id === id; }); }
function findTask(id) { return state.tasks.find(function (t) { return t.id === id; }); }
function newId(prefix) { return prefix + Math.random().toString(36).slice(2, 8); }
function newConf() {
  let n = 1019;
  state.reservations.forEach(function (r) { const m = /^SD-(\d+)$/.exec(r.conf || ""); if (m) n = Math.max(n, Number(m[1]) + 1); });
  return "SD-" + n;
}

/* ---------- Navigation ---------- */
function showView(name) {
  currentView = name;
  document.querySelectorAll(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + name); });
  document.querySelectorAll(".nav-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.view === name); });
  document.getElementById("sidebar").classList.remove("open");
  renderAll();
  window.scrollTo(0, 0);
}
function openDrawer(title, html) {
  document.getElementById("drawerTitle").textContent = title;
  document.getElementById("drawerContent").innerHTML = html;
  document.getElementById("drawer").classList.add("open");
  document.getElementById("drawerOverlay").classList.add("open");
}
function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawerOverlay").classList.remove("open");
}
function openModal(title, html) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalContent").innerHTML = html;
  document.getElementById("modal").classList.add("open");
  document.getElementById("modalOverlay").classList.add("open");
}
function closeModal() {
  document.getElementById("modal").classList.remove("open");
  document.getElementById("modalOverlay").classList.remove("open");
}

/* ---------- Render: Dashboard ---------- */
function renderDashboard() {
  const today = todayStr();
  const arrivals = state.reservations.filter(function (r) { return r.checkIn === today && (r.status === "Reserved" || r.status === "Checked In"); });
  const departures = state.reservations.filter(function (r) { return r.checkOut === today && r.status === "Checked In"; });
  const occupied = state.rooms.filter(function (r) { return r.status.indexOf("occupied") === 0; }).length;
  const total = state.rooms.length;
  const occ = total ? Math.round((occupied / total) * 100) : 0;
  const needClean = state.rooms.filter(function (r) { return r.status === "vacant-dirty" || r.status === "occupied-dirty"; }).length;
  let revenue = 0;
  state.reservations.forEach(function (r) {
    if (r.status === "Checked In" || r.status === "Checked Out") {
      const f = folioFor(r);
      // Revenue today: room charges prorated for tonight + incidentals dated today
      const activeToday = r.checkIn <= today && today < r.checkOut;
      const checkoutToday = r.status === "Checked Out" && r.checkOut === today;
      if (activeToday || checkoutToday) {
        revenue += r.rate + (r.charges || []).filter(function (c) { return c.date === today; }).reduce(function (s, c) { return s + Number(c.amount || 0); }, 0);
      }
    }
  });
  document.getElementById("dashSubtitle").textContent = "Today snapshot — " + fmtDate(today) + " · " + esc(state.settings.propertyName);
  document.getElementById("dashStats").innerHTML =
    '<div class="card"><div class="stat-label">Arrivals</div><div class="stat-value">' + arrivals.length + '</div><div class="stat-sub">Expected today</div></div>' +
    '<div class="card"><div class="stat-label">Departures</div><div class="stat-value">' + departures.length + '</div><div class="stat-sub">Due out today</div></div>' +
    '<div class="card"><div class="stat-label">Occupancy</div><div class="stat-value">' + occ + '%</div><div class="stat-sub">' + occupied + ' / ' + total + ' rooms occupied</div></div>' +
    '<div class="card"><div class="stat-label">Rooms needing cleaning</div><div class="stat-value">' + needClean + '</div><div class="stat-sub">Vacant + occupied dirty</div></div>' +
    '<div class="card"><div class="stat-label">Today\'s revenue</div><div class="stat-value">' + fmtMoney(revenue) + '</div><div class="stat-sub">Room nights + today incidentals</div></div>';
  document.getElementById("activityFeed").innerHTML = state.activity.slice(0, 8).map(function (a) {
    return "<li><time>" + esc(a.time) + "</time><span>" + esc(a.text) + "</span></li>";
  }).join("") || "<li>No activity yet.</li>";
}

/* ---------- Render: Front Desk ---------- */
function filteredReservations() {
  const today = todayStr();
  const q = fdQuery.trim().toLowerCase();
  return state.reservations.filter(function (r) {
    if (fdFilter === "Arriving Today" && !(r.checkIn === today && r.status === "Reserved")) return false;
    if (fdFilter === "In-House" && r.status !== "Checked In") return false;
    if (fdFilter === "Departing Today" && !(r.checkOut === today && r.status === "Checked In")) return false;
    if (fdFilter === "Reserved" && r.status !== "Reserved") return false;
    if (q) {
      const hay = (r.guest + " " + r.conf + " " + (r.room || "") + " " + r.phone).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}
function renderFrontDesk() {
  const filters = ["All", "Arriving Today", "In-House", "Departing Today", "Reserved"];
  document.getElementById("fdFilters").innerHTML = filters.map(function (f) {
    return '<button class="chip' + (fdFilter === f ? " active" : "") + '" data-fd-filter="' + esc(f) + '">' + esc(f) + "</button>";
  }).join("");
  const list = filteredReservations();
  document.getElementById("fdRows").innerHTML = list.map(function (r) {
    const f = folioFor(r);
    return '<tr class="clickable" data-open-res="' + r.id + '"><td><strong>' + esc(r.conf) + '</strong></td><td>' + esc(r.guest) + '<br><span class="muted small">' + esc(r.phone) + "</span></td><td>" + fmtDate(r.checkIn) + " → " + fmtDate(r.checkOut) + "<br><span class=\"muted small\">" + f.nights + " night(s)</span></td><td>" + esc(r.room || "Unassigned") + "</td><td>" + esc(r.roomType) + "</td><td><span class=\"" + statusClass(r.status) + "\">" + esc(r.status) + "</span></td><td>" + fmtMoney(f.balance) + "</td></tr>";
  }).join("");
  document.getElementById("fdEmpty").style.display = list.length ? "none" : "block";
}

/* ---------- Render: Rooms ---------- */
function renderRooms() {
  const occupied = state.rooms.filter(function (r) { return r.status.indexOf("occupied") === 0; }).length;
  const total = state.rooms.length;
  const occ = total ? Math.round((occupied / total) * 100) : 0;
  document.getElementById("roomsSubtitle").textContent = occupied + " of " + total + " rooms occupied (" + occ + "%)";
  document.getElementById("occSummary").innerHTML = "<strong>Occupancy " + occ + "%</strong> — " + occupied + " occupied / " + (total - occupied) + " vacant";
  document.getElementById("occFill").style.width = occ + "%";
  const statuses = ["All", "Vacant Clean", "Vacant Dirty", "Occupied Clean", "Occupied Dirty", "Out of Order"];
  document.getElementById("roomStatusFilters").innerHTML = statuses.map(function (s) {
    return '<button class="chip' + (roomStatusFilter === s ? " active" : "") + '" data-room-status="' + esc(s) + '">' + esc(s) + "</button>";
  }).join("");
  const types = ["All", "King", "Double Queen", "Suite"];
  document.getElementById("roomTypeFilters").innerHTML = types.map(function (t) {
    return '<button class="chip' + (roomTypeFilter === t ? " active" : "") + '" data-room-type="' + esc(t) + '">' + esc(t) + "</button>";
  }).join("");
  const list = state.rooms.filter(function (r) {
    if (roomStatusFilter !== "All" && roomStatusLabel(r.status) !== roomStatusFilter) return false;
    if (roomTypeFilter !== "All" && r.type !== roomTypeFilter) return false;
    return true;
  });
  document.getElementById("roomsGrid").innerHTML = list.map(function (r) {
    const occRes = state.reservations.find(function (x) { return x.room === r.number && x.status === "Checked In"; });
    return '<button class="room-card" data-open-room="' + esc(r.number) + '" aria-label="Open room ' + esc(r.number) + '"><div class="room-num">Room ' + esc(r.number) + '</div><div class="room-meta">' + esc(r.type) + " · " + fmtMoney(state.settings.rates[r.type] || 0) + "/night</div><span class=\"" + statusClass(roomStatusLabel(r.status)) + "\">" + esc(roomStatusLabel(r.status)) + "</span><div class=\"small mt\">" + (occRes ? "Guest: " + esc(occRes.guest) : "No guest") + "</div></button>";
  }).join("") || '<div class="empty">No rooms match these filters.</div>';
}

/* ---------- Render: Housekeeping ---------- */
function renderHousekeeping() {
  const done = state.tasks.filter(function (t) { return t.status === "Done"; }).length;
  const total = state.tasks.length;
  document.getElementById("hkSubtitle").textContent = done + " of " + total + " tasks done · filter: " + hkStaffFilter;
  const groups = ["To Clean", "In Progress", "Inspected", "Done"];
  document.getElementById("hkGroups").innerHTML = groups.map(function (g) {
    const items = state.tasks.filter(function (t) { return t.status === g && (hkStaffFilter === "All" || t.staff === hkStaffFilter); });
    const cards = items.map(function (t) {
      let actions = "";
      if (g === "To Clean") actions += '<button class="btn small" data-hk-action="start" data-id="' + t.id + '">Start</button>';
      if (g === "To Clean" || g === "In Progress") actions += '<button class="btn small primary" data-hk-action="clean" data-id="' + t.id + '">Mark Clean</button>';
      if (g === "In Progress") actions += '<button class="btn small" data-hk-action="inspect" data-id="' + t.id + '">Mark Inspected</button>';
      if (g === "Inspected") actions += '<button class="btn small primary" data-hk-action="done" data-id="' + t.id + '">Mark Done</button>';
      actions += '<button class="btn small" data-hk-action="issue" data-id="' + t.id + '">Report Issue</button>';
      return '<div class="hk-card"><h4>Room ' + esc(t.room) + " · " + esc(t.type) + '</h4><p><span class="' + statusClass(t.priority) + '">' + esc(t.priority) + '</span> ' + (t.issue ? '<span class="badge cancelled">Issue flagged</span>' : "") + "</p><p>Assigned: " + esc(t.staff) + '</p><p>Notes: ' + esc(t.notes || "—") + '</p><div><label class="small">Assign staff: <select data-hk-staff="' + t.id + '"><option' + (t.staff === "Alex" ? " selected" : "") + ">Alex</option><option" + (t.staff === "Maria" ? " selected" : "") + ">Maria</option><option" + (t.staff === "Jordan" ? " selected" : "") + '>Jordan</option></select></label></div><div class="row-actions">' + actions + "</div></div>";
    }).join("") || '<p class="muted small">No tasks in this group.</p>';
    return '<div><h3>' + g + " (" + items.length + ")</h3>" + cards + "</div>";
  }).join("");
}

/* ---------- Render: Billing ---------- */
function renderBilling() {
  const list = state.reservations.filter(function (r) { return r.status === "Checked In" || r.status === "Checked Out"; });
  document.getElementById("billingRows").innerHTML = list.map(function (r) {
    const f = folioFor(r);
    return '<tr class="clickable" data-open-folio="' + r.id + '"><td><strong>' + esc(r.conf) + "</strong></td><td>" + esc(r.guest) + "</td><td>" + esc(r.room || "—") + "</td><td><span class=\"" + statusClass(r.status) + "\">" + esc(r.status) + "</span></td><td>" + fmtMoney(f.total) + "</td><td>" + fmtMoney(f.paid) + "</td><td><strong>" + fmtMoney(f.balance) + "</strong></td></tr>";
  }).join("");
  document.getElementById("billingEmpty").style.display = list.length ? "none" : "block";
}

/* ---------- Render: Guests ---------- */
function guestDirectory() {
  const map = {};
  state.reservations.forEach(function (r) {
    const key = (r.guest + "|" + r.phone).toLowerCase();
    if (!map[key]) map[key] = { guest: r.guest, phone: r.phone, email: r.email, stays: [], notes: "", totalSpent: 0 };
    map[key].stays.push(r);
    const f = folioFor(r);
    if (r.status === "Checked In" || r.status === "Checked Out") map[key].totalSpent += f.total;
    if (r.notes && !map[key].notes) map[key].notes = r.notes;
  });
  // Persisted guest notes live on the first reservation's guestNote field
  Object.keys(map).forEach(function (k) {
    const first = map[k].stays[0];
    if (first.guestNote) map[k].notes = first.guestNote;
  });
  return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.guest.localeCompare(b.guest); });
}
function renderGuests() {
  const q = guestQuery.trim().toLowerCase();
  const list = guestDirectory().filter(function (g) {
    if (!q) return true;
    return (g.guest + " " + g.phone + " " + g.email).toLowerCase().indexOf(q) !== -1;
  });
  document.getElementById("guestRows").innerHTML = list.map(function (g) {
    return '<tr class="clickable" data-open-guest="' + esc(g.guest + "|" + g.phone) + '"><td><strong>' + esc(g.guest) + "</strong></td><td>" + esc(g.phone) + "</td><td>" + esc(g.email) + "</td><td>" + g.stays.length + "</td><td>" + fmtMoney(g.totalSpent) + "</td><td>" + esc(g.notes || "—") + "</td></tr>";
  }).join("");
  document.getElementById("guestEmpty").style.display = list.length ? "none" : "block";
}

/* ---------- Render: Reports ---------- */
function renderReports() {
  const today = todayStr();
  let occHtml = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const ds = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const occupiedCount = state.reservations.filter(function (r) {
      return (r.status === "Checked In" || r.status === "Reserved") && r.checkIn <= ds && ds < r.checkOut;
    }).length;
    const pct = state.rooms.length ? Math.round((occupiedCount / state.rooms.length) * 100) : 0;
    occHtml += '<div class="bar-row"><span class="lbl">' + fmtDate(ds) + '</span><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div><span>' + occupiedCount + " rooms · " + pct + "%</span></div>";
  }
  document.getElementById("occReport").innerHTML = occHtml;
  const tm = new Date(); tm.setDate(tm.getDate() + 1);
  const tmStr = tm.getFullYear() + "-" + String(tm.getMonth() + 1).padStart(2, "0") + "-" + String(tm.getDate()).padStart(2, "0");
  const arrT = state.reservations.filter(function (r) { return r.checkIn === today && r.status !== "Cancelled" && r.status !== "No-Show"; }).length;
  const depT = state.reservations.filter(function (r) { return r.checkOut === today && r.status === "Checked In"; }).length;
  const arrM = state.reservations.filter(function (r) { return r.checkIn === tmStr && r.status !== "Cancelled" && r.status !== "No-Show"; }).length;
  const depM = state.reservations.filter(function (r) { return r.checkOut === tmStr; }).length;
  document.getElementById("arrDepReport").innerHTML =
    "<table><thead><tr><th>Day</th><th>Arrivals</th><th>Departures</th></tr></thead><tbody>" +
    "<tr><td>Today (" + fmtDate(today) + ")</td><td>" + arrT + "</td><td>" + depT + "</td></tr>" +
    "<tr><td>Tomorrow (" + fmtDate(tmStr) + ")</td><td>" + arrM + "</td><td>" + depM + "</td></tr></tbody></table>";
  const done = state.tasks.filter(function (t) { return t.status === "Done"; }).length;
  const total = state.tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("hkReport").innerHTML = "<p><strong>" + pct + "% complete</strong> — " + done + " of " + total + " tasks done.</p><div class=\"bar-track\"><div class=\"bar-fill\" style=\"width:" + pct + "%\"></div></div>";
  let todayRev = 0, weekRev = 0;
  state.reservations.forEach(function (r) {
    if (r.status !== "Checked In" && r.status !== "Checked Out") return;
    const f = folioFor(r);
    const activeToday = r.checkIn <= today && today < r.checkOut;
    if (activeToday) todayRev += r.rate;
    // This week: folio totals for stays overlapping this week (simple demo definition)
    weekRev += f.total;
  });
  // Week revenue defined as total of all active folio totals in the demo set
  document.getElementById("revReport").innerHTML =
    '<div class="folio-line"><span>Today (room nights active)</span><strong>' + fmtMoney(todayRev) + "</strong></div>" +
    '<div class="folio-line"><span>All open + closed folios (demo total)</span><strong>' + fmtMoney(weekRev) + "</strong></div>" +
    '<p class="muted small">Revenue is computed from folios and payments in the current demo data. Tax ' + state.settings.taxRate + "% applied on folios.</p>";
}

/* ---------- Render: Settings ---------- */
function renderSettings() {
  document.getElementById("setProperty").value = state.settings.propertyName;
  document.getElementById("setTax").value = state.settings.taxRate;
  document.getElementById("setKing").value = state.settings.rates.King;
  document.getElementById("setDQ").value = state.settings.rates["Double Queen"];
  document.getElementById("setSuite").value = state.settings.rates.Suite;
  document.getElementById("propertyLabel").textContent = state.settings.propertyName;
}
function renderAll() {
  document.getElementById("propertyLabel").textContent = state.settings.propertyName;
  document.getElementById("todayLabel").textContent = fmtDate(todayStr());
  renderDashboard(); renderFrontDesk(); renderRooms(); renderHousekeeping(); renderBilling(); renderGuests(); renderReports(); renderSettings();
}

/* ---------- Reservation detail ---------- */
function openReservation(id) {
  const r = findRes(id); if (!r) return;
  const f = folioFor(r);
  const canCheckIn = r.status === "Reserved";
  const canCheckOut = r.status === "Checked In";
  const canModify = r.status === "Reserved" || r.status === "Checked In";
  const canCancel = r.status === "Reserved" || r.status === "Checked In";
  const canNoShow = r.status === "Reserved";
  openDrawer("Reservation " + r.conf, '' +
    '<p><span class="' + statusClass(r.status) + '">' + esc(r.status) + "</span></p>" +
    '<dl class="kv"><dt>Guest</dt><dd>' + esc(r.guest) + "</dd><dt>Contact</dt><dd>" + esc(r.phone) + "<br>" + esc(r.email) + "</dd>" +
    '<dt>Confirmation</dt><dd>' + esc(r.conf) + "</dd>" +
    '<dt>Dates</dt><dd>' + fmtDate(r.checkIn) + " → " + fmtDate(r.checkOut) + " · " + f.nights + " night(s)</dd>" +
    '<dt>Room type</dt><dd>' + esc(r.roomType) + "</dd>" +
    '<dt>Assigned room</dt><dd>' + esc(r.room || "Unassigned") + "</dd>" +
    '<dt>Rate / night</dt><dd>' + fmtMoney(r.rate) + "</dd>" +
    '<dt>Guests</dt><dd>' + r.adults + " adult(s) · " + r.children + " child(ren)</dd>" +
    '<dt>Payment</dt><dd>' + esc(r.paymentMethod) + "</dd>" +
    '<dt>Balance</dt><dd>' + fmtMoney(f.balance) + " (Total " + fmtMoney(f.total) + " · Paid " + fmtMoney(f.paid) + ")</dd>" +
    '<dt>Notes</dt><dd>' + esc(r.notes || "—") + "</dd></dl>" +
    '<div class="row-actions">' +
    (canCheckIn ? '<button class="btn primary" data-res-action="checkin" data-id="' + r.id + '">Check-In</button>' : "") +
    (canCheckOut ? '<button class="btn primary" data-res-action="checkout" data-id="' + r.id + '">Check-Out</button>' : "") +
    (canModify ? '<button class="btn" data-res-action="modify" data-id="' + r.id + '">Modify</button>' : "") +
    (canCancel ? '<button class="btn danger" data-res-action="cancel" data-id="' + r.id + '">Cancel</button>' : "") +
    (canNoShow ? '<button class="btn" data-res-action="noshow" data-id="' + r.id + '">No-Show</button>' : "") +
    '<button class="btn" data-res-action="charge" data-id="' + r.id + '">Add Charge</button>' +
    '<button class="btn" data-res-action="folio" data-id="' + r.id + '">View Folio</button>' +
    "</div>");
}
function openFolio(id) {
  const r = findRes(id); if (!r) return;
  const f = folioFor(r);
  const chargesHtml = (r.charges || []).map(function (c) { return '<div class="folio-line"><span>' + esc(c.desc) + " · " + esc(c.date || "") + "</span><span>" + fmtMoney(c.amount) + "</span></div>"; }).join("") || '<p class="muted small">No incidentals.</p>';
  const payHtml = (r.payments || []).map(function (p) { return '<div class="folio-line"><span>' + esc(p.method) + " · " + esc(p.date || "") + "</span><span>" + fmtMoney(p.amount) + "</span></div>"; }).join("") || '<p class="muted small">No payments yet.</p>';
  openDrawer("Folio — " + r.conf + " · " + r.guest, '' +
    '<p class="muted small">' + esc(state.settings.propertyName) + " · DEMO invoice — not a real charge.</p>" +
    '<dl class="kv"><dt>Guest</dt><dd>' + esc(r.guest) + "</dd><dt>Room</dt><dd>" + esc(r.room || "Unassigned") + " · " + esc(r.roomType) + "</dd><dt>Stay</dt><dd>" + fmtDate(r.checkIn) + " → " + fmtDate(r.checkOut) + " · " + f.nights + " night(s)</dd><dt>Status</dt><dd>" + esc(r.status) + "</dd></dl>" +
    "<h3>Room charges</h3><div class=\"folio-line\"><span>" + f.nights + " night(s) × " + fmtMoney(r.rate) + "</span><span>" + fmtMoney(f.roomCharges) + "</span></div>" +
    "<h3>Incidentals</h3>" + chargesHtml +
    '<div class="folio-line"><span>Subtotal</span><span>' + fmtMoney(f.subtotal) + "</span></div>" +
    '<div class="folio-line"><span>Tax (' + state.settings.taxRate + "%)</span><span>" + fmtMoney(f.tax) + "</span></div>" +
    '<div class="folio-total"><span>Total</span><span>' + fmtMoney(f.total) + "</span></div>" +
    "<h3>Payments</h3>" + payHtml +
    '<div class="folio-total"><span>Balance due</span><span>' + fmtMoney(f.balance) + "</span></div>" +
    '<div class="row-actions">' +
    '<button class="btn" data-res-action="charge" data-id="' + r.id + '">Add Charge</button>' +
    '<button class="btn" data-res-action="payment" data-id="' + r.id + '">Add Payment</button>' +
    '<button class="btn" data-res-action="print" data-id="' + r.id + '">Print / Download Invoice</button>' +
    (r.status === "Checked In" ? '<button class="btn primary" data-res-action="settle" data-id="' + r.id + '">Check-Out &amp; Settle</button>' : "") +
    "</div>" +
    '<p class="muted small mt">Check-Out &amp; Settle requires a zero balance, or confirm settling with the remaining balance.</p>');
}
function printFolio(id) {
  const r = findRes(id); if (!r) return;
  const f = folioFor(r);
  const chargesHtml = (r.charges || []).map(function (c) { return "<tr><td>" + esc(c.desc) + "</td><td>" + fmtMoney(c.amount) + "</td></tr>"; }).join("") || "<tr><td>No incidentals</td><td>$0.00</td></tr>";
  document.getElementById("printArea").innerHTML =
    "<h1>StayDesk — Demo Invoice</h1><p>DEMO — sample data only, not connected to any real hotel system.</p>" +
    "<p><strong>" + esc(state.settings.propertyName) + "</strong><br>Guest: " + esc(r.guest) + "<br>Confirmation: " + esc(r.conf) + "<br>Room: " + esc(r.room || "Unassigned") + " · " + esc(r.roomType) + "<br>Stay: " + fmtDate(r.checkIn) + " → " + fmtDate(r.checkOut) + " (" + f.nights + " nights)</p>" +
    "<table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>" +
    "<tr><td>Room charges — " + f.nights + " × " + fmtMoney(r.rate) + "</td><td>" + fmtMoney(f.roomCharges) + "</td></tr>" + chargesHtml +
    "<tr><td>Tax (" + state.settings.taxRate + "%)</td><td>" + fmtMoney(f.tax) + "</td></tr>" +
    "<tr><td><strong>Total</strong></td><td><strong>" + fmtMoney(f.total) + "</strong></td></tr>" +
    "<tr><td>Paid</td><td>" + fmtMoney(f.paid) + "</td></tr>" +
    "<tr><td><strong>Balance due</strong></td><td><strong>" + fmtMoney(f.balance) + "</strong></td></tr></tbody></table>";
  window.print();
}

/* ---------- Room detail ---------- */
function openRoom(num) {
  const room = findRoom(num); if (!room) return;
  const occRes = state.reservations.find(function (x) { return x.room === String(num) && x.status === "Checked In"; });
  const resRes = state.reservations.find(function (x) { return x.room === String(num) && x.status === "Reserved"; });
  const task = state.tasks.find(function (t) { return t.room === String(num) && t.status !== "Done"; });
  openDrawer("Room " + room.number, '' +
    '<dl class="kv"><dt>Type</dt><dd>' + esc(room.type) + "</dd><dt>Rate</dt><dd>" + fmtMoney(state.settings.rates[room.type] || 0) + " / night</dd>" +
    '<dt>Status</dt><dd><span class="' + statusClass(roomStatusLabel(room.status)) + '">' + esc(roomStatusLabel(room.status)) + "</span></dd>" +
    '<dt>Current guest</dt><dd>' + (occRes ? esc(occRes.guest) + " (" + esc(occRes.conf) + ")" : "—") + "</dd>" +
    '<dt>Upcoming</dt><dd>' + (resRes ? esc(resRes.guest) + " (" + esc(resRes.conf) + ")" : "—") + "</dd>" +
    '<dt>Housekeeping</dt><dd>' + (task ? esc(task.status) + " · " + esc(task.staff) : "No open task") + "</dd></dl>" +
    '<div class="row-actions">' +
    '<button class="btn" data-room-action="clean" data-num="' + room.number + '">Mark Clean</button>' +
    '<button class="btn" data-room-action="dirty" data-num="' + room.number + '">Mark Dirty</button>' +
    (room.status === "out-of-order" ? '<button class="btn" data-room-action="back" data-num="' + room.number + '">Back in Service</button>' : '<button class="btn danger" data-room-action="ooo" data-num="' + room.number + '">Mark Out of Order</button>') +
    (occRes ? '<button class="btn" data-res-action="folio" data-id="' + occRes.id + '">View Folio</button>' : "") +
    (resRes ? '<button class="btn" data-res-action="open" data-id="' + resRes.id + '">View Reservation</button>' : "") +
    '<button class="btn" data-room-action="assign" data-num="' + room.number + '">Assign to Reservation</button>' +
    "</div>");
}

/* ---------- Guest detail ---------- */
function openGuest(key) {
  const parts = key.split("|");
  const name = parts[0]; const phone = parts[1];
  const stays = state.reservations.filter(function (r) { return r.guest === name && r.phone === phone; });
  if (!stays.length) return;
  const total = stays.reduce(function (s, r) { const f = folioFor(r); return s + ((r.status === "Checked In" || r.status === "Checked Out") ? f.total : 0); }, 0);
  const currentNote = stays[0].guestNote || stays[0].notes || "";
  openDrawer("Guest — " + name, '' +
    '<dl class="kv"><dt>Phone</dt><dd>' + esc(phone) + "</dd><dt>Email</dt><dd>" + esc(stays[0].email) + "</dd><dt>Stays</dt><dd>" + stays.length + "</dd><dt>Total spent</dt><dd>" + fmtMoney(total) + "</dd></dl>" +
    '<div class="field mt"><label for="guestNoteInput">Notes</label><textarea id="guestNoteInput" rows="3">' + esc(currentNote) + "</textarea></div>" +
    '<div class="row-actions"><button class="btn primary" data-guest-save="' + esc(key) + '">Save Notes</button></div>' +
    "<h3 class=\"mt\">Stay history</h3>" +
    stays.map(function (r) {
      const f = folioFor(r);
      return '<div class="hk-card"><strong>' + esc(r.conf) + '</strong> · ' + fmtDate(r.checkIn) + " → " + fmtDate(r.checkOut) + " · Room " + esc(r.room || "—") + "<br><span class=\"" + statusClass(r.status) + "\">" + esc(r.status) + "</span> · Total " + fmtMoney(f.total) + " · Balance " + fmtMoney(f.balance) + '<br><button class="btn small mt" data-res-action="open" data-id="' + r.id + '">Open Reservation</button></div>';
    }).join(""));
}

/* ---------- Forms ---------- */
function reservationFormHtml(existing) {
  const r = existing || { guest: "", phone: "", email: "", checkIn: todayStr(), checkOut: todayStr(), roomType: "King", room: "", rate: 129, adults: 2, children: 0, notes: "", paymentMethod: "Card ending 0000" };
  const rateVal = existing ? existing.rate : state.settings.rates[r.roomType];
  return '<div class="form-grid">' +
    '<div class="field"><label for="fGuest">Guest name *</label><input id="fGuest" type="text" value="' + esc(r.guest) + '" required></div>' +
    '<div class="field"><label for="fPhone">Phone</label><input id="fPhone" type="tel" value="' + esc(r.phone) + '"></div>' +
    '<div class="field"><label for="fEmail">Email</label><input id="fEmail" type="email" value="' + esc(r.email) + '"></div>' +
    '<div class="field"><label for="fType">Room type</label><select id="fType"><option' + (r.roomType === "King" ? " selected" : "") + '>King</option><option' + (r.roomType === "Double Queen" ? " selected" : "") + '>Double Queen</option><option' + (r.roomType === "Suite" ? " selected" : "") + '>Suite</option></select></div>' +
    '<div class="field"><label for="fIn">Check-in</label><input id="fIn" type="date" value="' + esc(r.checkIn) + '"></div>' +
    '<div class="field"><label for="fOut">Check-out</label><input id="fOut" type="date" value="' + esc(r.checkOut) + '"></div>' +
    '<div class="field"><label for="fAdults">Adults</label><input id="fAdults" type="number" min="1" value="' + r.adults + '"></div>' +
    '<div class="field"><label for="fChildren">Children</label><input id="fChildren" type="number" min="0" value="' + r.children + '"></div>' +
    '<div class="field"><label for="fRate">Rate / night ($)</label><input id="fRate" type="number" min="0" step="1" value="' + rateVal + '"></div>' +
    '<div class="field"><label for="fRoom">Assigned room (optional)</label><input id="fRoom" type="text" placeholder="e.g. 101" value="' + esc(r.room || "") + '"></div>' +
    '<div class="field full"><label for="fNotes">Notes</label><textarea id="fNotes" rows="2">' + esc(r.notes || "") + "</textarea></div>" +
    "</div><p class=\"muted small mt\">Rate auto-fills from the room type when the type changes. Confirmation codes use the SD-XXXX format.</p>" +
    '<div class="row-actions"><button class="btn primary" id="saveResBtn">' + (existing ? "Save Changes" : "Create Reservation") + '</button><button class="btn" id="cancelModalBtn">Cancel</button></div>';
}
function openNewReservation(isWalkIn) {
  openModal(isWalkIn ? "Walk-In — New Reservation" : "New Reservation", reservationFormHtml(null));
  wireReservationForm(null, isWalkIn);
}
function openModify(id) {
  const r = findRes(id); if (!r) return;
  openModal("Modify Reservation — " + r.conf, reservationFormHtml(r));
  wireReservationForm(r, false);
}
function wireReservationForm(existing, isWalkIn) {
  const typeSel = document.getElementById("fType");
  const rateInput = document.getElementById("fRate");
  if (typeSel && rateInput) {
    typeSel.addEventListener("change", function () { rateInput.value = state.settings.rates[typeSel.value] || 0; });
  }
  document.getElementById("saveResBtn").addEventListener("click", function () {
    const guest = document.getElementById("fGuest").value.trim();
    if (!guest) { toast("Guest name is required."); return; }
    const checkIn = document.getElementById("fIn").value;
    const checkOut = document.getElementById("fOut").value;
    if (!checkIn || !checkOut || checkOut <= checkIn) { toast("Check-out must be after check-in."); return; }
    if (existing) {
      existing.guest = guest;
      existing.phone = document.getElementById("fPhone").value.trim();
      existing.email = document.getElementById("fEmail").value.trim();
      existing.roomType = typeSel.value;
      existing.checkIn = checkIn; existing.checkOut = checkOut;
      existing.adults = Number(document.getElementById("fAdults").value || 1);
      existing.children = Number(document.getElementById("fChildren").value || 0);
      existing.rate = Number(rateInput.value || 0);
      existing.room = document.getElementById("fRoom").value.trim();
      existing.notes = document.getElementById("fNotes").value.trim();
      logActivity("Reservation modified — " + guest + " (" + existing.conf + ")");
      toast("Reservation updated.");
    } else {
      const rec = {
        id: newId("r"), conf: newConf(), guest: guest,
        phone: document.getElementById("fPhone").value.trim(),
        email: document.getElementById("fEmail").value.trim(),
        checkIn: checkIn, checkOut: checkOut,
        roomType: typeSel.value,
        room: document.getElementById("fRoom").value.trim(),
        rate: Number(rateInput.value || 0),
        adults: Number(document.getElementById("fAdults").value || 1),
        children: Number(document.getElementById("fChildren").value || 0),
        paymentMethod: "Card ending 0000", notes: document.getElementById("fNotes").value.trim(),
        status: isWalkIn ? "Checked In" : "Reserved", charges: [], payments: []
      };
      if (isWalkIn) {
        if (!rec.room) {
          const free = state.rooms.find(function (rm) { return rm.type === rec.roomType && rm.status === "vacant-clean"; });
          if (free) rec.room = free.number;
        }
        if (rec.room) { const rm = findRoom(rec.room); if (rm) rm.status = "occupied-clean"; }
      }
      state.reservations.unshift(rec);
      logActivity((isWalkIn ? "Walk-in checked in — " : "Reservation created — ") + guest + " (" + rec.conf + ")");
      toast("Reservation " + rec.conf + " created.");
    }
    save(); closeModal(); closeDrawer(); renderAll();
  });
  document.getElementById("cancelModalBtn").addEventListener("click", closeModal);
}
function openChargeForm(id) {
  const r = findRes(id); if (!r) return;
  openModal("Add Charge — " + r.conf, '' +
    '<div class="form-grid"><div class="field"><label for="cDesc">Description</label><input id="cDesc" type="text" placeholder="e.g. Minibar"></div>' +
    '<div class="field"><label for="cAmt">Amount ($)</label><input id="cAmt" type="number" min="0" step="0.01" value="0"></div></div>' +
    '<div class="row-actions mt"><button class="btn primary" id="saveChargeBtn">Add Charge</button><button class="btn" id="cancelModalBtn2">Cancel</button></div>');
  document.getElementById("saveChargeBtn").addEventListener("click", function () {
    const desc = document.getElementById("cDesc").value.trim() || "Incidental";
    const amt = Number(document.getElementById("cAmt").value || 0);
    if (amt <= 0) { toast("Enter an amount greater than 0."); return; }
    r.charges.push({ desc: desc, amount: amt, date: todayStr() });
    logActivity("Charge added — " + desc + " " + fmtMoney(amt) + " to " + r.guest + " (" + r.conf + ")");
    save(); closeModal(); renderAll(); openFolio(id); toast("Charge added.");
  });
  document.getElementById("cancelModalBtn2").addEventListener("click", closeModal);
}
function openPaymentForm(id) {
  const r = findRes(id); if (!r) return;
  openModal("Add Payment — " + r.conf, '' +
    '<div class="form-grid"><div class="field"><label for="pAmt">Amount ($)</label><input id="pAmt" type="number" min="0" step="0.01" value="0"></div>' +
    '<div class="field"><label for="pMethod">Method</label><select id="pMethod"><option>Card</option><option>Cash</option></select></div></div>' +
    '<div class="row-actions mt"><button class="btn primary" id="savePayBtn">Add Payment</button><button class="btn" id="cancelModalBtn3">Cancel</button></div>');
  document.getElementById("savePayBtn").addEventListener("click", function () {
    const amt = Number(document.getElementById("pAmt").value || 0);
    if (amt <= 0) { toast("Enter an amount greater than 0."); return; }
    const method = document.getElementById("pMethod").value;
    r.payments.push({ amount: amt, method: method, date: todayStr() });
    logActivity("Payment added — " + fmtMoney(amt) + " to " + r.guest + " (" + r.conf + ")");
    save(); closeModal(); renderAll(); openFolio(id); toast("Payment added.");
  });
  document.getElementById("cancelModalBtn3").addEventListener("click", closeModal);
}
function openIssueForm(taskId) {
  const t = findTask(taskId); if (!t) return;
  openModal("Report Issue — Room " + t.room, '' +
    '<div class="field"><label for="issueText">Issue notes</label><textarea id="issueText" rows="3" placeholder="Describe the issue…"></textarea></div>' +
    '<div class="row-actions mt"><button class="btn primary" id="saveIssueBtn">Flag Issue</button><button class="btn" id="cancelModalBtn4">Cancel</button></div>');
  document.getElementById("saveIssueBtn").addEventListener("click", function () {
    const text = document.getElementById("issueText").value.trim() || "Issue reported.";
    t.issue = true; t.notes = (t.notes ? t.notes + " | " : "") + "ISSUE: " + text;
    logActivity("Issue reported — Room " + t.room + ": " + text);
    save(); closeModal(); renderAll(); toast("Issue flagged on Room " + t.room + ".");
  });
  document.getElementById("cancelModalBtn4").addEventListener("click", closeModal);
}
function openNewTask() {
  openModal("New Housekeeping Task", '' +
    '<div class="form-grid"><div class="field"><label for="ntRoom">Room</label><input id="ntRoom" type="text" placeholder="e.g. 101"></div>' +
    '<div class="field"><label for="ntStaff">Assigned staff</label><select id="ntStaff"><option>Alex</option><option>Maria</option><option>Jordan</option></select></div>' +
    '<div class="field"><label for="ntPriority">Priority</label><select id="ntPriority"><option>Standard</option><option>Priority</option><option>VIP</option></select></div>' +
    '<div class="field full"><label for="ntNotes">Notes</label><textarea id="ntNotes" rows="2"></textarea></div></div>' +
    '<div class="row-actions mt"><button class="btn primary" id="saveTaskBtn">Create Task</button><button class="btn" id="cancelModalBtn5">Cancel</button></div>');
  document.getElementById("saveTaskBtn").addEventListener("click", function () {
    const roomNum = document.getElementById("ntRoom").value.trim();
    if (!roomNum || !findRoom(roomNum)) { toast("Enter a valid room number."); return; }
    const room = findRoom(roomNum);
    state.tasks.unshift({ id: newId("t"), room: roomNum, type: room.type, priority: document.getElementById("ntPriority").value, staff: document.getElementById("ntStaff").value, status: "To Clean", notes: document.getElementById("ntNotes").value.trim(), issue: false });
    logActivity("Housekeeping task created — Room " + roomNum);
    save(); closeModal(); renderAll(); toast("Task created.");
  });
  document.getElementById("cancelModalBtn5").addEventListener("click", closeModal);
}
function openAssignRoom(num) {
  const candidates = state.reservations.filter(function (r) { return r.status === "Reserved" && !r.room; });
  openModal("Assign Room " + num + " to Reservation", '' +
    '<div class="field"><label for="assignSel">Reservation (unassigned only)</label><select id="assignSel">' + (candidates.map(function (r) { return '<option value="' + r.id + '">' + esc(r.conf) + " · " + esc(r.guest) + " · " + esc(r.roomType) + "</option>"; }).join("") || "<option value=\"\">No unassigned reservations</option>") + "</select></div>" +
    '<div class="row-actions mt"><button class="btn primary" id="doAssignBtn">Assign</button><button class="btn" id="cancelModalBtn6">Cancel</button></div>');
  document.getElementById("doAssignBtn").addEventListener("click", function () {
    const id = document.getElementById("assignSel").value;
    if (!id) { toast("No unassigned reservation available."); return; }
    const r = findRes(id); r.room = String(num);
    logActivity("Room " + num + " assigned to " + r.guest + " (" + r.conf + ")");
    save(); closeModal(); closeDrawer(); renderAll(); toast("Room assigned.");
  });
  document.getElementById("cancelModalBtn6").addEventListener("click", closeModal);
}

/* ---------- Actions ---------- */
function doCheckIn(id) {
  const r = findRes(id); if (!r || r.status !== "Reserved") return;
  if (!r.room) {
    const free = state.rooms.find(function (rm) { return rm.type === r.roomType && rm.status === "vacant-clean"; });
    if (!free) { toast("No vacant-clean " + r.roomType + " room available."); return; }
    r.room = free.number;
  }
  const room = findRoom(r.room);
  if (room) room.status = "occupied-clean";
  r.status = "Checked In";
  logActivity("Check-in completed — " + r.guest + " (Room " + r.room + ")");
  save(); renderAll(); openReservation(id); toast("Checked in — Room " + r.room + ".");
}
function doCheckOut(id, settleWithBalance) {
  const r = findRes(id); if (!r || r.status !== "Checked In") return;
  const f = folioFor(r);
  if (f.balance > 0.01 && !settleWithBalance) {
    if (!window.confirm("Balance due is " + fmtMoney(f.balance) + ". Settle with remaining balance and check out anyway?")) return;
  }
  r.status = "Checked Out";
  if (r.room) {
    const room = findRoom(r.room);
    if (room) room.status = "vacant-dirty";
    const existing = state.tasks.find(function (t) { return t.room === String(r.room) && t.status !== "Done"; });
    if (!existing) state.tasks.unshift({ id: newId("t"), room: String(r.room), type: room ? room.type : r.roomType, priority: "Standard", staff: "Alex", status: "To Clean", notes: "Checkout clean.", issue: false });
  }
  logActivity("Check-out completed — " + r.guest + " (Room " + (r.room || "—") + ")");
  save(); renderAll(); closeDrawer(); toast("Checked out. Room marked dirty.");
}
function setRoomStatus(num, status) {
  const room = findRoom(num); if (!room) return;
  room.status = status;
  if (status === "vacant-clean" || status === "occupied-clean") {
    const t = state.tasks.find(function (x) { return x.room === String(num) && x.status !== "Done"; });
    if (t && status === "vacant-clean") t.status = "Done";
  }
  logActivity("Room " + num + " marked " + roomStatusLabel(status));
  save(); renderAll(); openRoom(num);
}
function hkAction(action, id) {
  const t = findTask(id); if (!t) return;
  const room = findRoom(t.room);
  if (action === "start") { t.status = "In Progress"; }
  if (action === "clean") {
    t.status = "Done";
    if (room) {
      if (room.status === "vacant-dirty") room.status = "vacant-clean";
      else if (room.status === "occupied-dirty") room.status = "occupied-clean";
    }
  }
  if (action === "inspect") { t.status = "Inspected"; }
  if (action === "done") {
    t.status = "Done";
    if (room && room.status === "vacant-dirty") room.status = "vacant-clean";
    if (room && room.status === "occupied-dirty") room.status = "occupied-clean";
  }
  if (action === "issue") { openIssueForm(id); return; }
  logActivity("Housekeeping — Room " + t.room + " → " + t.status);
  save(); renderAll(); toast("Room " + t.room + " → " + t.status + ".");
}

/* ---------- Global click handling ---------- */
document.addEventListener("click", function (e) {
  const nav = e.target.closest(".nav-btn");
  if (nav) { showView(nav.dataset.view); return; }
  const fdF = e.target.closest("[data-fd-filter]");
  if (fdF) { fdFilter = fdF.dataset.fdFilter; renderFrontDesk(); return; }
  const rsF = e.target.closest("[data-room-status]");
  if (rsF) { roomStatusFilter = rsF.dataset.roomStatus; renderRooms(); return; }
  const rtF = e.target.closest("[data-room-type]");
  if (rtF) { roomTypeFilter = rtF.dataset.roomType; renderRooms(); return; }
  const openRes = e.target.closest("[data-open-res]");
  if (openRes) { openReservation(openRes.dataset.openRes); return; }
  const openFolioEl = e.target.closest("[data-open-folio]");
  if (openFolioEl) { openFolio(openFolioEl.dataset.openFolio); return; }
  const openRoomEl = e.target.closest("[data-open-room]");
  if (openRoomEl) { openRoom(openRoomEl.dataset.openRoom); return; }
  const openGuestEl = e.target.closest("[data-open-guest]");
  if (openGuestEl) { openGuest(openGuestEl.dataset.openGuest); return; }
  const resAct = e.target.closest("[data-res-action]");
  if (resAct) {
    const act = resAct.dataset.resAction; const id = resAct.dataset.id;
    if (act === "open") { openReservation(id); return; }
    if (act === "checkin") { doCheckIn(id); return; }
    if (act === "checkout" || act === "settle") { doCheckOut(id, false); return; }
    if (act === "modify") { openModify(id); return; }
    if (act === "cancel") {
      const r = findRes(id);
      if (window.confirm("Cancel reservation " + r.conf + " for " + r.guest + "?")) {
        if (r.room && r.status === "Reserved") { const rm = findRoom(r.room); if (rm && rm.status.indexOf("occupied") !== 0) rm.status = "vacant-clean"; }
        r.status = "Cancelled"; r.room = "";
        logActivity("Reservation cancelled — " + r.guest + " (" + r.conf + ")");
        save(); renderAll(); closeDrawer(); toast("Reservation cancelled.");
      }
      return;
    }
    if (act === "noshow") {
      const r = findRes(id);
      if (window.confirm("Mark " + r.guest + " (" + r.conf + ") as No-Show?")) {
        if (r.room) { const rm = findRoom(r.room); if (rm) rm.status = "vacant-dirty"; }
        r.status = "No-Show"; r.room = "";
        logActivity("No-show recorded — " + r.guest + " (" + r.conf + ")");
        save(); renderAll(); closeDrawer(); toast("Marked No-Show.");
      }
      return;
    }
    if (act === "charge") { openChargeForm(id); return; }
    if (act === "payment") { openPaymentForm(id); return; }
    if (act === "folio") { openFolio(id); return; }
    if (act === "print") { printFolio(id); return; }
    return;
  }
  const roomAct = e.target.closest("[data-room-action]");
  if (roomAct) {
    const act = roomAct.dataset.roomAction; const num = roomAct.dataset.num;
    if (act === "clean") { setRoomStatus(num, findRoom(num).status.indexOf("occupied") === 0 ? "occupied-clean" : "vacant-clean"); return; }
    if (act === "dirty") { setRoomStatus(num, findRoom(num).status.indexOf("occupied") === 0 ? "occupied-dirty" : "vacant-dirty"); return; }
    if (act === "ooo") { setRoomStatus(num, "out-of-order"); return; }
    if (act === "back") { setRoomStatus(num, "vacant-clean"); return; }
    if (act === "assign") { openAssignRoom(num); return; }
    return;
  }
  const hkAct = e.target.closest("[data-hk-action]");
  if (hkAct) { hkAction(hkAct.dataset.hkAction, hkAct.dataset.id); return; }
  const guestSave = e.target.closest("[data-guest-save]");
  if (guestSave) {
    const key = guestSave.dataset.guestSave;
    const parts = key.split("|");
    const note = document.getElementById("guestNoteInput").value.trim();
    state.reservations.filter(function (r) { return r.guest === parts[0] && r.phone === parts[1]; }).forEach(function (r) { r.guestNote = note; });
    save(); renderAll(); closeDrawer(); toast("Guest notes saved.");
    return;
  }
  const action = e.target.closest("[data-action]");
  if (action) {
    const a = action.dataset.action;
    if (a === "new-reservation") openNewReservation(false);
    if (a === "new-walkin") openNewReservation(true);
    if (a === "goto-frontdesk") { fdFilter = "Arriving Today"; showView("frontdesk"); }
    if (a === "goto-rooms") showView("rooms");
    if (a === "goto-housekeeping") showView("housekeeping");
    if (a === "goto-billing") showView("billing");
    return;
  }
});
document.addEventListener("change", function (e) {
  const sel = e.target.closest("[data-hk-staff]");
  if (sel) {
    const t = findTask(sel.dataset.hkStaff);
    if (t) { t.staff = sel.value; save(); renderAll(); toast("Room " + t.room + " assigned to " + t.staff + "."); }
    return;
  }
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") { closeModal(); closeDrawer(); document.getElementById("sidebar").classList.remove("open"); }
});

/* ---------- Init ---------- */
function init() {
  state = load();
  if (!state) seed();
  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("./sw.js").catch(function () { /* offline optional */ }); }
  document.getElementById("hamburgerBtn").addEventListener("click", function () { document.getElementById("sidebar").classList.toggle("open"); });
  document.getElementById("topNewBtn").addEventListener("click", function () { openNewReservation(false); });
  document.getElementById("drawerCloseBtn").addEventListener("click", closeDrawer);
  document.getElementById("drawerOverlay").addEventListener("click", closeDrawer);
  document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
  document.getElementById("modalOverlay").addEventListener("click", closeModal);
  const fdSearch = document.getElementById("fdSearch");
  fdSearch.addEventListener("input", function () { fdQuery = fdSearch.value; renderFrontDesk(); });
  const gSearch = document.getElementById("guestSearch");
  gSearch.addEventListener("input", function () { guestQuery = gSearch.value; renderGuests(); });
  document.getElementById("hkStaffFilter").addEventListener("change", function (e) { hkStaffFilter = e.target.value; renderHousekeeping(); });
  document.getElementById("hkNewTaskBtn").addEventListener("click", openNewTask);
  document.getElementById("assignAllBtn").addEventListener("click", function () {
    let count = 0;
    state.rooms.filter(function (r) { return r.status === "vacant-dirty"; }).forEach(function (room) {
      const existing = state.tasks.find(function (t) { return t.room === room.number && t.status !== "Done"; });
      if (!existing) { state.tasks.unshift({ id: newId("t"), room: room.number, type: room.type, priority: "Standard", staff: "Alex", status: "To Clean", notes: "Assigned via Assign all vacant-dirty.", issue: false }); count++; }
    });
    if (count === 0) { toast("All vacant-dirty rooms already have tasks."); return; }
    logActivity("Assign all vacant-dirty — " + count + " task(s) created");
    save(); renderAll(); toast(count + " task(s) created.");
  });
  document.getElementById("reportsRefreshBtn").addEventListener("click", function () { renderReports(); toast("Reports refreshed."); });
  document.getElementById("saveSettingsBtn").addEventListener("click", function () {
    state.settings.propertyName = document.getElementById("setProperty").value.trim() || "Harbor View Hotel (Demo)";
    state.settings.taxRate = Number(document.getElementById("setTax").value || 0);
    state.settings.rates.King = Number(document.getElementById("setKing").value || 0);
    state.settings.rates["Double Queen"] = Number(document.getElementById("setDQ").value || 0);
    state.settings.rates.Suite = Number(document.getElementById("setSuite").value || 0);
    save(); renderAll(); toast("Settings saved.");
  });
  document.getElementById("exportBtn").addEventListener("click", function () {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "staydesk-demo-export.json"; a.click();
    URL.revokeObjectURL(url);
    toast("Data exported as JSON.");
  });
  document.getElementById("resetBtn").addEventListener("click", function () {
    if (window.confirm("Reset demo data to the original sample? Your current changes will be replaced.")) { seed(); fdFilter = "All"; fdQuery = ""; renderAll(); toast("Demo data reset."); }
  });
  document.getElementById("clearBtn").addEventListener("click", function () {
    if (window.confirm("Clear ALL demo data? Use Reset Demo Data to bring the sample back.")) {
      state = { settings: JSON.parse(JSON.stringify(state.settings)), rooms: [], reservations: [], tasks: [], activity: [] };
      save(); renderAll(); toast("All data cleared. Use Reset to restore the sample.");
    }
  });
  renderAll();
  // Expose a tiny QA hook for smoke checks (no external use)
  window.__staydesk = { state: function () { return state; }, folioFor: folioFor, todayStr: todayStr };
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
