const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'Requested',
  'Ordered from Wholesaler',
  'Received at Store',
  'Ready for Pickup',
  'Completed',
  'Cancelled',
];

const itemSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    supplier: {
      type: String,
      required: [true, 'Wholesale supplier is required'],
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    staffMember: {
      type: String,
      required: [true, 'Staff member is required'],
      trim: true,
      default: 'Admin',
    },
    items: {
      type: [itemSchema],
      required: true,
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        'At least one medicine item is required',
      ],
    },
    // Single medicine fields kept for backward compatibility
    medicineName: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
    },
    supplier: {
      type: String,
      trim: true,
    },
    totalPrice: {
      type: Number,
      default: 0,
      min: [0, 'Total price cannot be negative'],
    },
    advancePaid: {
      type: Number,
      default: 0,
      min: [0, 'Advance paid cannot be negative'],
    },
    isSettled: {
      type: Boolean,
      default: false,
    },
    remainingBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'Requested',
    },
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
  }
);

// Pre-save middleware to synchronize items array and calculate balance
orderSchema.pre('save', function (next) {
  this.updatedAt = new Date();

  // If single medicine properties exist, ensure items array is populated
  if ((!this.items || this.items.length === 0) && this.medicineName) {
    this.items = [
      {
        medicineName: this.medicineName,
        quantity: this.quantity || 1,
        supplier: this.supplier || 'N/A',
      },
    ];
  } else if (this.items && this.items.length > 0) {
    // Populate legacy single fields with first item for backwards compatibility
    this.medicineName = this.items[0].medicineName;
    this.quantity = this.items[0].quantity;
    this.supplier = this.items[0].supplier;
  }
  
  // Calculate remaining balance based on settlement status
  if (this.isSettled) {
    this.remainingBalance = 0;
  } else {
    const total = Number(this.totalPrice) || 0;
    const advance = Number(this.advancePaid) || 0;
    this.remainingBalance = Math.max(0, total - advance);
  }

  // Manage completedAt timestamp
  if (this.status === 'Completed') {
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  } else {
    this.completedAt = null;
  }

  next();
});

// TTL Index for automatic MongoDB deletion 7 days (604800 seconds) after completedAt
orderSchema.index(
  { completedAt: 1 },
  { 
    expireAfterSeconds: 604800,
    partialFilterExpression: { completedAt: { $type: 'date' } }
  }
);

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
