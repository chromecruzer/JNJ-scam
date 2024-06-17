const express = require('express');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Set up multer for file uploads
const storage = multer.diskStorage({ 
  destination: function (req, file, cb) {
    cb(null, './public/uploads'); // save files to ./public/uploads directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // keep the original filename
  },
});
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
app.use(express.static('public'));
app.use(express.json()); // To parse JSON bodies 

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
    return res.status(400).send('Please provide name, gender, email, complaint, and proof');
  }

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
        path: proof.path,
      },
      ...screenshots.map((screenshot) => ({
        filename: screenshot.originalname,
        path: screenshot.path,
      })),
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Message sent successfully');
   // res.send('Message sent successfully');
    res.redirect('/')

    // Clear uploads directory
    clearUploadsDirectory('./public/uploads');
  } catch (error) {
    console.error('Failed to send message:', error);
    res.status(500).send('Failed to send message');
  }
});

// Function to clear uploads directory (remove files only)
function clearUploadsDirectory(directoryPath) {
  const directory = path.resolve(__dirname, directoryPath);

  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    for (const file of files) {
      const filePath = path.join(directory, file);

      // Check if it is a file (not a directory)
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting file stats for ${file}:`, err);
          return;
        }
        
        if (stats.isFile()) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file ${file}:`, err);
            } else {
              console.log(`Deleted file: ${filePath}`); 
            }
          });
        }
      });
    }
    console.log('Uploads directory cleared');
  });
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

////////////////////////////////////////////////////////////////////////////////////////////////