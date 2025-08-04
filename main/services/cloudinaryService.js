// helper/cloudinaryService.js
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: 'dwhp8ookz',
  api_key: '763777154649325',
  api_secret: 'hO4WKKeRk6_XwJJ2AKek6VFnTA8'
});

async function uploadFile(buffer, filename, mimetype, folder = 'webku') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename.replace(/\.[^/.]+$/, ''), // remove extension
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

async function deleteFile(publicId) {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
}

module.exports = {
  uploadFile,
  deleteFile
};
