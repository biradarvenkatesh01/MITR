const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
<<<<<<< Updated upstream
=======
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configure the Gemini AI
const genAI = new GoogleGenerativeAI("AIzaSyBVgCTwd8TdQsFLrzywIG8dVVtunH4Sn8I");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
>>>>>>> Stashed changes

const app = express();
const PORT = 3000;

const dbURI = 'mongodb+srv://finsight:projfin123@finsight-cluster.3qsmiss.mongodb.net/?retryWrites=true&w=majority&appName=finsight-cluster'; // Make sure your connection string is here

// Middleware
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// Database Connection
mongoose.connect(dbURI)
  .then(() => {
    console.log('MongoDB Connected...');
    app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
    seedDatabase();
  })
  .catch(err => console.log(err));

// Data Structure (Schema) & Model
const budgetSchema = new mongoose.Schema({
  department: String,
  allocated: Number,
  spent: Number
});
const Budget = mongoose.model('Budget', budgetSchema);

// API Endpoints
app.get('/api/budget', async (req, res) => {
  try {
    const budgetData = await Budget.find();
    res.json(budgetData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/expense', async (req, res) => {
  const { department, amount } = req.body;
  try {
    const departmentToUpdate = await Budget.findOne({ department: department });
    if (!departmentToUpdate) {
      return res.status(404).json({ message: 'Department not found' });
    }
    departmentToUpdate.spent += amount;
    await departmentToUpdate.save();
    res.json(departmentToUpdate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

<<<<<<< Updated upstream
=======
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

>>>>>>> Stashed changes
// Seeder Function
async function seedDatabase() {
    // ... (Seeder function is unchanged)
}