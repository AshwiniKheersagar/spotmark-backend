const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const app = express();
const PORT = process.env.PORT || 5000; 

// ✅ Enable CORS for frontend
app.use(cors({
  origin: '*',
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"]
}));

app.use(bodyParser.json());

// ✅ Serve static images from the uploads folder
app.use('/uploads/images', express.static(path.join(__dirname, 'uploads', 'images')));


app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);

// ✅ Handle 404 Errors
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

// ✅ Global Error Handling Middleware
app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Local file deletion error:", err);
    });
  }
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File size too large!" });
  }

  if (res.headerSent) {
    return next(error);
  }
  
  res.status(error.code || 500).json({ message: error.message || "An unknown error occurred" });
});

// ✅ Connect to MongoDB and Start Server
mongoose.connect(process.env.URL)
  .then(() => {
    console.log("✅ Connected to MongoDB");

    // ✅ Ensure Express listens on Render's assigned port
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
  });

module.exports = app; // ✅ Export app for Vercel if needed
