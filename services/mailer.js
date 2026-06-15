const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'netobelem22@gmail.com',
    pass: process.env.GMAIL_PASS || 'odvfhmshgwmvzary'
  }
});
module.exports = transporter;
