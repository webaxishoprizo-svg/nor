const nodemailer = require('nodemailer');

let transporter;
async function setupMailer() {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        console.log("✅ Custom SMTP credentials loaded.");
    } else {
        console.log("⚠️ No SMTP credentials found. Generating Ethereal Test Account...");
        let testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465
            auth: {
                user: testAccount.user, 
                pass: testAccount.pass  
            }
        });
        console.log("✅ Ethereal Email Ready. Watch console for message preview URLs.");
    }
}
setupMailer();

async function sendEmailLog(to, subject, htmlContent) {
    if (!transporter) return;
    try {
        let info = await transporter.sendMail({
            from: '"NOR Perfume" <no-reply@norperfume.com>',
            to: to,
            subject: subject,
            html: htmlContent
        });
        console.log("📧 Email Sent:", info.messageId);
        if (info.messageId && !process.env.EMAIL_USER) {
            console.log("🔍 Preview URL:", nodemailer.getTestMessageUrl(info));
        }
    } catch (err) {
        console.error("Email Error:", err);
    }
}

module.exports = { sendEmailLog };
