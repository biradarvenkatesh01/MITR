document.addEventListener('DOMContentLoaded', () => {
    fetchBudgetData();
});

async function fetchBudgetData() {
    try {
        const response = await fetch('http://localhost:3000/api/budget');
        const data = await response.json();

        populateTable(data);
        createChart(data);

    } catch (error) {
        console.error('Error fetching budget data:', error);
    }
}

function populateTable(data) {
    const tableBody = document.getElementById('budget-table-body');
    tableBody.innerHTML = ''; // Clear existing rows

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

function createChart(data) {
    const ctx = document.getElementById('budgetChart').getContext('2d');

    const chartData = {
        labels: data.map(item => item.department),
        datasets: [{
            label: 'Budget Allocation',
            data: data.map(item => item.allocated),
            backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f'],
            hoverOffset: 4
        }]
    };

    new Chart(ctx, {
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