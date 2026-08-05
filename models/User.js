const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      default: 'admin',
      trim: true,
    },
    email: {
      type: String,
      default: 'admin@pharmacy.com',
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: 'admin123',
    },
    name: {
      type: String,
      default: 'Pharmacy Admin',
      trim: true,
    },
    picture: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
