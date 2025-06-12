//services.subscriptionService.js

const { options } = require('../controllers/AuthController');
const {Subscription} = require('../models');

const createSubscription = async ({siswaId, paketId, tentorId, remainingSessions}, options = {}) => {
    try {
        const subscription = await Subscription.create({
        siswaId,
        paketId,
        tentorId,
        remainingSessions,
        },
        options    
    );
        return subscription;
    } catch (error) {
        throw new Error(`Error saat membuat subscription: ${error.message}`);
    }
}

const getAllSubscriptions = async () => {
    try {
        const subscriptions = await Subscription.findAll();
        return subscriptions;
    } catch (error) {
        throw new Error(`Error saat mengambil semua subscription: ${error.message}`);
    }
}

const getSubscriptionById = async (id) => {
    try {
        const subscription = await Subscription.findByPk(id);
        if (!subscription) throw new Error("Subscription tidak ditemukan");
        return subscription;
    } catch (error) {
        throw new Error(`Error saat mengambil subscription: ${error.message}`);
    }
}


module.exports = {
    createSubscription,
    getAllSubscriptions,
    getSubscriptionById,
};
