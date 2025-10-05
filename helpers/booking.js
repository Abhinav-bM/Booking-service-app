// utils/slots.js
function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * service: object with availableFrom "HH:MM", availableUntil "HH:MM", duration (minutes)
 * dateStr: "YYYY-MM-DD"
 * bookedSlots: array of slot strings that are already booked on that date
 * returns: array of { slot, startTime, endTime } where slot e.g. "09:00 - 09:30"
 */
function generateSlots(service, dateStr, bookedSlots = []) {
  const [sH, sM] = service.availableFrom.split(":").map(Number);
  const [eH, eM] = service.availableUntil.split(":").map(Number);
  const dur = Number(service.duration) || 30;

  // build Date objects using local time
  const start = new Date(dateStr + "T00:00:00");
  start.setHours(sH, sM, 0, 0);
  const end = new Date(dateStr + "T00:00:00");
  end.setHours(eH, eM, 0, 0);

  const slots = [];
  let cur = new Date(start);

  // current time (now)
  const now = new Date();

  while (cur.getTime() + dur * 60000 <= end.getTime()) {
    const nxt = new Date(cur.getTime() + dur * 60000);

    const startStr = pad(cur.getHours()) + ":" + pad(cur.getMinutes());
    const endStr = pad(nxt.getHours()) + ":" + pad(nxt.getMinutes());
    const slotLabel = `${startStr} - ${endStr}`;

    // Skip if already booked
    if (bookedSlots.includes(slotLabel)) {
      cur = nxt;
      continue;
    }

    // Skip past slots only if date is today
    const slotDate = new Date(dateStr + "T00:00:00");
    slotDate.setHours(cur.getHours(), cur.getMinutes(), 0, 0);

    if (
      slotDate.toDateString() === now.toDateString() && // same day
      slotDate.getTime() <= now.getTime() // slot already passed
    ) {
      cur = nxt;
      continue;
    }

    // add slot
    slots.push({ slot: slotLabel, startTime: startStr, endTime: endStr });
    cur = nxt;
  }

  return slots;
}

module.exports = { generateSlots };
