const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  if (!fs.existsSync(DATA_FILE)) return [];

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return raw.trim() ? JSON.parse(raw) : [];
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function withStatus(item) {
  return { ...item, status: item.quantity > 0 ? 'AVAILABLE' : 'OUT OF STOCK' };
}

app.get('/api/equipment', (req, res) => {
  try {
    const data = readData();
    res.status(200).json(data.map(withStatus));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data file.' });
  }
});

app.get('/api/equipment/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID must be an integer.' });
    }
    const item = readData().find((e) => e.id === id);
    if (!item) {
      return res.status(404).json({ error: `Equipment with id ${id} not found.` });
    }
    res.status(200).json(withStatus(item));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data file.' });
  }
});

app.post('/api/equipment', (req, res) => {
  try {
    const { name, category, quantity, condition } = req.body || {};

    if (
      typeof name !== 'string' || !name.trim() ||
      typeof category !== 'string' || !category.trim() ||
      typeof condition !== 'string' || !condition.trim() ||
      quantity === undefined || quantity === null || quantity === ''
    ) {
      return res.status(400).json({
        error: 'name, category, quantity and condition are required.',
      });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty)) {
      return res.status(400).json({ error: 'quantity must be a whole number.' });
    }
    if (qty < 0) {
      return res.status(400).json({ error: 'quantity cannot be negative.' });
    }

    const data = readData();
    const nextId = data.length ? Math.max(...data.map((e) => e.id)) + 1 : 1;

    const newItem = {
      id: nextId,
      name: name.trim(),
      category: category.trim(),
      quantity: qty,
      condition: condition.trim(),
    };

    data.push(newItem);
    writeData(data);

    res.status(201).json(withStatus(newItem));
  } catch (err) {
    res.status(500).json({ error: 'Failed to write data file.' });
  }
});

app.delete('/api/equipment/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID must be an integer.' });
    }

    const data = readData();
    const index = data.findIndex((e) => e.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Equipment with id ${id} not found.` });
    }

    if (data[index].quantity > 0) {
      return res.status(409).json({
        error: 'Cannot delete equipment with quantity greater than 0.',
      });
    }

    const [removed] = data.splice(index, 1);
    writeData(data);

    res.status(200).json({ message: 'Equipment deleted successfully.', deleted: withStatus(removed) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write data file.' });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.listen(PORT, () => {
  console.log(`Laboratory Equipment API running at http://localhost:${PORT}`);
});
