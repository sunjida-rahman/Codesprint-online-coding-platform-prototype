const nodemailer = require("nodemailer");

async function sendTestEmail() {
  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "myushirahman@gmail.com",
        pass: "fqxt nnlc uvvx erju",
      },
    });

    let info = await transporter.sendMail({
      from: '"Codesprint" <your-email@gmail.com>',
      to: "recipient-email@gmail.com", // change this
      subject: "🚀 Test Contest Email",
      html: "<h2>This is a test email from Codesprint!</h2>",
    });

    console.log("✅ Email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
}

sendTestEmail();
