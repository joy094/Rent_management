// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

// -------- MongoDB Connection --------
if (!process.env.MONGO_URI) {
  console.error('Error: MONGO_URI environment variable is not set.');
  process.exit(1);
}
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// -------- Schemas --------
const tenantSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  room: String,
});

const billSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  type: String, // Rent, Electricity, Gas, Water, Internet, Parking, Security etc
  amount: Number,
  date: Date,
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
});

const Tenant = mongoose.model('Tenant', tenantSchema);
const Bill = mongoose.model('Bill', billSchema);

// -------- Tenant APIs --------
app.post('/tenants', async (req, res) => {
  const tenant = new Tenant(req.body);
  await tenant.save();
  res.json({ message: 'Tenant added', tenant });
});

app.get('/tenants', async (req, res) => {
  const { search, room } = req.query;
  let query = {};
  if (search) query.name = { $regex: search, $options: 'i' };
  if (room) query.room = room;
  const tenants = await Tenant.find(query);
  res.json(tenants);
});

app.put('/tenants/:id', async (req, res) => {
  const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
  res.json({ message: 'Tenant updated', tenant });
});

app.delete('/tenants/:id', async (req, res) => {
  await Tenant.findByIdAndDelete(req.params.id);
  await Bill.deleteMany({ tenantId: req.params.id }); // remove related bills
  res.json({ message: 'Tenant and related bills deleted' });
});

// -------- Bill APIs --------
app.post('/bills', async (req, res) => {
  const bill = new Bill(req.body);
  await bill.save();
  res.json({ message: 'Bill added', bill });
});

app.get('/bills', async (req, res) => {
  const { tenantId, month } = req.query;
  let query = {};
  if (tenantId) query.tenantId = tenantId;
  if (month) {
    const start = new Date(new Date().getFullYear(), month - 1, 1);
    const end = new Date(new Date().getFullYear(), month, 0);
    query.date = { $gte: start, $lte: end };
  }
  const bills = await Bill.find(query).populate('tenantId');
  res.json(bills);
});

app.put('/bills/:id', async (req, res) => {
  const bill = await Bill.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!bill) return res.status(404).json({ message: 'Bill not found' });
  res.json({ message: 'Bill updated', bill });
});

app.delete('/bills/:id', async (req, res) => {
  await Bill.findByIdAndDelete(req.params.id);
  res.json({ message: 'Bill deleted' });
});

// -------- Dashboard --------
app.get('/dashboard', async (req, res) => {
  const tenants = await Tenant.find();
  const dashboard = [];

  for (let t of tenants) {
    const bills = await Bill.find({ tenantId: t._id });
    const pending = bills.filter(b => b.status === 'Pending').reduce((acc, b) => acc + b.amount, 0);
    const paid = bills.filter(b => b.status === 'Paid').reduce((acc, b) => acc + b.amount, 0);
    dashboard.push({ id: t._id, name: t.name, room: t.room, pending, paid });
  }

  const totalPending = dashboard.reduce((acc, d) => acc + d.pending, 0);
  const totalPaid = dashboard.reduce((acc, d) => acc + d.paid, 0);

  res.json({ dashboard, totalPending, totalPaid });
});

// -------- Start Server --------
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
