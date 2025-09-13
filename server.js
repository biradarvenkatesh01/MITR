const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

const dbURI = 'mongodb+srv://finsight:projfin123@finsight-cluster.3qsmiss.mongodb.net/?retryWrites=true&w=majority&appName=finsight-cluster'; // Make sure your connection string is here

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(dbURI)
  .then(() => {
    console.log('MongoDB Connected...');
    app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
    seedDatabase();
  })
  .catch(err => console.log(err));

// --- Data Models ---
const budgetSchema = new mongoose.Schema({
  department: String,
  allocated: Number,
  spent: Number
});
const Budget = mongoose.model('Budget', budgetSchema);

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);


// --- API Endpoints ---

// Budget Endpoints
app.get('/api/budget', async (req, res) => {
  try {
    const budgetData = await Budget.find();
    res.json(budgetData);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/expense', async (req, res) => {
  const { department, amount } = req.body;
  try {
    const departmentToUpdate = await Budget.findOne({ department: department });
    if (!departmentToUpdate) { return res.status(404).json({ message: 'Department not found' }); }
    departmentToUpdate.spent += amount;
    await departmentToUpdate.save();
    res.json(departmentToUpdate);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Auth Endpoints
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = new User({ username, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, 'your_jwt_secret_key', { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});


// Seeder Function
async function seedDatabase() {
    // ... Seeder function remains unchanged
}
