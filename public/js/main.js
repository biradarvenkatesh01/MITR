let currentCurrency = 'INR';
const USD_TO_INR_RATE = 83;
let budgetDataStore = []; // To store the original budget data
let budgetPieChart, budgetBarChart;

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return;
    }
    
    initializeDashboard();
    initializeEventListeners();
});

function initializeDashboard() {
    fetchBudgetData();
    fetchAnomalies();
}

function initializeEventListeners() {
    document.getElementById('searchButton').addEventListener('click', handleSearch);
    document.getElementById('currency-toggle-checkbox').addEventListener('change', handleCurrencyToggle);
    
    // Chatbot listeners
    const chatToggleButton = document.getElementById('chat-toggle-button');
    const chatCloseButton = document.getElementById('chat-close-button');
    const chatWidget = document.getElementById('chat-widget');
    const chatForm = document.getElementById('chat-form');

    chatToggleButton.addEventListener('click', () => chatWidget.classList.toggle('open'));
    chatCloseButton.addEventListener('click', () => chatWidget.classList.remove('open'));
    chatForm.addEventListener('submit', handleChatSubmit);
}

async function fetchBudgetData() {
    try {
        const response = await fetch('/api/budget');
        budgetDataStore = await response.json();
        displayBudgetData(budgetDataStore);
    } catch (error) {
        console.error('Error fetching budget data:', error);
    }
}

async function fetchAnomalies() {
    try {
        const response = await fetch('/api/anomalies');
        const anomalies = await response.json();
        const container = document.getElementById('anomalies-container');
        container.innerHTML = '';
        if (anomalies.length > 0) {
            anomalies.forEach(alertText => {
                const alertEl = document.createElement('div');
                alertEl.className = 'anomaly-alert';
                alertEl.textContent = `⚠️ ${alertText}`;
                container.appendChild(alertEl);
            });
        } else {
            container.innerHTML = '<p>✅ No budget anomalies detected. Great job!</p>';
        }
    } catch (error) {
        console.error('Error fetching anomalies:', error);
    }
}

function displayBudgetData(data) {
    const budgetContainer = document.getElementById('budget-list-container');
    budgetContainer.innerHTML = '';

    if (!data || data.length === 0) {
        budgetContainer.innerHTML = '<p>No data to display.</p>';
        return;
    }

    data.forEach(item => {
        const allocated = currentCurrency === 'USD' ? (item.allocated / USD_TO_INR_RATE).toFixed(2) : item.allocated;
        const spent = currentCurrency === 'USD' ? (item.spent / USD_TO_INR_RATE).toFixed(2) : item.spent;
        const currencySymbol = currentCurrency === 'USD' ? '$' : '₹';

        const budgetItem = document.createElement('div');
        budgetItem.className = 'budget-item';
        budgetItem.innerHTML = `
            <h3>${item.department}</h3>
            <p><strong>Allocated:</strong> ${currencySymbol}${allocated}</p>
            <p><strong>Spent:</strong> ${currencySymbol}${spent}</p>
            <p><strong>Vendor:</strong> ${item.vendor || 'N/A'}</p>
            <button class="feedback-btn" data-budget-id="${item._id}">Community Feedback</button>
            <div class="comments-section" id="comments-${item._id}">
                <h4>Comments</h4>
                ${item.comments.map(c => `<p><strong>${c.user.username}:</strong> ${c.text}</p>`).join('') || '<p>No comments yet.</p>'}
                <form class="comment-form" data-budget-id="${item._id}">
                    <input type="text" placeholder="Add a comment..." required>
                    <button type="submit">Post</button>
                </form>
            </div>
        `;
        budgetContainer.appendChild(budgetItem);
    });
    
    // Add event listeners for new elements
    document.querySelectorAll('.feedback-btn').forEach(button => button.addEventListener('click', toggleComments));
    document.querySelectorAll('.comment-form').forEach(form => form.addEventListener('submit', handleCommentSubmit));

    renderCharts(data);
}

function renderCharts(data) {
    const labels = data.map(item => item.department);
    const allocatedData = data.map(item => item.allocated);
    const spentData = data.map(item => item.spent);

    if (budgetPieChart) budgetPieChart.destroy();
    if (budgetBarChart) budgetBarChart.destroy();
    
    const pieCtx = document.getElementById('budgetPieChart').getContext('2d');
    budgetPieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: data.map(d => d.department),
            datasets: [{
                label: 'Spent',
                data: spentData,
                backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff']
            }]
        }
    });

    const barCtx = document.getElementById('budgetBarChart').getContext('2d');
    budgetBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Allocated',
                    data: allocatedData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Spent',
                    data: spentData,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filteredData = budgetDataStore.filter(item => 
        item.department.toLowerCase().includes(query) || 
        (item.vendor && item.vendor.toLowerCase().includes(query))
    );
    displayBudgetData(filteredData);
}

function handleCurrencyToggle(event) {
    currentCurrency = event.target.checked ? 'USD' : 'INR';
    displayBudgetData(budgetDataStore);
}

function toggleComments(event) {
    const budgetId = event.target.dataset.budgetId;
    const commentsSection = document.getElementById(`comments-${budgetId}`);
    commentsSection.style.display = commentsSection.style.display === 'block' ? 'none' : 'block';
}

async function handleCommentSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const budgetId = form.dataset.budgetId;
    const input = form.querySelector('input');
    const text = input.value;
    const user = JSON.parse(localStorage.getItem('user'));

    if (!text || !user) return;

    try {
        const response = await fetch(`/api/budgets/${budgetId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, userId: user.id }),
        });

        if (response.ok) {
            input.value = '';
            fetchBudgetData();
        }
    } catch (error) { console.error('Error posting comment:', error); }
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const chatInput = document.getElementById('chat-input');
  const message = chatInput.value.trim();

  if (message) {
    addChatMessage(message, 'user');
    chatInput.value = '';

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context: budgetDataStore }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      addChatMessage(data.reply, 'bot');
    } catch (error) {
      console.error("Chatbot Error:", error);
      addChatMessage('Sorry, something went wrong. Please try again.', 'bot');
    }
  }
}

function addChatMessage(text, sender) {
  const chatBody = document.getElementById('chat-body');
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message', `${sender}-message`);
  
  const p = document.createElement('p');
  p.textContent = text;
  messageElement.appendChild(p);
  
  chatBody.appendChild(messageElement);
  chatBody.scrollTop = chatBody.scrollHeight;
}
