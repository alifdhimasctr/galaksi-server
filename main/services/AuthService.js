const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Siswa, Tentor, Mitra, Admin, Mapel } = require("../models");
const { Op, Sequelize } = require("sequelize");
const db = require("../../database/db");
const { sendAccountCreationEmail } = require("./mailService");

const JWT_SECRET = process.env.JWT_SECRET;

// Helper untuk parsing JSON dengan aman
const safeJsonParse = (str) => {
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch (e) {
    if (typeof str === "string") {
      return str.split(",").map(item => item.trim());
    }
    return [];
  }
};

// Helper untuk generate username unik
const generateUniqueUsername = async (baseName) => {
  let username = baseName.toLowerCase().replace(/\s+/g, "");
  let counter = 1;
  let newUsername = username;

  while (true) {
    const existingUser = await checkUsernameUniqueness(newUsername);
    if (!existingUser) return newUsername;
    
    newUsername = `${username}${counter}`;
    counter++;
  }
};

const createAdmin = async (adminData) => {
  try {
    const { username, password } = adminData;
    const hashedPassword = await bcrypt.hash(password, 10);

    return await Admin.create({
      ...adminData,
      password: hashedPassword,
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    throw new Error("Failed to create admin");
  }
};

const checkUsernameUniqueness = async (username) => {
  const [existingTentor, existingMitra, existingSiswa, existingAdmin] = await Promise.all([
    Tentor.findOne({ where: { username } }),
    Mitra.findOne({ where: { username } }),
    Siswa.findOne({ where: { username } }),
    Admin.findOne({ where: { username } })
  ]);

  return existingTentor || existingMitra || existingSiswa || existingAdmin;
};

const createTentor = async (tentorData) => {
  const {
    name,
    level,
    mapel,
    email
  } = tentorData;

  // Generate username unik
  const username = await generateUniqueUsername(name);
  
  const password = process.env.DEFAULT_PASSWORD;
  if (!password) {
    throw new Error("DEFAULT_PASSWORD belum diatur di environment variables");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  // Validasi dan format level
  let levelArray = [];
  if (Array.isArray(level)) {
    levelArray = level;
  } else if (level) {
    levelArray = safeJsonParse(level);
  }

  // Validasi dan format mapel
  let mapelArray = [];
  if (Array.isArray(mapel)) {
    mapelArray = mapel;
  } else if (mapel) {
    mapelArray = safeJsonParse(mapel);
  }

  // Simpan sebagai JSON string
  const newTentor = await Tentor.create({
    ...tentorData,
    username,
    password: hashedPassword,
    level: JSON.stringify(levelArray),
    mapel: JSON.stringify(mapelArray)
  });

  // Kirim email (tidak mengganggu proses utama)
  if (email) {
    try {
      await sendAccountCreationEmail(
        email, 
        username, 
        password,
        "tentor",
        name
      );
    } catch (emailError) {
      console.error("Email notification failed:", emailError);
    }
  }

  return newTentor;
};

const updateTentor = async (tentorId, tentorData) => {
  const existingTentor = await Tentor.findByPk(tentorId);
  if (!existingTentor) {
    throw new Error("Tentor tidak ditemukan");
  }

  const updatedData = { ...tentorData };

  // Handle password update
  if (tentorData.password) {
    updatedData.password = await bcrypt.hash(tentorData.password, 10);
  }

  // Handle username update jika nama berubah
  if (tentorData.name && tentorData.name !== existingTentor.name) {
    updatedData.username = await generateUniqueUsername(tentorData.name);
  }

  // Handle level dan mapel
  if (tentorData.level) {
    let levelArray = Array.isArray(tentorData.level) ? 
      tentorData.level : 
      safeJsonParse(tentorData.level);
    updatedData.level = JSON.stringify(levelArray);
  }

  if (tentorData.mapel) {
    let mapelArray = Array.isArray(tentorData.mapel) ? 
      tentorData.mapel : 
      safeJsonParse(tentorData.mapel);
    updatedData.mapel = JSON.stringify(mapelArray);
  }

  return await existingTentor.update(updatedData);
};

const createMitra = async (mitraData) => {
  const { name, email } = mitraData;

  const password = process.env.DEFAULT_PASSWORD;
  if (!password) {
    throw new Error("DEFAULT_PASSWORD belum diatur di environment variables");
  }
  
  const username = await generateUniqueUsername(name);
  const hashedPassword = await bcrypt.hash(password, 10);

  const newMitra = await Mitra.create({
    ...mitraData,
    username,
    password: hashedPassword,
  });

  // Kirim email
  if (email) {
    try {
      await sendAccountCreationEmail(
        email, 
        username, 
        password,
        "mitra",
        name
      );
    } catch (emailError) {
      console.error("Email notification failed:", emailError);
    }
  }

  return newMitra;
};

const createSiswa = async (siswaData) => {
  const { name, email } = siswaData;

  const password = process.env.DEFAULT_PASSWORD;
  if (!password) {
    throw new Error("DEFAULT_PASSWORD belum diatur di environment variables");
  }
  
  const username = await generateUniqueUsername(name);
  const hashedPassword = await bcrypt.hash(password, 10);

  const newSiswa = await Siswa.create({
    ...siswaData,
    username,
    password: hashedPassword,
    role: "siswa",
  });

  // Kirim email
  if (email) {
    try {
      await sendAccountCreationEmail(
        email, 
        username, 
        password,
        "siswa",
        name
      );
    } catch (emailError) {
      console.error("Email notification failed:", emailError);
    }
  }

  return newSiswa;
};

const login = async (username, password) => {
  const roles = [
    { model: Admin, role: "admin" },
    { model: Tentor, role: "tentor" },
    { model: Mitra, role: "mitra" },
    { model: Siswa, role: "siswa" }
  ];

  let user = null;
  let userRole = null;

  // Cek semua role
  for (const { model, role } of roles) {
    const foundUser = await model.findOne({ where: { username } });
    if (foundUser) {
      user = foundUser;
      userRole = role;
      break;
    }
  }

  if (!user) {
    throw new Error("Username atau password salah.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Username atau password salah.");
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: userRole,
    },
    JWT_SECRET
  );

  return {
    token,
    user: {
      name: user.name,
      id: user.id,
      username: user.username,
      role: userRole,
      ...(userRole === "siswa" && { level: safeJsonParse(user.level) })
    }
  };
};

const getAllUsers = async (role, filters = {}) => {
  switch (role) {
    case "admin":
      return await Admin.findAll();

    case "tentor":
      const tentors = await Tentor.findAll();
      const mapels = await Mapel.findAll();

      return tentors.map(tentor => ({
        ...tentor.toJSON(),
        level: safeJsonParse(tentor.level),
        mapel: safeJsonParse(tentor.mapel).map(id => 
          mapels.find(m => m.id === id)?.name || id
        )
      }));

    case "mitra":
      const mitras = await Mitra.findAll();
      const siswas = await Siswa.findAll();

      return mitras.map(mitra => ({
        ...mitra.toJSON(),
        siswa: siswas
          .filter(siswa => siswa.mitraId === mitra.id)
          .map(siswa => ({ id: siswa.id, name: siswa.name }))
      }));

    case "siswa":
      const whereClause = filters.mitraId ? { mitraId: filters.mitraId } : {};
      const siswaList = await Siswa.findAll({ where: whereClause });
      const mitraList = await Mitra.findAll();

      return siswaList.map(siswa => {
        const mitra = mitraList.find(m => m.id === siswa.mitraId);
        return {
          ...siswa.toJSON(),
          mitraName: mitra ? mitra.name : "-",
          level: safeJsonParse(siswa.level)
        };
      });

    case "all":
      const [admins, tentorsAll, mitrasAll, siswaListAll] = await Promise.all([
        Admin.findAll(),
        Tentor.findAll(),
        Mitra.findAll(),
        Siswa.findAll(),
      ]);
      return { admins, tentors: tentorsAll, mitras: mitrasAll, siswa: siswaListAll };

    default:
      throw new Error("Role tidak valid");
  }
};

const getAllTentor = async (level, host) => {
  try {
    const whereClause = level ? 
      Sequelize.literal(`JSON_CONTAINS(level, '"${level}"')`) : 
      {};

    const tentors = await Tentor.findAll({
      where: whereClause,
      attributes: {
        exclude: ["password"],
        include: [
          [
            Sequelize.literal(`CONCAT('${host}/uploads/tentor/', foto)`),
            "fotoUrl",
          ],
          [
            Sequelize.literal(`CONCAT('${host}/uploads/tentor/', cv)`),
            "cvUrl",
          ],
        ],
      },
      raw: true,
    });

    const mapels = await Mapel.findAll();

    return tentors.map(tentor => {
      const levelData = safeJsonParse(tentor.level);
      const mapelIds = safeJsonParse(tentor.mapel);
      
      const mapelData = mapelIds.map(id => {
        const mapel = mapels.find(m => m.id == id);
        return mapel ? { id: mapel.id, name: mapel.name } : { id, name: "Unknown" };
      });

      return {
        ...tentor,
        level: levelData,
        mapel: mapelData
      };
    });
  } catch (error) {
    console.error("Error in getAllTentor:", error);
    throw error;
  }
};

const getUserById = async (userId, role) => {
  let user;
  switch (role) {
    case "admin":
      user = await Admin.findByPk(userId);
      break;

    case "tentor":
      user = await Tentor.findByPk(userId);
      if (user) {
        const mapels = await Mapel.findAll();
        return {
          ...user.toJSON(),
          level: safeJsonParse(user.level),
          mapel: safeJsonParse(user.mapel).map(id => 
            mapels.find(m => m.id === id)?.name || id
          )
        };
      }
      break;

    case "mitra":
      user = await Mitra.findByPk(userId);
      if (user) {
        const siswa = await Siswa.findAll({
          where: { mitraId: user.id },
          attributes: ["id", "name"],
        });
        return {
          ...user.toJSON(),
          siswa: siswa.map(s => ({ id: s.id, name: s.name }))
        };
      }
      break;

    case "siswa":
      user = await Siswa.findByPk(userId);
      if (user) {
        const mitra = await Mitra.findByPk(user.mitraId);
        return {
          ...user.toJSON(),
          mitraName: mitra ? mitra.name : "-",
          level: safeJsonParse(user.level)
        };
      }
      break;

    default:
      throw new Error("Role tidak valid");
  }

  if (!user) throw new Error("User tidak ditemukan");
  return user;
};

const updateUser = async (userId, userData, role) => {
  const models = {
    admin: Admin,
    tentor: Tentor,
    mitra: Mitra,
    siswa: Siswa
  };

  const model = models[role];
  if (!model) throw new Error("Role tidak valid");

  const user = await model.findByPk(userId);
  if (!user) throw new Error("User tidak ditemukan");

  // Handle khusus update untuk Tentor
  if (role === "tentor") {
    if (userData.level) {
      userData.level = JSON.stringify(
        Array.isArray(userData.level) ? 
        userData.level : 
        safeJsonParse(userData.level)
      );
    }

    if (userData.mapel) {
      userData.mapel = JSON.stringify(
        Array.isArray(userData.mapel) ? 
        userData.mapel : 
        safeJsonParse(userData.mapel)
      );
    }
  }

  await user.update(userData);
  return user;
};

const deleteUser = async (userId, role) => {
  const models = {
    admin: Admin,
    tentor: Tentor,
    mitra: Mitra,
    siswa: Siswa
  };

  const model = models[role];
  if (!model) throw new Error("Role tidak valid");

  const user = await model.findByPk(userId);
  if (!user) throw new Error("User tidak ditemukan");

  await user.destroy();
  return user;
};

module.exports = {
  createAdmin,
  createTentor,
  updateTentor,
  getAllTentor,
  createMitra,
  createSiswa,
  login,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};