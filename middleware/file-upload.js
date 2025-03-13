const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads/images", // Folder in Cloudinary
    format: async (req, file) => "png", // Convert all uploads to PNG
    public_id: (req, file) => uuidv4(), // Unique ID for each file
  },
});

const fileUpload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  storage: storage,
  fileFilter: (req, file, cb) => {
    const isValid = ["image/png", "image/jpeg", "image/jpg"].includes(file.mimetype);
    cb(isValid ? null : new Error("Invalid mime type!"), isValid);
  },
});

module.exports = fileUpload;
