const multer = require('multer');
const streamifier = require('streamifier');
const { v2: cloudinary } = require('cloudinary');

// ✅ Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: 'dwhp8ookz',
  api_key: '763777154649325',
  api_secret: 'hO4WKKeRk6_XwJJ2AKek6VFnTA8'
});

// ✅ Multer setup
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpe?g|png|webp|pdf/;
  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(
      new Error(`File type not allowed: ${file.originalname}. Only JPEG, PNG, WebP, and PDF are allowed.`),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 10
  }
});

// ✅ Fungsi Upload ke Cloudinary
const uploadToCloudinary = (buffer, filename, mimetype, folder = 'webku') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        public_id: filename.replace(/\.[^/.]+$/, '') // Hapus ekstensi
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// ✅ Middleware upload single file ke Cloudinary
const handleCloudinaryUploadSingle = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const fileData = await uploadToCloudinary(
      req.file.buffer,
      `${Date.now()}_${req.file.originalname}`,
      req.file.mimetype
    );

    req.file.cloudinaryUrl = fileData.secure_url;
    req.file.publicId = fileData.public_id;
    req.file.cloudinarySize = fileData.bytes;

    console.log(`Single file uploaded to Cloudinary: ${req.file.originalname} → ${fileData.secure_url}`);
    next();
  } catch (error) {
    console.error('Cloudinary single upload error:', error);
    next(new Error(`Cloudinary upload failed: ${error.message}`));
  }
};

// ✅ Middleware upload multiple files ke Cloudinary
const handleCloudinaryUploadMultiple = async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) return next();

  try {
    const uploadPromises = [];

    for (const fieldName in req.files) {
      for (const file of req.files[fieldName]) {
        const uploadPromise = uploadToCloudinary(
          file.buffer,
          `${Date.now()}_${file.originalname}`,
          file.mimetype
        ).then(fileData => {
          file.cloudinaryUrl = fileData.secure_url;
          file.publicId = fileData.public_id;
          file.cloudinarySize = fileData.bytes;

          console.log(`Uploaded to Cloudinary: ${file.originalname} → ${fileData.secure_url}`);
        }).catch(error => {
          console.error(`Failed to upload ${file.originalname}:`, error);
          throw new Error(`Upload failed for ${file.originalname}: ${error.message}`);
        });

        uploadPromises.push(uploadPromise);
      }
    }

    await Promise.all(uploadPromises);
    console.log('All files uploaded to Cloudinary successfully.');
    next();
  } catch (error) {
    console.error('Cloudinary multi upload error:', error);
    next(new Error(`Cloudinary upload failed: ${error.message}`));
  }
};

module.exports = {
  uploadMiddleware: upload,
  handleCloudinaryUploadSingle,
  handleCloudinaryUploadMultiple
};
