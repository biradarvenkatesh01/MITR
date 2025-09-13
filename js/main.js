let currentCurrency = 'INR';
const USD_TO_INR_RATE = 83;

document.addEventListener('DOMContentLoaded', () => {
    fetchBudgetData();

    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const currencyToggle = document.getElementById('currency-toggle-checkbox');
    
    searchButton.addEventListener('click', async () => {
        const query = searchInput.value;
        if (!query) {
            fetchBudgetData();
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/transactions/search?q=${query}`);
            const results = await response.json();
            displayBudgetData(results);
        } catch (error) {
            console.error('Error searching transactions:', error);
        }
    });
    
    currencyToggle.addEventListener('change', () => {
        currentCurrency = currencyToggle.checked ? 'USD' : 'INR';
        fetchBudgetData();
    });

    // --- Chatbot Logic ---
    const chatToggleButton = document.getElementById('chat-toggle-button');
    const chatCloseButton = document.getElementById('chat-close-button');
    const chatWidget = document.getElementById('chat-widget');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBody = document.getElementById('chat-body');

    chatToggleButton.addEventListener('click', () => {
      chatWidget.classList.toggle('open');
    });

    chatCloseButton.addEventListener('click', () => {
      chatWidget.classList.remove('open');
    });

    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();

      if (message) {
        addMessage(message, 'user');
        chatInput.value = '';

        try {
          const response = await fetch('http://localhost:3000/api/chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
          });

          if (!response.ok) {
              throw new Error('Network response was not ok');
          }

          const data = await response.json();
          addMessage(data.reply, 'bot');
        } catch (error) {
          console.error("Chatbot Error:", error);
          addMessage('Sorry, something went wrong. Please try again.', 'bot');
        }
      }
    });

    function addMessage(text, sender) {
      const messageElement = document.createElement('div');
      messageElement.classList.add('chat-message', `${sender}-message`);
      
      const p = document.createElement('p');
      p.textContent = text;
      messageElement.appendChild(p);
      
      chatBody.appendChild(messageElement);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
});

async function fetchBudgetData() {
    try {
        const response = await fetch('http://localhost:3000/api/budget');
        const budgetData = await response.json();
        displayBudgetData(budgetData);
    } catch (error) {
        console.error('Error fetching budget data:', error);
    }
}

function displayBudgetData(budgetData) {
    const budgetContainer = document.getElementById('budget-container');
    budgetContainer.innerHTML = '';

    if (budgetData.length === 0) {
        budgetContainer.innerHTML = '<p>No data to display.</p>';
        return;
    }

    budgetData.forEach(item => {
        const allocated = currentCurrency === 'USD' ? (item.allocated / USD_TO_INR_RATE).toFixed(2) : item.allocated;
        const spent = currentCurrency === 'USD' ? (item.spent / USD_TO_INR_RATE).toFixed(2) : item.spent;
        const currencySymbol = currentCurrency === 'USD' ? '$' : '₹';

        const budgetItem = document.createElement('div');
        budgetItem.className = 'budget-item';
        budgetItem.innerHTML = `
            <h3>${item.department}</h3>
            <p>Allocated: ${currencySymbol}${allocated}</p>
            <p>Spent: ${currencySymbol}${spent}</p>
            <p>Vendor: ${item.vendor || 'N/A'}</p>
        `;

        let commentsHtml = '<div class="comments-section">';
        commentsHtml += '<h4>Comments</h4>';
        if (item.comments && item.comments.length > 0) {
            item.comments.forEach(comment => {
                commentsHtml += `<p><strong>${comment.user.username}:</strong> ${comment.text}</p>`;
            });
        } else {
            commentsHtml += '<p>No comments yet.</p>';
        }
        commentsHtml += `
            <form class="comment-form" data-budget-id="${item._id}">
                <input type="text" placeholder="Add a comment..." required>
                <button type="submit">Post</button>
            </form>
        `;
        commentsHtml += '</div>';

        budgetItem.innerHTML += commentsHtml;
        budgetContainer.appendChild(budgetItem);
    });
    
    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', handleCommentSubmit);
    });
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
        const response = await fetch(`http://localhost:3000/api/budgets/${budgetId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, userId: user.id }),
        });

        if (response.ok) {
            input.value = '';
            fetchBudgetData();
        }
    } catch (error) {
        console.error('Error posting comment:', error);
    }
}