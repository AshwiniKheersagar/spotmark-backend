const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const crypt = require("mongoose-bcrypt");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  image: { type: String, required: true },
  places: [{ type: mongoose.Types.ObjectId, required: true, ref: "Place" }]
});

UserSchema.plugin(uniqueValidator);
UserSchema.plugin(crypt); // Automatically hashes password

module.exports = mongoose.model("User", UserSchema);
