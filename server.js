const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8000;

app.use(express.static(path.join(__dirname, 'src')));

app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
