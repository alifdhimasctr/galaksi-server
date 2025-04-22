const { request } = require('express');
const sequelize  = require('sequelize');

const db = new sequelize('galaksi', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    dialectOptions: {
        dateStrings: true,
        typeCast(field, next) {
            if (field.type === 'DATE') {
                return field.string();
            }
            return next();
        }
    },
    timezone: '+07:00', // Set timezone to UTC+7
});



// Fungsi untuk menguji koneksi
const testConnection = async () => {
    db.authenticate()
        .then(() => {
            console.log('Koneksi ke database berhasil.');
        })
        .catch(err => {
            console.error('Tidak dapat terhubung ke database:', err.message);
        });
};

testConnection();

module.exports = db;