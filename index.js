const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

const db = require("./database/db");

const {
  Admin,
  Siswa,
  Tentor,
  Paket,
  Order,
  Mitra,
  Jadwal,
  Honor,
  Invoice,
  Proshare,
  Subscription,
} = require("./main/models");

const app = express();
dotenv.config();
app.use(bodyParser.json());

const AuthController = require("./main/controllers/AuthController");
const PaketController = require("./main/controllers/PaketController");
const MapelController = require("./main/controllers/MapelController");
const OrderController = require("./main/controllers/OrderController");
const InvoiceController = require("./main/controllers/InvoiceController");
const JadwalController = require("./main/controllers/JadwalController");
const SubscriptionController = require("./main/controllers/SubscriptionController");
const PaymentController = require("./main/controllers/PaymentController");
const DashboardController = require("./main/controllers/DashboardController");
const HonorController = require("./main/controllers/honorController");
const ProshareController = require("./main/controllers/proshareController");
const TransacttionController = require("./main/controllers/TransactionController");

const path = require("path");

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// db.sync({ force: true }).then(() => {
//     console.log('Database & tables created!');
// }
// ).catch((error) => {
//     console.error('Error creating database & tables:', error);
// });

app.use(
  cors({
    origin: "*",
  })
);

app.use("/", AuthController);
app.use("/", PaketController);
app.use("/", MapelController);
app.use("/", OrderController);
app.use("/", InvoiceController);
app.use("/", JadwalController);
app.use("/", SubscriptionController);
app.use("/", PaymentController);
app.use("/", DashboardController);
app.use("/", HonorController);
app.use("/", ProshareController);
app.use("/", TransacttionController);

// Serve static files from the "uploads" directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Order.sync({ force: true })
//   .then(() => {
//     console.log("Order table created!");
//   })
//   .catch((error) => {
//     console.error("Error creating Order table:", error);
//   });

// Invoice.sync({ force: true })
//   .then(() => {
//     console.log("Invoice table created!");
//   })
//   .catch((error) => {
//     console.error("Error creating Invoice table:", error);
//   });

// Jadwal.sync({ force: true })
//   .then(() => {
//     console.log("Jadwal table created!");
//   })
//   .catch((error) => {
//     console.error("Error creating Jadwal table:", error);
//   });

// Subscription.sync({ force: true })
//   .then(() => {
//     console.log("Subscription table created!");
//   })
//   .catch((error) => {
//     console.error("Error creating Subscription table:", error);
//   });

// Honor.sync({ force: true })
//   .then(() => {
//     console.log("Honor table created!");
//   })
//   .catch((error) => {
//     console.error("Error creating Honor table:", error);
//   });

// Proshare.sync({ force: true })
//   .then(() => {
//     console.log("Proshare table created!");
//   })
//   .catch((error) => {
//     console.error("Error creating Proshare table:", error);
//   });
