//services/invoiceService.js
const { get } = require('../controllers/AuthController');
const {Invoice} = require('../models');

const createInvoice = async ({orderId, subscriptionId, paketId},options = {}) => {
    try {
        const invoice = await Invoice.create({
            orderId,
            subscriptionId,
            paketId,
        },
        options    
    );
        return invoice;
    } catch (error) {
        throw new Error(`Error saat membuat invoice: ${error.message}`);
    }
}

const getAllInvoices = async () => {
    try {
        const invoices = await Invoice.findAll();
        return invoices;
    } catch (error) {
        throw new Error(`Error saat mengambil semua invoice: ${error.message}`);
    }
}



module.exports = {
    createInvoice,
    getAllInvoices,
};