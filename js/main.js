document.addEventListener('DOMContentLoaded', () => {
    fetchBudgetData();

    const expenseForm = document.getElementById('expense-form');
    expenseForm.addEventListener('submit', handleAddExpense);
});

async function fetchBudgetData() {
    try {
        const response = await fetch('http://localhost:3000/api/budget');
        const data = await response.json();
        
        populateTable(data);
        populateDepartmentDropdown(data);
        createChart(data);

    } catch (error) {
        console.error('Error fetching budget data:', error);
    }
}

function populateTable(data) {
    const tableBody = document.getElementById('budget-table-body');
    tableBody.innerHTML = ''; 

    data.forEach(item => {
        const remaining = item.allocated - item.spent;
        const row = `<tr>
            <td>${item.department}</td>
            <td>₹${item.allocated.toLocaleString('en-IN')}</td>
            <td>₹${item.spent.toLocaleString('en-IN')}</td>
            <td>₹${remaining.toLocaleString('en-IN')}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });
}

function populateDepartmentDropdown(data) {
    const departmentSelect = document.getElementById('department');
    departmentSelect.innerHTML = '<option value="">Select a Department</option>';

    data.forEach(item => {
        const option = `<option value="${item.department}">${item.department}</option>`;
        departmentSelect.innerHTML += option;
    });
}

async function handleAddExpense(event) {
    event.preventDefault(); 

    const form = event.target;
    const department = form.elements.department.value;
    const amount = Number(form.elements.amount.value);
    
    if (!department || !amount) {
        alert('Please fill out all fields.');
        return;
    }

    try {
        await fetch('http://localhost:3000/api/expense', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ department, amount }),
        });
        
        form.reset();
        fetchBudgetData(); // Re-fetch data to update the UI

    } catch (error) {
        console.error('Error adding expense:', error);
    }
}

function createChart(data) {
    const ctx = document.getElementById('budgetChart').getContext('2d');
    
    // This is a check to see if a chart already exists, and if so, destroy it before creating a new one.
    // This prevents charts from drawing over each other when we update the data.
    if (window.myBudgetChart) {
        window.myBudgetChart.destroy();
    }
    
    const chartData = {
        labels: data.map(item => item.department),
        datasets: [{
            label: 'Budget Allocation',
            data: data.map(item => item.allocated),
            backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f'],
            hoverOffset: 4
        }]
    };

    window.myBudgetChart = new Chart(ctx, { // Store chart instance in a global variable
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Budget Allocation by Department' }
            }
        }
    });
}