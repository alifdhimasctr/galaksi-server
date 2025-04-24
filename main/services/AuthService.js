const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Siswa, Tentor, Mitra, Admin } = require("../models");
const { Op } = require("sequelize");

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

const createTentor = async (tentorData) => {
  const {
    name,
    noHp,
    gender,
    address,
    city,
    faculty,
    university,
    schoolLevel,
  } = tentorData;

  const password = process.env.DEFAULT_PASSWORD;
  if (!password) {
    throw new Error("DEFAULT_PASSWORD belum diatur di environment variables");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const username = name ? name.toLowerCase().replace(/\s+/g, "") : null;

  const newTentor = await Tentor.create({
    ...tentorData,
    username,
    password: hashedPassword,
    level: schoolLevel, // mapping di sini
  });

  return newTentor;
};

const createMitra = async (mitraData) => {
  const { name, email, branch, address, city, noHp } = mitraData;

  const password = process.env.DEFAULT_PASSWORD;
  if (!password) {
    throw new Error("DEFAULT_PASSWORD belum diatur di environment variables");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const username = name ? name.toLowerCase().replace(/\s+/g, "") : null;

  const newMitra = await Mitra.create({
    ...mitraData,
    username,
    password: hashedPassword,
  });

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
    schoolLevel, // masih diterima dari frontend
  } = siswaData;

  const password = process.env.DEFAULT_PASSWORD;
  if (!password) {
    throw new Error("DEFAULT_PASSWORD belum diatur di environment variables");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newSiswa = await Siswa.create({
    ...siswaData,
    password: hashedPassword,
    role: "siswa",
    level: schoolLevel, // mapping di sini
  });

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

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: role,
    },
  };
};

const getAllUsers = async (role) => {
  let users;

  switch (role) {
    case "admin":
      users = await Admin.findAll();
      break;
    case "tentor":
      users = await Tentor.findAll();
      break;
    case "mitra":
      users = await Mitra.findAll();
      break;
    case "siswa":
      users = await Siswa.findAll();
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

module.exports = {
  createAdmin,
  createTentor,
  createMitra,
  createSiswa,
  login,
  getAllUsers,
};
