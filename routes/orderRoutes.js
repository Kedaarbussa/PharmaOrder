const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/authMiddleware');

let inMemoryOrders = [];
const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

router.use(authMiddleware);

/**
 * GET /api/orders/reports/daily
 * Group orders by date YYYY-MM-DD with optional startDate and endDate filter
 */
router.get('/reports/daily', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = e;
      }
    }

    let allOrders = [];
    if (isDbConnected()) {
      allOrders = await Order.find(filter).sort({ createdAt: -1 });
    } else {
      allOrders = [...inMemoryOrders];
      if (startDate) {
        allOrders = allOrders.filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) >= startDate);
      }
      if (endDate) {
        allOrders = allOrders.filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) <= endDate);
      }
    }

    const dailyMap = {};

    allOrders.forEach((order) => {
      if (order.status === 'Cancelled') return;

      const dateStr = order.createdAt
        ? new Date(order.createdAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          orderCount: 0,
          advanceCollected: 0,
          totalPrice: 0,
          remainingBalance: 0,
        };
      }

      dailyMap[dateStr].orderCount += 1;
      dailyMap[dateStr].advanceCollected += Number(order.advancePaid) || 0;
      dailyMap[dateStr].totalPrice += Number(order.totalPrice) || 0;
      dailyMap[dateStr].remainingBalance += Number(order.remainingBalance) || 0;
    });

    const dailyReports = Object.values(dailyMap).sort((a, b) => (a.date < b.date ? 1 : -1));

    return res.status(200).json({
      success: true,
      reports: dailyReports,
    });
  } catch (error) {
    console.error('Error fetching daily report:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate daily report.',
    });
  }
});

/**
 * GET /api/orders/export/csv
 */
router.get('/export/csv', async (req, res) => {
  try {
    const { date, status, startDate, endDate } = req.query;
    let orders = [];

    if (isDbConnected()) {
      const filter = {};
      if (status && status !== 'All') filter.status = status;
      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: start, $lte: end };
      } else if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          filter.createdAt.$gte = s;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = e;
        }
      }
      orders = await Order.find(filter).sort({ createdAt: -1 });
    } else {
      orders = [...inMemoryOrders];
      if (status && status !== 'All') {
        orders = orders.filter((o) => o.status === status);
      }
      if (date) {
        orders = orders.filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) === date);
      } else {
        if (startDate) orders = orders.filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) >= startDate);
        if (endDate) orders = orders.filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) <= endDate);
      }
    }

    const headers = [
      'Order ID',
      'Customer Name',
      'Phone Number',
      'Staff Member',
      'Medicine Items & Suppliers',
      'Total Price (₹)',
      'Advance Paid (₹)',
      'Remaining Balance (₹)',
      'Status',
      'Created At',
      'Completed At',
    ];

    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return '""';
      const str = String(field).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [headers.join(',')];

    orders.forEach((order) => {
      let itemsSummary = '';
      if (Array.isArray(order.items) && order.items.length > 0) {
        itemsSummary = order.items
          .map((item) => `${item.medicineName} (x${item.quantity}) - ${item.supplier}`)
          .join('; ');
      } else if (order.medicineName) {
        itemsSummary = `${order.medicineName} (x${order.quantity || 1}) - ${order.supplier || 'N/A'}`;
      }

      const row = [
        escapeCsvField(order._id),
        escapeCsvField(order.customerName),
        escapeCsvField(order.phone),
        escapeCsvField(order.staffMember || 'Admin'),
        escapeCsvField(itemsSummary),
        escapeCsvField(order.totalPrice ? Number(order.totalPrice).toFixed(2) : '0.00'),
        escapeCsvField(order.advancePaid ? Number(order.advancePaid).toFixed(2) : '0.00'),
        escapeCsvField(order.remainingBalance ? Number(order.remainingBalance).toFixed(2) : '0.00'),
        escapeCsvField(order.status),
        escapeCsvField(order.createdAt ? new Date(order.createdAt).toISOString() : ''),
        escapeCsvField(order.completedAt ? new Date(order.completedAt).toISOString() : ''),
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\r\n');
    const filename = `PharmaOrders_Daily_Report_${date || startDate || 'All'}_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error generating CSV export:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate CSV export.',
    });
  }
});

/**
 * GET /api/orders
 * Returns all active orders across all connected systems
 */
router.get('/', async (req, res) => {
  try {
    const { search, status, date } = req.query;
    let orders = [];

    if (isDbConnected()) {
      const filter = {};
      if (status && status !== 'All') filter.status = status;

      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: start, $lte: end };
      }

      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [
          { customerName: searchRegex },
          { phone: searchRegex },
          { staffMember: searchRegex },
          { medicineName: searchRegex },
          { supplier: searchRegex },
          { 'items.medicineName': searchRegex },
          { 'items.supplier': searchRegex },
        ];
      }
      orders = await Order.find(filter).sort({ createdAt: -1 });
    } else {
      orders = [...inMemoryOrders];
      if (status && status !== 'All') {
        orders = orders.filter((o) => o.status === status);
      }
      if (date) {
        orders = orders.filter((o) => {
          const dStr = new Date(o.createdAt).toISOString().slice(0, 10);
          return dStr === date;
        });
      }
      if (search && search.trim() !== '') {
        const query = search.trim().toLowerCase();
        orders = orders.filter(
          (o) =>
            (o.customerName && o.customerName.toLowerCase().includes(query)) ||
            (o.phone && o.phone.toLowerCase().includes(query)) ||
            (o.staffMember && o.staffMember.toLowerCase().includes(query)) ||
            (o.items && o.items.some((i) => (i.medicineName && i.medicineName.toLowerCase().includes(query)) || (i.supplier && i.supplier.toLowerCase().includes(query)))) ||
            (o.medicineName && o.medicineName.toLowerCase().includes(query)) ||
            (o.supplier && o.supplier.toLowerCase().includes(query))
        );
      }
    }

    // Filtered orders for summary math
    let totalOrders = orders.length;
    let pendingOrders = 0;
    let readyOrders = 0;
    let completedOrders = 0;
    let advanceCollected = 0;
    let outstandingPayments = 0;

    orders.forEach((ord) => {
      if (ord.status === 'Completed') {
        completedOrders++;
      } else if (ord.status === 'Ready for Pickup') {
        readyOrders++;
      } else if (ord.status !== 'Cancelled') {
        pendingOrders++;
      }

      if (ord.status !== 'Cancelled') {
        advanceCollected += Number(ord.advancePaid) || 0;
      }

      if (ord.remainingBalance > 0 && ord.status !== 'Cancelled') {
        outstandingPayments += ord.remainingBalance;
      }
    });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
      summary: {
        totalOrders,
        pendingOrders,
        readyOrders,
        completedOrders,
        advanceCollected: parseFloat(advanceCollected.toFixed(2)),
        outstandingPayments: parseFloat(outstandingPayments.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve orders.',
    });
  }
});

/**
 * POST /api/orders
 */
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      phone,
      staffMember,
      items,
      totalPrice,
      advancePaid,
      status,
      medicineName,
      quantity,
      supplier,
    } = req.body;

    if (!customerName || !phone || !staffMember) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in Customer Name, Phone Number, and Staff Member.',
      });
    }

    let itemsList = [];
    if (Array.isArray(items) && items.length > 0) {
      itemsList = items.map((item) => ({
        medicineName: item.medicineName ? String(item.medicineName).trim() : '',
        quantity: Number(item.quantity) || 1,
        supplier: item.supplier ? String(item.supplier).trim() : '',
      }));
    } else if (medicineName && supplier) {
      itemsList = [
        {
          medicineName: String(medicineName).trim(),
          quantity: Number(quantity) || 1,
          supplier: String(supplier).trim(),
        },
      ];
    }

    if (itemsList.length === 0 || itemsList.some((i) => !i.medicineName || !i.supplier || i.quantity < 1)) {
      return res.status(400).json({
        success: false,
        error: 'Each medicine item must have a valid Medicine Name, Quantity (min 1), and Wholesale Supplier.',
      });
    }

    const total = totalPrice !== undefined && totalPrice !== '' && !isNaN(totalPrice) ? Number(totalPrice) : 0;
    const advance = advancePaid !== undefined && advancePaid !== '' && !isNaN(advancePaid) ? Number(advancePaid) : 0;
    const remaining = Math.max(0, total - advance);

    let newOrder;
    if (isDbConnected()) {
      newOrder = new Order({
        customerName,
        phone,
        staffMember,
        items: itemsList,
        medicineName: itemsList[0].medicineName,
        quantity: itemsList[0].quantity,
        supplier: itemsList[0].supplier,
        totalPrice: total,
        advancePaid: advance,
        isSettled: remaining === 0 && total > 0,
        status: status || 'Requested',
        userId: req.user.id || 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await newOrder.save();
    } else {
      newOrder = {
        _id: 'ord_' + Date.now(),
        customerName,
        phone,
        staffMember,
        items: itemsList,
        medicineName: itemsList[0].medicineName,
        quantity: itemsList[0].quantity,
        supplier: itemsList[0].supplier,
        totalPrice: total,
        advancePaid: advance,
        isSettled: remaining === 0 && total > 0,
        remainingBalance: remaining,
        status: status || 'Requested',
        userId: req.user.id || 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: status === 'Completed' ? new Date() : null,
      };
      inMemoryOrders.unshift(newOrder);
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order: newOrder,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order.',
    });
  }
});

/**
 * PUT /api/orders/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const {
      customerName,
      phone,
      staffMember,
      items,
      totalPrice,
      advancePaid,
      status,
    } = req.body;

    let order;
    if (isDbConnected()) {
      order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }
      if (customerName !== undefined) order.customerName = customerName;
      if (phone !== undefined) order.phone = phone;
      if (staffMember !== undefined) order.staffMember = staffMember;
      if (Array.isArray(items) && items.length > 0) {
        order.items = items.map((item) => ({
          medicineName: String(item.medicineName).trim(),
          quantity: Number(item.quantity) || 1,
          supplier: String(item.supplier).trim(),
        }));
        order.medicineName = order.items[0].medicineName;
        order.quantity = order.items[0].quantity;
        order.supplier = order.items[0].supplier;
      }
      if (totalPrice !== undefined) order.totalPrice = totalPrice !== '' ? Number(totalPrice) : 0;
      if (advancePaid !== undefined) order.advancePaid = advancePaid !== '' ? Number(advancePaid) : 0;
      if (status !== undefined) order.status = status;
      await order.save();
    } else {
      const idx = inMemoryOrders.findIndex((o) => String(o._id) === String(orderId));
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }
      order = inMemoryOrders[idx];
      if (customerName !== undefined) order.customerName = customerName;
      if (phone !== undefined) order.phone = phone;
      if (staffMember !== undefined) order.staffMember = staffMember;
      if (Array.isArray(items) && items.length > 0) {
        order.items = items.map((item) => ({
          medicineName: String(item.medicineName).trim(),
          quantity: Number(item.quantity) || 1,
          supplier: String(item.supplier).trim(),
        }));
        order.medicineName = order.items[0].medicineName;
        order.quantity = order.items[0].quantity;
        order.supplier = order.items[0].supplier;
      }
      if (totalPrice !== undefined) order.totalPrice = totalPrice !== '' ? Number(totalPrice) : 0;
      if (advancePaid !== undefined) order.advancePaid = advancePaid !== '' ? Number(advancePaid) : 0;
      if (status !== undefined) order.status = status;

      if (!order.isSettled) {
        order.remainingBalance = Math.max(0, (order.totalPrice || 0) - (order.advancePaid || 0));
      }
      order.updatedAt = new Date();
      if (order.status === 'Completed') {
        if (!order.completedAt) order.completedAt = new Date();
      } else {
        order.completedAt = null;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Order updated successfully.',
      order,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update order.',
    });
  }
});

/**
 * POST /api/orders/:id/settle
 */
router.post('/:id/settle', async (req, res) => {
  try {
    const orderId = req.params.id;
    let order;

    if (isDbConnected()) {
      order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
      order.isSettled = true;
      order.remainingBalance = 0;
      await order.save();
    } else {
      const idx = inMemoryOrders.findIndex((o) => String(o._id) === String(orderId));
      if (idx === -1) return res.status(404).json({ success: false, error: 'Order not found.' });
      order = inMemoryOrders[idx];
      order.isSettled = true;
      order.remainingBalance = 0;
      order.updatedAt = new Date();
    }

    return res.status(200).json({
      success: true,
      message: 'Payment cleared successfully.',
      order,
    });
  } catch (error) {
    console.error('Error settling payment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to settle payment for order.',
    });
  }
});

/**
 * DELETE /api/orders/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;

    if (isDbConnected()) {
      const order = await Order.findByIdAndDelete(orderId);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    } else {
      const idx = inMemoryOrders.findIndex((o) => String(o._id) === String(orderId));
      if (idx === -1) return res.status(404).json({ success: false, error: 'Order not found.' });
      inMemoryOrders.splice(idx, 1);
    }

    return res.status(200).json({
      success: true,
      message: 'Order deleted successfully.',
      id: orderId,
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete order.',
    });
  }
});

module.exports = router;
