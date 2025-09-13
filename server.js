const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

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

// Seeder Function
async function seedDatabase() {
    // ... (Seeder function is unchanged)
}