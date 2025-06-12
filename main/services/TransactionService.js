const db = require('../../database/db');
const { Invoice, Honor, Proshare, Siswa, Mitra, Tentor} = require('../models');
const { Op } = require('sequelize');

const getIncomeTransactions = async (startDate, endDate) => {
  try {
    const income = await Invoice.findAll({
      where: {
        paymentStatus: 'Paid',
        paymentDate: {
          [Op.between]: [startDate, endDate]
        }
      },

    });
    const siswas = await Promise.all(
      income.map(async (invoice) => {
        const siswa = await Siswa.findByPk(invoice.siswaId);
        return siswa ? siswa.get({ plain: true }) : null;
      })
    );
    const mitras = await Promise.all(
      siswas.map(async (siswa) => {
        if (siswa && siswa.mitraId) {
          const mitra = await Mitra.findByPk(siswa.mitraId);
          return mitra ? mitra.get({ plain: true }) : null;
        }
        return null;
      })
    );
    const totalIncome = income.reduce((sum, invoice) => sum + invoice.price, 0);

    const incomeWithDetails = income.map((invoice, index) => {
      return {
        ...invoice.get({ plain: true }),
        siswa:{
            id: siswas[index] ? siswas[index].id : null,
            name: siswas[index] ? siswas[index].name : null,
            level: siswas[index] ? siswas[index].level : null,
            mitraId: siswas[index] ? siswas[index].mitraId : null
        },
        mitra: mitras[index] ? {
          id: mitras[index].id,
          name: mitras[index].name
        } : null,
        
        
      };
    }
    );
    return {
        transactions: incomeWithDetails,
        total: totalIncome
    }
  } catch (error) {
    throw new Error(`Error fetching income transactions: ${error.message}`);
  }
};

const getExpenseTransactions = async (startDate, endDate) => {
  try {
    const [honor, proshare] = await Promise.all([
      Honor.findAll({
        where: {
          paymentStatus: 'Paid',
          updatedAt: {
            [Op.between]: [startDate, endDate]
          }
        },

      }),
      Proshare.findAll({
        where: {
          paymentStatus: 'Paid',
          paymentDate: {
            [Op.between]: [startDate, endDate]
          }
        },
      })
    ]);

    const honorWithDetails = await Promise.all(
      honor.map(async (h) => {
        const siswa = await Siswa.findByPk(h.siswaId);
        const tentor = await Tentor.findByPk(h.tentorId);
        return {
          ...h.get({ plain: true }),
          siswa: {
            id: siswa ? siswa.id : null,
            name: siswa ? siswa.name : null,
            level: siswa ? siswa.level : null,
            mitraId: siswa ? siswa.mitraId : null
          },
            tentor: {
                id: tentor ? tentor.id : null,
                name: tentor ? tentor.name : null
            },
        };
      })
    );

    const proshareWithDetails = await Promise.all(
        proshare.map(async (p) => {
            const siswa = await Siswa.findByPk(p.siswaId);
            const mitra = siswa ? await Mitra.findByPk(siswa.mitraId) : null;
            return {
            ...p.get({ plain: true }),
            siswa: {
                id: siswa ? siswa.id : null,
                name: siswa ? siswa.name : null,
                level: siswa ? siswa.level : null,
                mitraId: siswa ? siswa.mitraId : null
            },
            mitra: {
                id: mitra ? mitra.id : null,
                name: mitra ? mitra.name : null
            }
            };
        })
    );
    const totalHonor = honorWithDetails.reduce((sum, item) => sum + item.total, 0);
    const totalProshare = proshareWithDetails.reduce((sum, item) => sum + item.total, 0);

    return {
      honor: honorWithDetails,
      proshare: proshareWithDetails,
      totalHonor,
      totalProshare
    };
  } catch (error) {
    throw new Error(`Error fetching expense transactions: ${error.message}`);
  }
};

const getTransactionSummary = async (startDate, endDate) => {
  try {
    const [income, expenses] = await Promise.all([
      getIncomeTransactions(startDate, endDate),
      getExpenseTransactions(startDate, endDate)
    ]);

    const { honor, proshare } = expenses;

    const totalIncome = income.transactions.reduce((sum, item) => sum + item.price, 0);
    const totalHonor = honor.reduce((sum, item) => sum + item.total, 0);
    const totalProshare = proshare.reduce((sum, item) => sum + item.total, 0);
    const totalExpense = totalHonor + totalProshare;
    const netIncome = totalIncome - totalExpense;

    // Transform honor untuk menambahkan paymentDate dari updatedAt
    const transformedHonor = honor.map(h => ({
        ...h,
        paymentDate: h.updatedAt
    }));

    return {
      income: {
        transactions: income.transactions,
        total: totalIncome
      },
      expenses: {
        honor: {
          transactions: transformedHonor,
          total: totalHonor
        },
        proshare: {
          transactions: proshare,
          total: totalProshare
        },
        total: totalExpense
      },
      netIncome
    };
  } catch (error) {
    throw new Error(`Error generating transaction summary: ${error.message}`);
  }
};

module.exports = {
  getIncomeTransactions,
  getExpenseTransactions,
  getTransactionSummary
};