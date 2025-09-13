// --- NEW: Immediately check for token ---
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html"; // If no token, redirect to login page
}

document.addEventListener("DOMContentLoaded", () => {
  fetchBudgetData();
  const expenseForm = document.getElementById("expense-form");
  expenseForm.addEventListener("submit", handleAddExpense);

  // --- NEW: Search functionality setup ---
  const searchButton = document.getElementById("searchButton");
  const searchInput = document.getElementById("searchInput");
  const searchResultsContainer = document.getElementById("searchResults");
  // In js/main.js, find your searchButton event listener and replace it with this:
  if (searchButton) {
        searchButton.addEventListener('click', async () => {
            const query = searchInput.value.trim();

            if (query) {
                try {
                    const response = await fetch(`http://localhost:3000/api/transactions/search?q=${query}`);
                    const results = await response.json();
                    displayResults(results);
                } catch (error) {
                    console.error('Error fetching search results:', error);
                    searchResultsContainer.innerHTML = '<p>Error loading results. Please try again.</p>';
                }
            } else {
                // Clear results if the search query is empty
                searchResultsContainer.innerHTML = '';
            }
        });
    }
    function displayResults(results) {
        // Clear previous results
        searchResultsContainer.innerHTML = '';

        if (results.length === 0) {
            searchResultsContainer.innerHTML = '<p>No results found.</p>';
            return;
        }

        results.forEach(item => {
            const resultElement = document.createElement('div');
            resultElement.classList.add('result-item');

            resultElement.innerHTML = `
                <h3>${item.department}</h3>
                <p><strong>Vendor:</strong> ${item.vendor || 'N/A'}</p>
                <p><strong>Spent:</strong> $${item.spent}</p>
                <p><strong>Allocated:</strong> $${item.allocated}</p>
            `;

            searchResultsContainer.appendChild(resultElement);
        });
    }
});

async function fetchBudgetData() {
  try {
    const response = await fetch("http://localhost:3000/api/budget", {
      // --- NEW: Send the token with the request ---
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401 || response.status === 403) {
      // If token is invalid, redirect to login
      window.location.href = "login.html";
      return;
    }

    const data = await response.json();
    displayBudgetData(data);
    populateTable(data);
    populateDepartmentDropdown(data);
    createDoughnutChart(data);
    createBarChart(data);
  } catch (error) {
    console.error("Error fetching budget data:", error);
  }
}

// ... (The rest of the functions: populateTable, populateDepartmentDropdown, handleAddExpense, createDoughnutChart, createBarChart remain the same) ...

async function handleAddExpense(event) {
  event.preventDefault();
  const form = event.target;
  const department = form.elements.department.value;
  const amount = Number(form.elements.amount.value);

  if (!department || !amount) {
    alert("Please fill out all fields.");
    return;
  }
  try {
    await fetch("http://localhost:3000/api/expense", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // --- NEW: Send the token with the request ---
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ department, amount }),
    });

    form.reset();
    fetchBudgetData();
  } catch (error) {
    console.error("Error adding expense:", error);
  }
}

function populateTable(data) {
  const tableBody = document.getElementById("budget-table-body");
  tableBody.innerHTML = "";
  data.forEach((item) => {
    const remaining = item.allocated - item.spent;
    const row = `<tr><td>${
      item.department
    }</td><td>₹${item.allocated.toLocaleString(
      "en-IN"
    )}</td><td>₹${item.spent.toLocaleString(
      "en-IN"
    )}</td><td>₹${remaining.toLocaleString("en-IN")}</td></tr>`;
    tableBody.innerHTML += row;
  });
}

function populateDepartmentDropdown(data) {
  const departmentSelect = document.getElementById("department");
  departmentSelect.innerHTML = '<option value="">Select a Department</option>';
  data.forEach((item) => {
    const option = `<option value="${item.department}">${item.department}</option>`;
    departmentSelect.innerHTML += option;
  });
}

function createDoughnutChart(data) {
  const ctx = document.getElementById("budgetChart").getContext("2d");

  if (window.myBudgetChart) {
    window.myBudgetChart.destroy();
  }

  const chartData = {
    labels: data.map((item) => item.department),
    datasets: [
      {
        label: "Total Allocated Budget",
        data: data.map((item) => item.allocated),
        backgroundColor: ["#3498db", "#2ecc71", "#e74c3c", "#f1c40f"],
        hoverOffset: 4,
      },
    ],
  };

  window.myBudgetChart = new Chart(ctx, {
    type: "doughnut",
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Total Allocated Budget" },
      },
    },
  });
}

function createBarChart(data) {

  const ctx = document.getElementById("barChart").getContext("2d");
  if (window.myBarChart) window.myBarChart.destroy();
  const chartData = {
    labels: data.map((item) => item.department),
    datasets: [
      {
        label: "Allocated Budget",
        data: data.map((item) => item.allocated),
        backgroundColor: "rgba(52, 152, 219, 0.5)",
        borderColor: "#3498db",
        borderWidth: 1,
      },
      {
        label: "Amount Spent",
        data: data.map((item) => item.spent),
        backgroundColor: "rgba(46, 204, 113, 0.5)",
        borderColor: "#2ecc71",
        borderWidth: 1,
      },
    ],
  };
  window.myBarChart = new Chart(ctx, {
    type: "bar",
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Allocated vs. Spent" },
      },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// In js/main.js, add this new function to display the data
function displayBudgetData(budgetData) {
  const budgetContainer = document.getElementById("budget-container");
  budgetContainer.innerHTML = ""; // Clear previous data

  budgetData.forEach((item) => {
    const card = document.createElement("div");
    card.className = "budget-card";

    const percentage = (item.spent / item.allocated) * 100;
    const progressClass = percentage > 100 ? "over-budget" : "";

    card.innerHTML = `
            <h3>${item.department}</h3>
            <p><strong>Allocated:</strong> $${item.allocated.toLocaleString()}</p>
            <p><strong>Spent:</strong> $${item.spent.toLocaleString()}</p>
            <p><strong>Vendor:</strong> ${item.vendor || "N/A"}</p>
            <div class="progress-bar">
                <div class="progress ${progressClass}" style="width: ${Math.min(
      percentage,
      100
    )}%;"></div>
            </div>
        `;
    budgetContainer.appendChild(card);
  });
}

// Now, update your fetchBudgetData function to use this new display function

// Make sure to call fetchBudgetData when the page loads
document.addEventListener("DOMContentLoaded", fetchBudgetData);

    const ctx = document.getElementById('barChart').getContext('2d');
    if (window.myBarChart) window.myBarChart.destroy();
    const chartData = {
        labels: data.map(item => item.department),
        datasets: [
            { label: 'Allocated Budget', data: data.map(item => item.allocated), backgroundColor: 'rgba(52, 152, 219, 0.5)', borderColor: '#3498db', borderWidth: 1 },
            { label: 'Amount Spent', data: data.map(item => item.spent), backgroundColor: 'rgba(46, 204, 113, 0.5)', borderColor: '#2ecc71', borderWidth: 1 }
        ]
    };
    window.myBarChart = new Chart(ctx, {
        type: 'bar', data: chartData,
        options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Allocated vs. Spent' } }, scales: { y: { beginAtZero: true } } }
    });


document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatBody = document.getElementById('chat-body');

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();

    if (message) {
      // Display user's message
      addMessage(message, 'user-message');
      chatInput.value = '';

      try {
        // Send message to the backend
        const response = await fetch('http://localhost:3000/api/chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });

        const data = await response.json();

        // Display bot's reply
        addMessage(data.reply, 'bot-message');
      } catch (error) {
        addMessage('Sorry, something went wrong.', 'bot-message');
      }
    }
  });

  function addMessage(text, className) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', className);
    messageElement.textContent = text;
    chatBody.appendChild(messageElement);
    chatBody.scrollTop = chatBody.scrollHeight; // Scroll to the bottom
  }
});
