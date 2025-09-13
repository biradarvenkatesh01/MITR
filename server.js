const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configure the Gemini AI
const genAI = new GoogleGenerativeAI("AIzaSyBVgCTwd8TdQsFLrzywIG8dVVtunH4Sn8I");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

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
  spent: Number,
  vendor: String, // Added for transaction search
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }] // Added for community feedback
});
const Budget = mongoose.model('Budget', budgetSchema);

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Comment Schema for community feedback
const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  budget: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget' },
  createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);


// --- API Endpoints ---

// Budget Endpoints
app.get('/api/budget', async (req, res) => {
  try {
    const budgetData = await Budget.find().populate({
      path: 'comments',
      populate: { path: 'user', select: 'username' }
    });
    res.json(budgetData);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Updated expense endpoint with anomaly detection
app.post('/api/expense', async (req, res) => {
  const { department, amount, vendor } = req.body;
  try {
    const departmentToUpdate = await Budget.findOne({ department: department });
    if (!departmentToUpdate) { return res.status(404).json({ message: 'Department not found' }); }
    departmentToUpdate.spent += amount;
    departmentToUpdate.vendor = vendor; // Save the vendor

    // Anomaly Detection Logic
    if (departmentToUpdate.spent > departmentToUpdate.allocated) {
      console.log(`ALERT: Budget overrun in ${department} department!`);
      // Future enhancement: Send a real alert (e.g., email, notification)
    }

    await departmentToUpdate.save();
    res.json(departmentToUpdate);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- Comment Endpoints ---

// Add a new comment to a budget item
app.post('/api/budgets/:budgetId/comments', async (req, res) => {
  const { text, userId } = req.body;
  const { budgetId } = req.params;

  try {
    const budget = await Budget.findById(budgetId);
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    const newComment = new Comment({
      text,
      user: userId,
      budget: budgetId
    });

    await newComment.save();

    budget.comments.push(newComment._id);
    await budget.save();

    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all comments for a budget item
app.get('/api/budgets/:budgetId/comments', async (req, res) => {
  const { budgetId } = req.params;
  try {
    const comments = await Comment.find({ budget: budgetId }).populate('user', 'username');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get('/api/transactions/search', async (req, res) => {
  const { q } = req.query;
  try {
    const results = await Budget.find({
      $or: [
        { department: { $regex: q, $options: 'i' } }, // Case-insensitive search
        { vendor: { $regex: q, $options: 'i' } }
      ]
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



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

// --- Chatbot Endpoint (with AI) ---
app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;

  try {
    // Send the message to the Gemini model
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    // Send the AI's reply back to the frontend
    res.json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing your message with AI.' });
  }
});


async function seedDatabase() {
    try {
        // Clear existing data
        await Budget.deleteMany({});
        await Comment.deleteMany({});
        console.log('Cleared old data.');

        // Find a user to associate the comment with (or create one)
        let testUser = await User.findOne({ email: 'test@example.com' });
        if (!testUser) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            testUser = new User({ username: 'Test User', email: 'test@example.com', password: hashedPassword });
            await testUser.save();
        }

        const sampleBudgets = [
            { department: 'Marketing', allocated: 5000, spent: 2200, vendor: 'Google Ads' },
            { department: 'Engineering', allocated: 8000, spent: 3500, vendor: 'GitHub' },
            { department: 'Sales', allocated: 4000, spent: 1500, vendor: 'Salesforce' },
            { department: 'HR', allocated: 3000, spent: 1000, vendor: 'Workday' }
        ];

        const insertedBudgets = await Budget.insertMany(sampleBudgets);
        console.log('Database seeded with sample budgets.');

        // Add a sample comment to the Marketing budget
        const marketingBudget = insertedBudgets.find(b => b.department === 'Marketing');
        if (marketingBudget) {
            const sampleComment = new Comment({
                text: 'This is a test comment on the marketing budget.',
                user: testUser._id,
                budget: marketingBudget._id
            });
            await sampleComment.save();

            marketingBudget.comments.push(sampleComment._id);
            await marketingBudget.save();
            console.log('Added sample comment.');
        }

    } catch (err) {
        console.error('Error seeding database:', err.message);
    }
}