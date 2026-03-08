const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // __dirname is .../backend/src/middlewares
    // We go up two levels to reach 'backend/' then into 'public/uploads'
    const uploadPath = path.resolve(__dirname, "../../public/uploads");
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
});

module.exports = upload;