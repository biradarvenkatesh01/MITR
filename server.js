require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3000;

const dbURI = 'mongodb+srv://finsight:projfin123@finsight-cluster.3qsmiss.mongodb.net/?retryWrites=true&w=majority&appName=finsight-cluster';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  spent: Number,
  vendor: String,
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
});
const Budget = mongoose.model('Budget', budgetSchema);

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  budget: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget' },
  createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// --- API Endpoints ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/api/budget', async (req, res) => {
  try {
    const budgetData = await Budget.find().populate({
      path: 'comments',
      populate: { path: 'user', select: 'username' }
    });
    res.json(budgetData);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Anomaly Detection Endpoint
app.get('/api/anomalies', async (req, res) => {
    try {
        const overspentBudgets = await Budget.find({ $expr: { $gt: ['$spent', '$allocated'] } });
        res.json(overspentBudgets.map(b => `Alert: Budget for ${b.department} has been overspent! Allocated: ${b.allocated}, Spent: ${b.spent}.`));
    } catch (err) {
        res.status(500).json({ message: 'Error fetching anomalies' });
    }
});

// Comment Endpoint
app.post('/api/budgets/:budgetId/comments', async (req, res) => {
  const { text, userId } = req.body;
  const { budgetId } = req.params;
  try {
    const budget = await Budget.findById(budgetId);
    if (!budget) { return res.status(404).json({ message: 'Budget not found' }); }
    const newComment = new Comment({ text, user: userId, budget: budgetId });
    await newComment.save();
    budget.comments.push(newComment._id);
    await budget.save();
    res.status(201).json(newComment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Search Endpoint
app.get('/api/transactions/search', async (req, res) => {
  const { q } = req.query;
  try {
    const results = await Budget.find({
      $or: [
        { department: { $regex: q, $options: 'i' } },
        { vendor: { $regex: q, $options: 'i' } }
      ]
    });
    res.json(results);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Auth Endpoints
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) { return res.status(400).json({ message: 'User already exists' }); }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = new User({ username, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) { return res.status(400).json({ message: 'Invalid credentials' }); }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials' }); }
        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, 'your_jwt_secret_key', { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// Chatbot Endpoint
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
app.post('/api/chatbot', async (req, res) => {
  const { message, context } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const prompt = `Context: You are a helpful budget assistant. Based on the following budget data, answer the user's question. Budget Data: ${JSON.stringify(context)}. Question: "${message}"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    res.json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing your message.' });
  }
});

// Seeder Function
async function seedDatabase() {
    try {
        await Budget.deleteMany({});
        await Comment.deleteMany({});
        await User.deleteMany({ email: 'test@example.com' });
        console.log('Cleared old data.');

        let testUser = await User.findOne({ email: 'test@example.com' });
        if (!testUser) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            testUser = new User({ username: 'Test User', email: 'test@example.com', password: hashedPassword });
            await testUser.save();
        }

        const sampleBudgets = [
            { department: 'Marketing', allocated: 50000, spent: 22000, vendor: 'Google Ads' },
            { department: 'Engineering', allocated: 80000, spent: 35000, vendor: 'GitHub' },
            { department: 'Sales', allocated: 40000, spent: 15000, vendor: 'Salesforce' },
            { department: 'HR', allocated: 30000, spent: 10000, vendor: 'Workday' },
            { department: 'Sports', allocated: 15000, spent: 18000, vendor: 'Nike' } // Overspent for anomaly
        ];
        await Budget.insertMany(sampleBudgets);
        console.log('Database seeded with sample budgets.');
    } catch (err) {
        console.error('Error seeding database:', err.message);
    }
}