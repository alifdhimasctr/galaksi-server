const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Siswa, Tentor, Mitra, Admin, Mapel } = require("../models");
const { Op, Sequelize } = require("sequelize");
const db = require("../../database/db");
const { sendAccountCreationEmail } = require("./mailService");
//test

const JWT_SECRET = process.env.JWT_SECRET;

const createAdmin = async (adminData) => {
  try {
    const { username, password } = adminData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await Admin.create({
      ...adminData,
      password: hashedPassword,
    });

    return newAdmin;
  } catch (error) {
    console.error("Error creating admin:", error);
    throw new Error("Failed to create admin");
  }
};

const checkUsernameUniqueness = async (username) => {
  // Cek di Tentor, Mitra, dan Siswa
  const [existingTentor, existingMitra, existingSiswa] = await Promise.all([
    Tentor.findOne({ where: { username } }),
    Mitra.findOne({ where: { username } }),
    Siswa.findOne({ where: { username } }),
  ]);

  return existingTentor || existingMitra || existingSiswa; // Jika ada yang ditemukan, username sudah duplikat
};

const createTentor = async (tentorData) => {
  const {
    name,
    noHp,
    gender,
    address,
    city,
    faculty,
    university,
    level,
    schedule,
    foto,
    ktp,
    sim,
    cv,
    bankName,
    bankNumber,
    mapel,
  } = tentorData;

  const password = process.env.DEFAULT_PASSWORD;
  if (!password) {
    throw new Error("DEFAULT_PASSWORD belum diatur di environment variables");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  let username = name ? name.toLowerCase().replace(/\s+/g, "") : null;
  const existingTentor = await Siswa.findOne({
    where: {
      username: {
        [Op.like]: `${username}%`,
      },
    },
    order: [["username", "DESC"]],
  });

  if (existingTentor) {
    const match = existingTentor.username.match(/(\d+)$/);
    const increment = match ? parseInt(match[1], 10) + 1 : 1;
    username = `${username}${increment}`;
  }

  let existingUser = await checkUsernameUniqueness(username);
  if (existingUser) {
    const match = username.match(/(\d+)$/);
    const increment = match ? parseInt(match[1], 10) + 1 : 1;
    username = `${username}${increment}`;
  }

  let levelArray = [];
  if (Array.isArray(level)) {
    levelArray = level;
  } else if (level) {
    try {
      levelArray = JSON.parse(level);
    } catch (error) {
      throw new Error("Invalid format for level");
    }
  }

  let mapelArray = [];
  if (Array.isArray(mapel)) {
    mapelArray = mapel;
  } else if (mapel) {
    try {
      mapelArray = JSON.parse(mapel);
    } catch (error) {
      throw new Error("Invalid format for mapel");
    }
  }

  let scheduleArray = [];
  if (Array.isArray(schedule)) {
    scheduleArray = schedule.map(daySchedule => ({
      day: daySchedule.day,
      slots: daySchedule.slots.map(slot => ({
        time: slot,
        booked: false
      }))
    }));
  } else if (schedule) {
    try {
      const parsedSchedule = JSON.parse(schedule);
      scheduleArray = parsedSchedule.map(daySchedule => ({
        day: daySchedule.day,
        slots: daySchedule.slots.map(slot => ({
          time: slot,
          booked: false
        }))
      }));
    } catch (error) {
      throw new Error("Invalid format for schedule");
    }
  }

  const newTentor = await Tentor.create({
    ...tentorData,
    username,
    password: hashedPassword,
    level: levelArray,
    mapel: mapelArray,
    schedule: scheduleArray,
    foto,
    ktp,
    cv,
    sim,
  });

    try {
    await sendAccountCreationEmail(
      tentorData.email, 
      username, 
      process.env.DEFAULT_PASSWORD,
      "tentor",
      tentorData.name
    );
  } catch (emailError) {
    console.error("Email notification failed:", emailError);
    // Tidak perlu throw error karena akun sudah berhasil dibuat
  }

  return newTentor;
};

const updateTentor = async (tentorId, tentorData) => {
  const {
    name,
    level,
    schedule,
    mapel,
    password
  } = tentorData;

  const existingTentor = await Tentor.findByPk(tentorId);
  if (!existingTentor) {
    throw new Error("Tentor tidak ditemukan");
  }

  const updatedData = { ...tentorData };

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updatedData.password = hashedPassword;
  }

  if (name && name !== existingTentor.name) {
    updatedData.username = name.toLowerCase().replace(/\s+/g, "");
  }

  let levelArray = [];
  if (Array.isArray(level)) {
    levelArray = level;
  } else if (level) {
    try {
      levelArray = JSON.parse(level);
    } catch (error) {
      throw new Error("Invalid format for level");
    }
  }
  updatedData.level = levelArray;

  let mapelArray = [];
  if (Array.isArray(mapel)) {
    mapelArray = mapel;
  } else if (mapel) {
    try {
      mapelArray = JSON.parse(mapel);
    } catch (error) {
      throw new Error("Invalid format for mapel");
    }
  }
  updatedData.mapel = mapelArray;

  let scheduleArray = [];
if (Array.isArray(schedule)) {
  scheduleArray = schedule.map(daySchedule => ({
    day: daySchedule.day,
    slots: Array.isArray(daySchedule.slots)
      ? daySchedule.slots.map(slot => ({
          time: slot,
          booked: false // Reset status booking
        }))
      : []
  }));
} else if (schedule) {
    try {
      const parsedSchedule = JSON.parse(schedule);
      scheduleArray = parsedSchedule.map(daySchedule => ({
        day: daySchedule.day,
        slots: Array.isArray(daySchedule.slots)
          ? daySchedule.slots.map(slot => ({
              time: slot,
              booked: false
            }))
          : []
      }));
    } catch (error) {
      throw new Error("Invalid format for schedule");
    }
  }
  updatedData.schedule = scheduleArray;

  const updatedTentor = await existingTentor.update(updatedData);
  return updatedTentor;
};

const createMitra = async (mitraData) => {
  const { name, email, branch, address, city, noHp } = mitraData;

  const password = process.env.DEFAULT_PASSWORD;
  if (!password) {
    throw new Error("DEFAULT_PASSWORD belum diatur di environment variables");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const username = name ? name.toLowerCase().replace(/\s+/g, "") : null;
  

  let existingUser = await checkUsernameUniqueness(username);
  if (existingUser) {
    const match = username.match(/(\d+)$/);
    const increment = match ? parseInt(match[1], 10) + 1 : 1;
    username = `${username}${increment}`;
  }

  const newMitra = await Mitra.create({
    ...mitraData,
    username,
    password: hashedPassword,
  });

  try {
    await sendAccountCreationEmail(
      mitraData.email, 
      username, 
      process.env.DEFAULT_PASSWORD,
      "mitra",
      mitraData.name
    );
  } catch (emailError) {
    console.error("Email notification failed:", emailError);
  }

  return newMitra;
};

const createSiswa = async (siswaData) => {
  const {
    name,
    noHp,
    email,
    gender,
    parentName,
    parentJob,
    address,
    city,
    purpose,
    level, // masih diterima dari frontend
  } = siswaData;

  const password = process.env.DEFAULT_PASSWORD;
  if (!password) {
    throw new Error("DEFAULT_PASSWORD belum diatur di environment variables");
  }

  let username = name.toLowerCase().replace(/\s+/g, "");
  const existingSiswa = await Siswa.findOne({
    where: {
      username: {
        [Op.like]: `${username}%`,
      },
    },
    order: [["username", "DESC"]],
  });

  if (existingSiswa) {
    const match = existingSiswa.username.match(/(\d+)$/);
    const increment = match ? parseInt(match[1], 10) + 1 : 1;
    username = `${username}${increment}`;
  }

  let existingUser = await checkUsernameUniqueness(username);
  if (existingUser) {
    const match = username.match(/(\d+)$/);
    const increment = match ? parseInt(match[1], 10) + 1 : 1;
    username = `${username}${increment}`;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newSiswa = await Siswa.create({
    ...siswaData,
    username: username,
    password: hashedPassword,
    role: "siswa",
  });

  try {
    await sendAccountCreationEmail(
      siswaData.email, 
      username, 
      process.env.DEFAULT_PASSWORD,
      "siswa",
      siswaData.name
    );
  } catch (emailError) {
    console.error("Email notification failed:", emailError);
  }

  return newSiswa;
};

const login = async (username, password) => {
  let user;
  let role;

  user = await Admin.findOne({
    where: {
      username,
    },
  });
  if (user) {
    role = "admin";
  } else {
    user = await Tentor.findOne({
      where: {
        username,
      },
    });
    if (user) {
      role = "tentor";
    } else {
      user = await Mitra.findOne({
        where: {
          username,
        },
      });
      if (user) {
        role = "mitra";
      } else {
        user = await Siswa.findOne({
          where: {
            username,
          },
        });
        if (user) {
          role = "siswa";
        }
      }
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
      role: role,
    },
    JWT_SECRET
  );

  if (role === "siswa") {
    return {
      token,
      user: {
        name: user.name,
        id: user.id,
        username: user.username,
        role: role,
        level: user.level,
      },
    };
  }
  return {
    token,
    user: {
      name: user.name,
      id: user.id,
      username: user.username,
      role: role,
    },
  };
};

const getAllUsers = async (role, filters = {}) => {
  let users;
  // Hapus deklarasi siswaList dan mitraList di sini, akan diambil per case

  switch (role) {
    case "admin":
      users = await Admin.findAll();
      break;
    case "tentor":
      mapels = await Mapel.findAll();
      users = await Tentor.findAll();
      users = users.map((tentor) => {
        return {
          ...tentor.toJSON(),
          mapel: mapels
            .filter((mapel) => tentor.mapel.includes(mapel.id))
            .map((m) => m.name),
          level: JSON.parse(tentor.level),
          schedule: JSON.parse(tentor.schedule)
        };
      });
      break;
    case "mitra":
      const siswasMitra = await Siswa.findAll();
      users = await Mitra.findAll();
      users = users.map((mitra) => {
        return {
          ...mitra.toJSON(),
          siswa: [
            ...siswasMitra
              .filter((siswa) => siswa.mitraId === mitra.id)
              .map((siswa) => ({
                id: siswa.id,
                name: siswa.name,
              })),
          ],
        };
      });
      break;
    case "siswa":
      // FILTERING SISWA BERDASARKAN MITRAID (OPTIONAL)
      const filterOptions = {};
      if (filters.mitraId) {
        filterOptions.where = { mitraId: filters.mitraId };
      }
      const siswaList = await Siswa.findAll(filterOptions);
      const mitraListSiswa = await Mitra.findAll();
      users = siswaList.map((siswa) => {
        const mitra = mitraListSiswa.find((m) => m.id === siswa.mitraId);
        return {
          ...siswa.toJSON(),
          mitraName: mitra ? mitra.name : "-",
        };
      });
      break;
    case "all":
      users = await Promise.all([
        Admin.findAll(),
        Tentor.findAll(),
        Mitra.findAll(),
        Siswa.findAll(),
      ]);
      break;
    default:
      throw new Error("Role tidak valid");
  }

  return users;
};

const getAllTentor = async (level, host) => {
  try {
    const tentors = await Tentor.findAll({
      where: Sequelize.literal(`JSON_CONTAINS(level, '["${level}"]')`),
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

    // Parse JSON fields
    return tentors.map(tentor => {
      const mapelIds = tentor.mapel ? JSON.parse(tentor.mapel) : [];
      const mapelNames = mapels
        .filter(mapel => mapelIds.includes(mapel.id))
        .map(m => ({ id: m.id, name: m.name }));

      return {
      ...tentor,
      level: tentor.level ? JSON.parse(tentor.level) : [],
      mapel: mapelNames,
      schedule: tentor.schedule ? JSON.parse(tentor.schedule) : [],
      };
    });
  } catch (error) {
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
      // Include mapel and level in the tentor object
      mapels = await Mapel.findAll();
      user = await Tentor.findByPk(userId);
      if (user) {
        const userObj = user.toJSON();
        userObj.mapel = mapels
          .filter((mapel) => userObj.mapel.includes(mapel.id))
          .map((m) => m.name);
        userObj.level = userObj.level ? JSON.parse(userObj.level) : [];
        userObj.schedule = userObj.schedule ? JSON.parse(userObj.schedule) : [];
        return userObj;
      }
      break;
    case "mitra":
      user = await Mitra.findByPk(userId);
      if (user) {
        const siswa = await Siswa.findAll({
          where: { mitraId: user.id },
          attributes: ["id", "name"],
        });
        const userObj = user.toJSON();
        userObj.siswa = siswa.map((s) => ({
          id: s.id,
          name: s.name,
        }));
        return userObj;
      }

      break;
    case "siswa":
      user = await Siswa.findByPk(userId);
      if (user) {
        const mitra = await Mitra.findByPk(user.mitraId);
        const userObj = user.toJSON();
        userObj.mitraName = mitra ? mitra.name : "-";
        return userObj;
      }
      break;
    default:
      throw new Error("Role tidak valid");
  }
  if (!user) {
    throw new Error("User tidak ditemukan");
  }
  return user;
};

const updateUser = async (userId, userData, role) => {
  let user;

  switch (role) {
    case "admin":
      user = await Admin.findByPk(userId);
      break;
    case "tentor":
      user = await Tentor.findByPk(userId);
      break;
    case "mitra":
      user = await Mitra.findByPk(userId);
      break;
    case "siswa":
      user = await Siswa.findByPk(userId);
      break;
    default:
      throw new Error("Role tidak valid");
  }

  if (!user) {
    throw new Error("User tidak ditemukan");
  }

  await user.update(userData);

  return user;
};

const deleteUser = async (userId, role) => {
  let user;

  switch (role) {
    case "admin":
      user = await Admin.findByPk(userId);
      break;
    case "tentor":
      user = await Tentor.findByPk(userId);
      break;
    case "mitra":
      user = await Mitra.findByPk(userId);
      break;
    case "siswa":
      user = await Siswa.findByPk(userId);
      break;
    default:
      throw new Error("Role tidak valid");
  }

  if (!user) {
    throw new Error("User tidak ditemukan");
  }

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
