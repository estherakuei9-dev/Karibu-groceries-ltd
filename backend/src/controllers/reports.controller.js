const { Sale } = require("../models/Sale");
const { Product } = require("../models/Product");

function buildDateFilter(from, to) {
  if (!from && !to) return null;

  const createdAt = {};
  if (from) createdAt.$gte = new Date(from);
  if (to) createdAt.$lte = new Date(to);

  return { createdAt };
}

// GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
async function salesSummary(req, res) {
  try {
    const { from, to } = req.query;

    const match = buildDateFilter(from, to) || {};

    const results = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          salesCount: { $sum: 1 },
          totalSales: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$amountPaid" },
          totalBalance: { $sum: "$balance" },

          cashSales: {
            $sum: {
              $cond: [{ $eq: ["$saleType", "cash"] }, "$totalAmount", 0],
            },
          },
          creditSales: {
            $sum: {
              $cond: [{ $eq: ["$saleType", "credit"] }, "$totalAmount", 0],
            },
          },
        },
      },
    ]);

    const summary =
      results[0] || {
        salesCount: 0,
        totalSales: 0,
        totalPaid: 0,
        totalBalance: 0,
        cashSales: 0,
        creditSales: 0,
      };

    return res.json({
      range: { from: from || null, to: to || null },
      summary,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/reports/stock
async function stockReport(req, res) {
  try {
    const products = await Product.find().sort({ name: 1 });

    const totals = products.reduce(
      (acc, p) => {
        acc.items += 1;
        acc.totalStockQty += Number(p.stockQty || 0);
        return acc;
      },
      { items: 0, totalStockQty: 0 }
    );

    return res.json({ totals, products });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/reports/sales-by-agent?from=YYYY-MM-DD&to=YYYY-MM-DD
async function salesByAgent(req, res) {
  try {
    const { from, to } = req.query;

    const match = buildDateFilter(from, to) || {};

    const rows = await Sale.aggregate([
      { $match: match },

      // group by agent (soldBy.userId + username)
      {
        $group: {
          _id: { userId: "$soldBy.userId", username: "$soldBy.username" },

          salesCount: { $sum: 1 },
          totalSales: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$amountPaid" },
          totalBalance: { $sum: "$balance" },

          cashSales: {
            $sum: { $cond: [{ $eq: ["$saleType", "cash"] }, "$totalAmount", 0] },
          },
          creditSales: {
            $sum: { $cond: [{ $eq: ["$saleType", "credit"] }, "$totalAmount", 0] },
          },

          cashCount: {
            $sum: { $cond: [{ $eq: ["$saleType", "cash"] }, 1, 0] },
          },
          creditCount: {
            $sum: { $cond: [{ $eq: ["$saleType", "credit"] }, 1, 0] },
          },
        },
      },

      // shape response
      {
        $project: {
          _id: 0,
          userId: "$_id.userId",
          username: "$_id.username",
          salesCount: 1,
          totalSales: 1,
          totalPaid: 1,
          totalBalance: 1,
          cashSales: 1,
          creditSales: 1,
          cashCount: 1,
          creditCount: 1,
        },
      },

      // sort biggest sellers first
      { $sort: { totalSales: -1, salesCount: -1 } },
    ]);

    // grand totals (optional but useful)
    const totals = rows.reduce(
      (acc, r) => {
        acc.salesCount += r.salesCount;
        acc.totalSales += r.totalSales;
        acc.totalPaid += r.totalPaid;
        acc.totalBalance += r.totalBalance;
        acc.cashSales += r.cashSales;
        acc.creditSales += r.creditSales;
        acc.cashCount += r.cashCount;
        acc.creditCount += r.creditCount;
        return acc;
      },
      {
        salesCount: 0,
        totalSales: 0,
        totalPaid: 0,
        totalBalance: 0,
        cashSales: 0,
        creditSales: 0,
        cashCount: 0,
        creditCount: 0,
      }
    );

    return res.json({
      range: { from: from || null, to: to || null },
      totals,
      agents: rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { salesSummary, stockReport, salesByAgent };
