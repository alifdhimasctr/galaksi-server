const jwt = require("jsonwebtoken");

const authMiddlewareRole = (requiredRole) => {
  return (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1]; // Ambil token dari header Authorization

    if (!token) {
      return res.status(401).send("Token tidak ditemukan");
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).send("Token tidak valid");
      }

      // Simpan informasi pengguna ke req untuk digunakan di route selanjutnya
      req.user = decoded;

      // Periksa role jika diperlukan
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).send("Akses ditolak: Role tidak sesuai");
      }

      next(); // Lanjutkan ke route berikutnya
    });
  };
};

// Middleware untuk verifikasi token tanpa memeriksa role
const authMiddleware = (req, res, next) => {
  // Ambil token dari header Authorization
  const token = req.headers["authorization"]?.split(" ")[1];

  // Jika token tidak ada
  if (!token) {
    return res.status(401).send("Token tidak ditemukan");
  }

  // Verifikasi token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send("Token tidak valid");
    }

    // Simpan informasi pengguna ke req untuk digunakan di route selanjutnya
    req.user = decoded;

    next(); // Lanjutkan ke route berikutnya
  });
};

module.exports = {
  authMiddlewareRole,
  authMiddleware,
};
