const express = require('express');
const path = require('path');
require('dotenv').config();

const app = require('./api/index');

// Serve static frontend assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all fallback to serve SPA index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` PharmaOrder Server is running locally!`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==================================================`);
});
