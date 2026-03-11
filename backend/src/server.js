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
// Increase the limit to 10MB to accommodate images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api", paymentsRoutes);
app.use("/api/reports", reportsRoutes);

app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));

const port = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => {
    console.error("Failed to connect MongoDB:", err.message);
    process.exit(1);
  });

app.use((req, res) => {
  const pathToLogin = path.join(__dirname, "..", "public", "pages", "login.html");
  
  console.log("Looking for file at:", pathToLogin);
  res.sendFile(pathToLogin);
});