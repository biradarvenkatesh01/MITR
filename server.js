const express = require('express');
const cors = require('cors'); // Import the cors package
const app = express();
const PORT = 3000;

// Use cors middleware to allow requests from our frontend
app.use(cors());

// Our budget data (acting as a mini-database)
const budgetData = [
    { department: 'Academics & Curriculum', allocated: 150000000, spent: 40000000 },
    { department: 'Infrastructure & Maintenance', allocated: 200000000, spent: 55000000 },
    { department: 'Student Affairs & Events', allocated: 50000000, spent: 10000000 },
    { department: 'Research & Development', allocated: 100000000, spent: 20000000 }
];

// Create an API endpoint to send the budget data
app.get('/api/budget', (req, res) => {
    res.json(budgetData);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});