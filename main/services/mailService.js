// services/mailService.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendAccountCreationEmail = async (recipientEmail, username, password, role, name) => {
  try {
    const roleMap = {
      tentor: "Tentor",
      siswa: "Siswa",
      mitra: "Mitra"
    }; 
    
    const roleName = roleMap[role] || role;

    const mailOptions = {
      from: `"Bimbel Galaksi" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `Akun ${roleName} Anda Telah Dibuat`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Halo ${name},</h2>
          <p>Akun ${roleName} Anda di platform Bimbel Galaksi telah berhasil dibuat.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p>Silakan login menggunakan kredensial di atas. </p>
          <p style="color: #e74c3c; font-weight: bold;">Jangan bagikan informasi ini kepada siapapun!</p>
          
          <p>Terima kasih,<br>Bimbel Galaksi</p>
          
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ecf0f1; color: #7f8c8d; font-size: 12px;">
            <p>Email ini dikirim otomatis. Mohon tidak membalas email ini.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipientEmail}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Gagal mengirim email notifikasi");
  }
};

module.exports = {
  sendAccountCreationEmail,
};