const nodemailer = require("nodemailer");
require("dotenv").config();
const cron = require("node-cron");

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.APP_EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

const sendOtpEmail = async (email, message) => {
  const mailOptions = {
    from: "watchvista6@gmail.com",
    to: email,
    subject: "Service Booking",
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const sendBookingEmail = async (email, booking) => {
  const mailOptions = {
    from: "watchvista6@gmail.com",
    to: email,
    subject: "Booking Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #1677FF;">Booking Confirmed 🎉</h2>
        <p>Hi,</p>
        <p>Your booking has been confirmed successfully.</p>
        <h3>Booking Details:</h3>
        <ul>
          <li><b>Service:</b> ${booking.serviceName}</li>
          <li><b>Date:</b> ${booking.date}</li>
          <li><b>Time Slot:</b> ${booking.slot}</li>
          <li><b>Price:</b> ₹${booking.price}</li>
        </ul>
        <p>We look forward to serving you!</p>
        <p style="margin-top:20px;">– Team smart cleaning services</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Booking confirmation email sent");
  } catch (error) {
    console.error("Error sending booking email:", error);
  }
};

// Send reminder email 30 min before booking
const scheduleReminderEmail = (email, booking) => {
  try {
    // Extract start time from slot ("11:00 - 12:00" → "11:00")
    const startTime = booking.slot.split(" - ")[0];
    const bookingDateTime = new Date(`${booking.date}T${startTime}`);

    // Reminder = 30 min before
    const reminderTime = new Date(bookingDateTime.getTime() - 30 * 60000);

    // If reminder time is already passed, handle gracefully
    if (reminderTime <= new Date()) {
      console.log("Reminder time already passed. Sending instant reminder...");
      sendReminderEmailNow(email, booking);
      return;
    }

    // Build cron expression (min hr day month)
    const cronExp = `${reminderTime.getMinutes()} ${reminderTime.getHours()} ${reminderTime.getDate()} ${
      reminderTime.getMonth() + 1
    } *`;

    cron.schedule(
      cronExp,
      async () => {
        await sendReminderEmailNow(email, booking);
      },
      { scheduled: true, timezone: "Asia/Kolkata" },
    );

    console.log("Reminder scheduled at:", reminderTime.toString());
  } catch (err) {
    console.error("Error scheduling reminder:", err);
  }
};

// helper function to send instantly
const sendReminderEmailNow = async (email, booking) => {
  const mailOptions = {
    from: "watchvista6@gmail.com",
    to: email,
    subject: "Service Reminder",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color:#1677FF;">Service Reminder ⏰</h2>
        <p>Hi,</p>
        <p>Your service <b>${booking.serviceName}</b> starts soon.</p>
        <ul>
          <li><b>Date:</b> ${booking.date}</li>
          <li><b>Time Slot:</b> ${booking.slot}</li>
        </ul>
        <p>Please be ready.</p>
        <p style="margin-top:20px;">– Team smart cleaning services</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Reminder email sent (instant)");
  } catch (error) {
    console.error("Error sending reminder email:", error);
  }
};

module.exports = { sendOtpEmail, sendBookingEmail, scheduleReminderEmail };
