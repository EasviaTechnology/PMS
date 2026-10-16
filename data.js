/* StayDesk — Demo PMS — sample data + settings. All names fictional. */
(function () {
  function iso(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }
  function addDays(base, n) {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return iso(d);
  }

  function buildSeed() {
    const today = new Date();
    const T = iso(today);
    const Y = addDays(today, -1);
    const TM = addDays(today, 1);
    const T2 = addDays(today, 2);
    const T3 = addDays(today, 3);
    const T4 = addDays(today, 4);
    const Y2 = addDays(today, -2);
    const Y3 = addDays(today, -3);

    const settings = {
      propertyName: "Harbor View Hotel (Demo)",
      taxRate: 12,
      rates: { King: 129, "Double Queen": 149, Suite: 219 }
    };

    const rooms = [];
    for (let n = 101; n <= 110; n++) rooms.push({ number: String(n), type: "King", status: "vacant-clean" });
    for (let n = 201; n <= 210; n++) rooms.push({ number: String(n), type: "Double Queen", status: "vacant-clean" });
    for (let n = 301; n <= 304; n++) rooms.push({ number: String(n), type: "Suite", status: "vacant-clean" });
    function setRoom(num, status) {
      const r = rooms.find(function (x) { return x.number === String(num); });
      if (r) r.status = status;
    }
    // Occupied
    setRoom(101, "occupied-clean");
    setRoom(205, "occupied-clean");
    setRoom(301, "occupied-dirty");
    setRoom(302, "occupied-clean");
    setRoom(106, "occupied-clean");
    setRoom(207, "occupied-dirty");
    // Vacant dirty (after checkout / no-show)
    setRoom(103, "vacant-dirty");
    setRoom(107, "vacant-dirty");
    setRoom(203, "vacant-dirty");
    setRoom(303, "vacant-dirty");
    setRoom(209, "vacant-dirty");
    // Out of order
    setRoom(110, "out-of-order");
    setRoom(210, "out-of-order");

    const reservations = [
      { id: "r01", conf: "SD-1001", guest: "Ava Thompson", phone: "(555) 010-1001", email: "ava.thompson@example.com", checkIn: Y, checkOut: TM, roomType: "King", room: "101", rate: 129, adults: 2, children: 0, paymentMethod: "Card ending 4242", balanceNote: "", notes: "Late checkout requested.", status: "Checked In", charges: [{ desc: "Minibar", amount: 12, date: T }], payments: [{ amount: 129, method: "Card", date: Y }] },
      { id: "r02", conf: "SD-1002", guest: "Liam Carter", phone: "(555) 010-1002", email: "liam.carter@example.com", checkIn: T, checkOut: T2, roomType: "Double Queen", room: "205", rate: 149, adults: 2, children: 2, paymentMethod: "Card ending 1881", balanceNote: "", notes: "Crib requested.", status: "Checked In", charges: [{ desc: "Parking", amount: 18, date: T }], payments: [{ amount: 150, method: "Card", date: T }] },
      { id: "r03", conf: "SD-1003", guest: "Maya Patel", phone: "(555) 010-1003", email: "maya.patel@example.com", checkIn: Y2, checkOut: T, roomType: "Suite", room: "301", rate: 219, adults: 2, children: 0, paymentMethod: "Card ending 9023", balanceNote: "", notes: "", status: "Checked In", charges: [], payments: [{ amount: 490.56, method: "Card", date: Y2 }] },
      { id: "r04", conf: "SD-1004", guest: "Noah Williams", phone: "(555) 010-1004", email: "noah.williams@example.com", checkIn: T, checkOut: T2, roomType: "King", room: "102", rate: 129, adults: 1, children: 0, paymentMethod: "Card ending 7710", balanceNote: "", notes: "Arriving after 6 PM.", status: "Reserved", charges: [], payments: [] },
      { id: "r05", conf: "SD-1005", guest: "Emma Davis", phone: "(555) 010-1005", email: "emma.davis@example.com", checkIn: T, checkOut: TM, roomType: "Double Queen", room: "202", rate: 149, adults: 2, children: 1, paymentMethod: "Card ending 3345", balanceNote: "", notes: "", status: "Reserved", charges: [], payments: [] },
      { id: "r06", conf: "SD-1006", guest: "Lucas Brown", phone: "(555) 010-1006", email: "lucas.brown@example.com", checkIn: Y2, checkOut: Y, roomType: "King", room: "103", rate: 129, adults: 1, children: 0, paymentMethod: "Card ending 5567", balanceNote: "", notes: "", status: "Checked Out", charges: [], payments: [{ amount: 144.48, method: "Card", date: Y }] },
      { id: "r07", conf: "SD-1007", guest: "Sofia Garcia", phone: "(555) 010-1007", email: "sofia.garcia@example.com", checkIn: T, checkOut: T3, roomType: "Suite", room: "302", rate: 219, adults: 2, children: 1, paymentMethod: "Card ending 2219", balanceNote: "", notes: "Anniversary stay.", status: "Checked In", charges: [{ desc: "Breakfast", amount: 24, date: T }], payments: [{ amount: 219, method: "Card", date: T }] },
      { id: "r08", conf: "SD-1008", guest: "Ethan Miller", phone: "(555) 010-1008", email: "ethan.miller@example.com", checkIn: T, checkOut: TM, roomType: "King", room: "", rate: 129, adults: 1, children: 0, paymentMethod: "Card ending 0098", balanceNote: "", notes: "Cancelled by guest.", status: "Cancelled", charges: [], payments: [] },
      { id: "r09", conf: "SD-1009", guest: "Olivia Wilson", phone: "(555) 010-1009", email: "olivia.wilson@example.com", checkIn: Y, checkOut: TM, roomType: "Double Queen", room: "", rate: 149, adults: 2, children: 0, paymentMethod: "Card ending 4471", balanceNote: "", notes: "Did not arrive.", status: "No-Show", charges: [], payments: [] },
      { id: "r10", conf: "SD-1010", guest: "Mason Jones", phone: "(555) 010-1010", email: "mason.jones@example.com", checkIn: TM, checkOut: T3, roomType: "King", room: "105", rate: 129, adults: 2, children: 0, paymentMethod: "Card ending 6654", balanceNote: "", notes: "", status: "Reserved", charges: [], payments: [] },
      { id: "r11", conf: "SD-1011", guest: "Isabella Moore", phone: "(555) 010-1011", email: "isabella.moore@example.com", checkIn: TM, checkOut: T2, roomType: "Double Queen", room: "204", rate: 149, adults: 2, children: 0, paymentMethod: "Card ending 8820", balanceNote: "", notes: "Quiet room requested.", status: "Reserved", charges: [], payments: [] },
      { id: "r12", conf: "SD-1012", guest: "James Taylor", phone: "(555) 010-1012", email: "james.taylor@example.com", checkIn: Y3, checkOut: Y, roomType: "Suite", room: "303", rate: 219, adults: 2, children: 0, paymentMethod: "Card ending 1134", balanceNote: "", notes: "", status: "Checked Out", charges: [{ desc: "Room service", amount: 32, date: Y2 }], payments: [{ amount: 526.4, method: "Card", date: Y }] },
      { id: "r13", conf: "SD-1013", guest: "Amelia Anderson", phone: "(555) 010-1013", email: "amelia.anderson@example.com", checkIn: Y, checkOut: T, roomType: "King", room: "106", rate: 129, adults: 1, children: 0, paymentMethod: "Cash", balanceNote: "", notes: "", status: "Checked In", charges: [], payments: [{ amount: 144.48, method: "Cash", date: Y }] },
      { id: "r14", conf: "SD-1014", guest: "Benjamin Thomas", phone: "(555) 010-1014", email: "benjamin.thomas@example.com", checkIn: T, checkOut: T3, roomType: "Double Queen", room: "206", rate: 149, adults: 2, children: 2, paymentMethod: "Card ending 2901", balanceNote: "", notes: "", status: "Reserved", charges: [], payments: [] },
      { id: "r15", conf: "SD-1015", guest: "Harper Jackson", phone: "(555) 010-1015", email: "harper.jackson@example.com", checkIn: Y, checkOut: T, roomType: "King", room: "107", rate: 129, adults: 2, children: 0, paymentMethod: "Card ending 7788", balanceNote: "", notes: "", status: "Checked Out", charges: [], payments: [{ amount: 144.48, method: "Card", date: T }] },
      { id: "r16", conf: "SD-1016", guest: "Evelyn White", phone: "(555) 010-1016", email: "evelyn.white@example.com", checkIn: T, checkOut: TM, roomType: "Double Queen", room: "207", rate: 149, adults: 1, children: 0, paymentMethod: "Card ending 6012", balanceNote: "", notes: "VIP — welcome note placed.", status: "Checked In", charges: [], payments: [{ amount: 100, method: "Card", date: T }] },
      { id: "r17", conf: "SD-1017", guest: "Henry Harris", phone: "(555) 010-1017", email: "henry.harris@example.com", checkIn: TM, checkOut: T4, roomType: "Suite", room: "304", rate: 219, adults: 2, children: 0, paymentMethod: "Card ending 3456", balanceNote: "", notes: "", status: "Reserved", charges: [], payments: [] },
      { id: "r18", conf: "SD-1018", guest: "Charlotte Martin", phone: "(555) 010-1018", email: "charlotte.martin@example.com", checkIn: T, checkOut: T2, roomType: "King", room: "108", rate: 129, adults: 2, children: 0, paymentMethod: "Card ending 9087", balanceNote: "", notes: "", status: "Reserved", charges: [], payments: [] }
    ];

    const tasks = [
      { id: "t01", room: "103", type: "King", priority: "Standard", staff: "Alex", status: "To Clean", notes: "Checkout clean.", issue: false },
      { id: "t02", room: "107", type: "King", priority: "Priority", staff: "Maria", status: "In Progress", notes: "Early arrival expected.", issue: false },
      { id: "t03", room: "203", type: "Double Queen", priority: "Standard", staff: "Jordan", status: "To Clean", notes: "", issue: false },
      { id: "t04", room: "303", type: "Suite", priority: "Standard", staff: "Alex", status: "To Clean", notes: "Deep clean.", issue: false },
      { id: "t05", room: "301", type: "Suite", priority: "VIP", staff: "Maria", status: "In Progress", notes: "Occupied — tidy only, do not disturb.", issue: false },
      { id: "t06", room: "207", type: "Double Queen", priority: "VIP", staff: "Jordan", status: "To Clean", notes: "VIP room — extra towels.", issue: false },
      { id: "t07", room: "209", type: "Double Queen", priority: "Standard", staff: "Alex", status: "To Clean", notes: "", issue: false },
      { id: "t08", room: "104", type: "King", priority: "Standard", staff: "Maria", status: "Inspected", notes: "Inspected and ready.", issue: false },
      { id: "t09", room: "201", type: "Double Queen", priority: "Standard", staff: "Jordan", status: "Done", notes: "Completed.", issue: false },
      { id: "t10", room: "108", type: "King", priority: "Standard", staff: "Alex", status: "Inspected", notes: "Ready for arrival.", issue: false },
      { id: "t11", room: "304", type: "Suite", priority: "Standard", staff: "Maria", status: "To Clean", notes: "", issue: false },
      { id: "t12", room: "110", type: "King", priority: "Priority", staff: "Jordan", status: "To Clean", notes: "Out of order — maintenance check needed.", issue: true }
    ];

    const activity = [
      { time: T + " 09:12", text: "Check-in completed — Liam Carter (Room 205)" },
      { time: T + " 08:47", text: "Reservation created — Charlotte Martin (SD-1018)" },
      { time: T + " 08:20", text: "Housekeeping started — Room 107 (Maria)" },
      { time: T + " 07:55", text: "Payment added — $100.00 to Evelyn White (SD-1016)" },
      { time: T + " 07:30", text: "Check-out completed — Harper Jackson (Room 107)" },
      { time: T + " 07:05", text: "Room 110 marked Out of Order" },
      { time: T + " 06:50", text: "Housekeeping completed — Room 201" },
      { time: T + " 06:30", text: "Reservation created — Henry Harris (SD-1017)" }
    ];

    return { settings: settings, rooms: rooms, reservations: reservations, tasks: tasks, activity: activity };
  }

  window.StayDeskSeed = { buildSeed: buildSeed };
})();
