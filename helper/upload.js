
const multer  = require('multer');
const path    = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'tentor'));   
  },
  filename : (req, file, cb) => {
    const ext = path.extname(file.originalname);                 
    const name = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpe?g|png|webp/;
  allowed.test(path.extname(file.originalname).toLowerCase())
    ? cb(null, true)
    : cb(new Error('Only images are allowed'), false);
};

module.exports = multer({ storage, fileFilter });
