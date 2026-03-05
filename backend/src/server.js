const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const productsRoutes = require("./routes/products.routes");
const salesRoutes = require("./routes/sales.routes");
const paymentsRoutes = require("./routes/payments.routes");
const reportsRoutes = require("./routes/reports.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api", paymentsRoutes);
app.use("/api/reports", reportsRoutes);

app.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`API running on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("Failed to connect MongoDB:", err.message);
    process.exit(1);
  });

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages/login.html"));
});