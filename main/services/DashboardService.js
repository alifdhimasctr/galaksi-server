const { Op } = require("sequelize");
const { Siswa, Tentor, Order, Mitra, Invoice, Honor, Proshare } = require("../models");


const getADminDashboard = async () => {
    const siswaCount = await Siswa.count();
    const siswaActiveCount = await Siswa.count({ where: { status: 'active' } });
    const siswaNonActiveCount = await Siswa.count({ where: { status: 'nonactive' } });
    const tentorCount = await Tentor.count();
    const tentorActiveCount = await Tentor.count({ where: { status: 'active' } });
    const tentorNonActiveCount = await Tentor.count({ where: { status: 'nonactive' } });
    const mitraCount = await Mitra.count();
    const mitraActiveCount = await Mitra.count({ where: { status: 'active' } });
    const mitraNonActiveCount = await Mitra.count({ where: { status: 'nonactive' } });
    const incomeTotal = await Invoice.sum('price', {
        where: {
            paymentStatus: 'Paid',
            paymentDate: {
                [Op.between]: [
                    new Date(new Date().setHours(0, 0, 0, 0)),
                    new Date(new Date().setHours(23, 59, 59, 999))
                ]
            }
        }
    });
    const honorTotal = await Honor.sum('total',{
        where: {
            paymentStatus: 'Paid',
            paymentDate: {
                [Op.between]: [
                    new Date(new Date().setHours(0, 0, 0, 0)),
                    new Date(new Date().setHours(23, 59, 59, 999))
                ]
            }
        }
    })

    const proshareTotal = await Proshare.sum('total', {
        where: {
            paymentStatus: 'Paid',
            paymentDate: {
                [Op.between]: [
                    new Date(new Date().setHours(0, 0, 0, 0)),
                    new Date(new Date().setHours(23, 59, 59, 999))
                ]
            }
        }
    });

    const expensesTotal = honorTotal + proshareTotal;

    const netIncome= incomeTotal - expensesTotal;


    return {
        siswaCount,
        siswaActiveCount,
        siswaNonActiveCount,
        tentorCount,
        tentorActiveCount,
        tentorNonActiveCount,
        mitraCount,
        mitraActiveCount,
        mitraNonActiveCount,
        incomeTotal,
        expensesTotal,
        netIncome

    };
}


module.exports = {
    getADminDashboard
};

     