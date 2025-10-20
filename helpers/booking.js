// utils/slots.js
const { DateTime, Interval } = require("luxon");

function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * service: object with availableFrom "HH:MM", availableUntil "HH:MM", duration (minutes)
 * dateStr: "YYYY-MM-DD"
 * bookedSlots: array of slot strings that are already booked on that date
 * timezone: e.g., "Asia/Kolkata"
 * returns: array of { slot, startTime, endTime } where slot e.g. "09:00 - 09:30"
 */
function generateSlots(service, dateStr, bookedSlots = [], timezone = "Asia/Kolkata") {
  const [sH, sM] = service.availableFrom.split(":").map(Number);
  const [eH, eM] = service.availableUntil.split(":").map(Number);
  const dur = Number(service.duration) || 30;

  const start = DateTime.fromObject(
    { year: Number(dateStr.split("-")[0]), month: Number(dateStr.split("-")[1]), day: Number(dateStr.split("-")[2]), hour: sH, minute: sM },
    { zone: timezone }
  );

  const end = DateTime.fromObject(
    { year: Number(dateStr.split("-")[0]), month: Number(dateStr.split("-")[1]), day: Number(dateStr.split("-")[2]), hour: eH, minute: eM },
    { zone: timezone }
  );

  const now = DateTime.now().setZone(timezone);

  let cur = start;
  const slots = [];

  while (cur.plus({ minutes: dur }) <= end) {
    const nxt = cur.plus({ minutes: dur });

    const startStr = pad(cur.hour) + ":" + pad(cur.minute);
    const endStr = pad(nxt.hour) + ":" + pad(nxt.minute);
    const slotLabel = `${startStr} - ${endStr}`;

    // Skip booked
    if (bookedSlots.includes(slotLabel)) {
      cur = nxt;
      continue;
    }

    // Skip past slots if today
    if (cur < now && cur.hasSame(now, "day")) {
      cur = nxt;
      continue;
    }

    slots.push({ slot: slotLabel, startTime: startStr, endTime: endStr });
    cur = nxt;
  }

  return slots;
}

module.exports = { generateSlots };
