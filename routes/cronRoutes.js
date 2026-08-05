const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

/**
 * GET /api/cron/cleanup
 * Vercel Cron Job endpoint to remove completed orders older than 7 days
 */
router.get('/cleanup', async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;
    const customHeader = req.headers['x-cron-secret'];
    const querySecret = req.query.secret;
    const isVercelCron = req.headers['x-vercel-cron'] === '1' || req.headers['user-agent']?.includes('vercel-cron');

    // If CRON_SECRET is configured, enforce security unless invoked directly by Vercel Cron
    if (cronSecret) {
      const token = authHeader ? authHeader.replace('Bearer ', '') : null;
      const isAuthorized =
        token === cronSecret ||
        customHeader === cronSecret ||
        querySecret === cronSecret ||
        isVercelCron;

      if (!isAuthorized) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized cron execution attempt.',
        });
      }
    }

    // Calculate 7 days ago timestamp
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - SEVEN_DAYS_MS);

    // Delete orders marked Completed with completedAt <= cutoffDate
    const result = await Order.deleteMany({
      status: 'Completed',
      completedAt: { $lte: cutoffDate },
    });

    console.log(`[Vercel Cron Cleanup] Deleted ${result.deletedCount} completed orders older than ${cutoffDate.toISOString()}`);

    return res.status(200).json({
      success: true,
      message: `Successfully cleaned up completed orders older than 7 days.`,
      deletedCount: result.deletedCount,
      cutoffDate: cutoffDate.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error executing cron order cleanup:', error);
    return res.status(500).json({
      success: false,
      error: 'Cron job failed to clean up expired orders.',
    });
  }
});

module.exports = router;
