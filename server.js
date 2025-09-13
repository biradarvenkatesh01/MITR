const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;


const dbURI = 'mongodb+srv://finsight:projfin123@finsight-cluster.3qsmiss.mongodb.net/?retryWrites=true&w=majority&appName=finsight-cluster';


app.use(cors());

// --- Database Connection ---
mongoose.connect(dbURI)
  .then(() => {
    console.log('MongoDB Connected...');
    // Start the server only after the database is connected
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
    seedDatabase(); // Optional: Add initial data if the DB is empty
  })
  .catch(err => console.log(err));

// --- Data Structure (Schema) ---
const budgetSchema = new mongoose.Schema({
  department: String,
  allocated: Number,
  spent: Number
});

// --- Data Model ---
const Budget = mongoose.model('Budget', budgetSchema);

// --- API Endpoint ---
app.get('/api/budget', async (req, res) => {
  try {
    const budgetData = await Budget.find();
    res.json(budgetData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Function to add initial data (a seeder) ---
async function seedDatabase() {
  try {
    const count = await Budget.countDocuments();
    if (count === 0) {
      console.log('No data found. Seeding database...');
      const initialData = [
        { department: 'Academics & Curriculum', allocated: 150000000, spent: 40000000 },
        { department: 'Infrastructure & Maintenance', allocated: 200000000, spent: 55000000 },
        { department: 'Student Affairs & Events', allocated: 50000000, spent: 10000000 },
        { department: 'Research & Development', allocated: 100000000, spent: 20000000 }
      ];
      await Budget.insertMany(initialData);
      console.log('Database seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}