// Importing required modules
const multer = require('multer');
const path = require('path');

// Configuring storage for multer
const storage = multer.diskStorage({
    // Setting destination folder for uploaded files
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "..", "public", "assets", "products"));
    },
    
    // Setting filename for uploaded files
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Creating a multer instance with the configured storage
const upload = multer({ storage: storage });

// Exporting the configured multer instance for use in other files
module.exports = upload;
