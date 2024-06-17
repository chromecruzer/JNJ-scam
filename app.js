const express = require('express');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Set up multer for file uploads (in-memory buffer storage)
const storage = multer.memoryStorage(); // Use memory storage for multer
const upload = multer({ storage: storage });

// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Middleware to parse JSON and urlencoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Set the view engine to Pug
app.set('view engine', 'pug');
app.set('views', './views');

// Route to render the form
app.get('/', (req, res) => {
  res.render('index');
});

// Route to handle form submission
app.post('/submit', upload.fields([
  { name: 'proof', maxCount: 1 },
  { name: 'screenshots', maxCount: 5 }
]), async (req, res) => {
  const { name, gender, email, complaint } = req.body;
  const proof = req.files['proof'][0]; // access the single proof file
  const screenshots = req.files['screenshots'] || []; // access the array of screenshot files

  if (!name || !gender || !email || !complaint || !proof) {
    console.log('Required fields are missing:', req.body); // Debug statement
    return res.status(400).send('Please provide name, gender, email, complaint, and proof');
  }

  console.log('Form data received:', req.body); // Debug statement

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_RECIPIENT,
    subject: `Form submission regarding JNJ company complaint from ${name}`,
    text: `
      Name: ${name}
      Gender: ${gender}
      Email: ${email}
      Complaint: ${complaint}
    `,
    attachments: [
      {
        filename: proof.originalname,
        content: proof.buffer, // Use buffer content instead of path
      },
      ...screenshots.map((screenshot) => ({
        filename: screenshot.originalname,
        content: screenshot.buffer, // Use buffer content instead of path
      })),
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Message sent successfully'); // Debug statement
    res.send('Message sent successfully'); // Send response to client

    // No need to clear uploads directory as files are in memory
  } catch (error) {
    console.error('Failed to send message:', error); // Log error
    res.status(500).send('Failed to send message'); // Send error response
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});


////////////////////////////////////////////////////////////////////////////////////////////////