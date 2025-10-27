// ========================================
// SmartExpense - Frontend JavaScript
// ========================================

// ========== Global Variables ==========
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let expenseChart = null;
let allExpenses = [];
let currentFilter = 'all';

// ========== Initialization ==========
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initTheme();
});

// ========== Theme Management ==========
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// ========== Authentication Check ==========
function checkAuth() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        showDashboard();
    } else {
        showLogin();
    }
}

// ========== Page Navigation ==========
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function showLogin() {
    showPage('loginPage');
    document.getElementById('navbar').style.display = 'none';
    document.getElementById('footer').style.display = 'none';
}

function showRegistration() {
    showPage('registrationPage');
    document.getElementById('navbar').style.display = 'none';
    document.getElementById('footer').style.display = 'none';
}

function showDashboard() {
    showPage('dashboardPage');
    document.getElementById('navbar').style.display = 'block';
    document.getElementById('footer').style.display = 'block';
    if (currentUser) {
        setGreeting();
        loadUserLimits();
        loadExpenses();
    }
}

function showAddExpense() {
    document.getElementById('addExpenseModal').classList.add('active');
}

function closeAddExpense() {
    document.getElementById('addExpenseModal').classList.remove('active');
    document.getElementById('addExpenseForm').reset();
}

function showSetLimits() {
    loadUserLimits();
    document.getElementById('setLimitsModal').classList.add('active');
}

function closeSetLimits() {
    document.getElementById('setLimitsModal').classList.remove('active');
}

// ========== Registration Handler ==========
async function handleRegistration(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
        showToast('All fields are required!', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters!', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: email,
                password: password,
                fullName: fullName
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            document.getElementById('registrationForm').reset();
            setTimeout(() => showLogin(), 1500);
        } else {
            showToast(data.error || 'Registration failed!', 'error');
        }
    } catch (error) {
        showToast('Unable to connect to server!', 'error');
        console.error('Registration error:', error);
    }
}

// ========== Login Handler ==========
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showToast('Please enter email and password!', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = {
                user_id: data.user_id,
                username: email,
                fullName: data.fullName
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast(`Welcome back, ${data.fullName}!`, 'success');
            document.getElementById('loginForm').reset();
            showDashboard();
        } else {
            showToast(data.error || 'Invalid credentials!', 'error');
        }
    } catch (error) {
        showToast('Unable to connect to server!', 'error');
        console.error('Login error:', error);
    }
}

// ========== Logout Handler ==========
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    allExpenses = [];
    showToast('Logged out successfully!', 'success');
    showLogin();
}

// ========== Set Greeting Message ==========
function setGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 17) greeting = 'Good Afternoon';
    else if (hour < 21) greeting = 'Good Evening';
    else greeting = 'Good Night';
    
    const name = currentUser ? currentUser.fullName.split(' ')[0] : 'User';
    document.getElementById('greetingMessage').textContent = `${greeting}, ${name}!`;
}

// ========== Load Expenses ==========
async function loadExpenses() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/expenses/${currentUser.user_id}`);
        const data = await response.json();
        
        if (response.ok) {
            allExpenses = data.expenses || [];
            applyFilter();
        } else {
            showToast('Failed to load expenses!', 'error');
        }
    } catch (error) {
        showToast('Unable to connect to server!', 'error');
        console.error('Load expenses error:', error);
    }
}

// ========== Apply Filter ==========
function applyFilter() {
    currentFilter = document.getElementById('timeFilter').value;
    let filteredExpenses = [...allExpenses];
    
    if (currentFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filteredExpenses = allExpenses.filter(exp => new Date(exp.date_created) >= weekAgo);
    } else if (currentFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filteredExpenses = allExpenses.filter(exp => new Date(exp.date_created) >= monthAgo);
    }
    
    updateDashboard(filteredExpenses);
}

// ========== Update Dashboard ==========
function updateDashboard(expenses) {
    updateSummaryCards(expenses);
    updateExpensesTable(expenses);
    updateChart(expenses);
    updateCategoryLimitsDisplay(expenses);
}

// ========== Update Summary Cards ==========
function updateSummaryCards(expenses) {
    if (expenses.length === 0) {
        document.getElementById('totalExpenses').textContent = '₹0';
        document.getElementById('minExpense').textContent = '₹0';
        document.getElementById('maxExpense').textContent = '₹0';
        document.getElementById('avgExpense').textContent = '₹0';
        return;
    }
    
    const amounts = expenses.map(e => parseFloat(e.amount));
    const total = amounts.reduce((sum, amt) => sum + amt, 0);
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const avg = total / amounts.length;
    
    document.getElementById('totalExpenses').textContent = `₹${total.toFixed(2)}`;
    document.getElementById('minExpense').textContent = `₹${min.toFixed(2)}`;
    document.getElementById('maxExpense').textContent = `₹${max.toFixed(2)}`;
    document.getElementById('avgExpense').textContent = `₹${avg.toFixed(2)}`;
}

// ========== Update Expenses Table ==========
function updateExpensesTable(expenses) {
    const tbody = document.getElementById('expensesTableBody');
    
    if (expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No expenses found. Add your first expense!</td></tr>';
        return;
    }
    
    tbody.innerHTML = expenses.map(expense => `
        <tr>
            <td>${escapeHtml(expense.title)}</td>
            <td>₹${parseFloat(expense.amount).toFixed(2)}</td>
            <td><span class="category-badge category-${expense.category}">${expense.category}</span></td>
            <td>${escapeHtml(expense.notes || '-')}</td>
            <td>${formatDate(expense.date_created)}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteExpense(${expense.expense_id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// ========== Update Chart ==========
function updateChart(expenses) {
    const categoryTotals = {
        'Food': 0,
        'Travel': 0,
        'Shopping': 0,
        'Bills': 0,
        'Other': 0
    };
    
    expenses.forEach(expense => {
        const category = expense.category;
        if (categoryTotals.hasOwnProperty(category)) {
            categoryTotals[category] += parseFloat(expense.amount);
        }
    });
    
    const ctx = document.getElementById('expenseChart');
    
    if (expenseChart) {
        expenseChart.destroy();
    }
    
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryTotals),
            datasets: [{
                data: Object.values(categoryTotals),
                backgroundColor: [
                    '#f59e0b',
                    '#3b82f6',
                    '#ec4899',
                    '#8b5cf6',
                    '#6b7280'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ₹' + context.parsed.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// ========== Update Category Limits Display ==========
async function updateCategoryLimitsDisplay(expenses) {
    const container = document.getElementById('categoryLimitsDisplay');
    
    try {
        const response = await fetch(`${API_BASE_URL}/limits/${currentUser.user_id}`);
        const data = await response.json();
        
        if (!response.ok) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No limits set. <a href="#" onclick="showSetLimits()" style="color: var(--primary-color);">Set limits now</a></p>';
            return;
        }
        
        const limits = data.limits;
        const categories = ['Food', 'Travel', 'Shopping', 'Bills', 'Other'];
        
        const categorySpending = {
            'Food': 0,
            'Travel': 0,
            'Shopping': 0,
            'Bills': 0,
            'Other': 0
        };
        
        expenses.forEach(expense => {
            if (categorySpending.hasOwnProperty(expense.category)) {
                categorySpending[expense.category] += parseFloat(expense.amount);
            }
        });
        
        container.innerHTML = categories.map(category => {
            const limitKey = category.toLowerCase();
            const limit = limits[limitKey] || 0;
            const spent = categorySpending[category];
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;
            
            let progressClass = '';
            if (percentage >= 100) progressClass = 'danger';
            else if (percentage >= 80) progressClass = 'warning';
            
            if (limit === 0) return '';
            
            return `
                <div class="limit-item">
                    <div class="limit-header">
                        <span class="limit-category">
                            <i class="fas ${getCategoryIcon(category)}"></i> ${category}
                        </span>
                        <span class="limit-info">₹${spent.toFixed(2)} / ₹${limit.toFixed(2)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                </div>
            `;
        }).filter(html => html).join('');
        
        if (container.innerHTML === '') {
            container.innerHTML = '<p style="color: var(--text-secondary);">No limits set. <a href="#" onclick="showSetLimits()" style="color: var(--primary-color);">Set limits now</a></p>';
        }
    } catch (error) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Unable to load limits.</p>';
        console.error('Load limits error:', error);
    }
}

// ========== Get Category Icon ==========
function getCategoryIcon(category) {
    const icons = {
        'Food': 'fa-utensils',
        'Travel': 'fa-plane',
        'Shopping': 'fa-shopping-bag',
        'Bills': 'fa-file-invoice-dollar',
        'Other': 'fa-ellipsis-h'
    };
    return icons[category] || 'fa-tag';
}

// ========== Add Expense Handler ==========
async function handleAddExpense(event) {
    event.preventDefault();
    
    const title = document.getElementById('expenseTitle').value.trim();
    const amount = document.getElementById('expenseAmount').value;
    const category = document.getElementById('expenseCategory').value;
    const notes = document.getElementById('expenseNotes').value.trim();
    
    if (!title || !amount || !category) {
        showToast('Please fill all required fields!', 'error');
        return;
    }
    
    if (parseFloat(amount) <= 0) {
        showToast('Amount must be greater than zero!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                title: title,
                amount: parseFloat(amount),
                category: category,
                notes: notes || null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Expense added successfully!', 'success');
            closeAddExpense();
            loadExpenses();
        } else {
            showToast(data.error || 'Failed to add expense!', 'error');
        }
    } catch (error) {
        showToast('Unable to connect to server!', 'error');
        console.error('Add expense error:', error);
    }
}

// ========== Delete Expense ==========
async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Expense deleted successfully!', 'success');
            loadExpenses();
        } else {
            showToast('Failed to delete expense!', 'error');
        }
    } catch (error) {
        showToast('Unable to connect to server!', 'error');
        console.error('Delete expense error:', error);
    }
}

// ========== Load User Limits ==========
async function loadUserLimits() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/limits/${currentUser.user_id}`);
        const data = await response.json();
        
        if (response.ok) {
            const limits = data.limits;
            document.getElementById('limitFood').value = limits.food || 0;
            document.getElementById('limitTravel').value = limits.travel || 0;
            document.getElementById('limitShopping').value = limits.shopping || 0;
            document.getElementById('limitBills').value = limits.bills || 0;
            document.getElementById('limitOther').value = limits.other || 0;
        }
    } catch (error) {
        console.error('Load limits error:', error);
    }
}

// ========== Set Limits Handler ==========
async function handleSetLimits(event) {
    event.preventDefault();
    
    const food = parseInt(document.getElementById('limitFood').value) || 0;
    const travel = parseInt(document.getElementById('limitTravel').value) || 0;
    const shopping = parseInt(document.getElementById('limitShopping').value) || 0;
    const bills = parseInt(document.getElementById('limitBills').value) || 0;
    const other = parseInt(document.getElementById('limitOther').value) || 0;
    
    try {
        const response = await fetch(`${API_BASE_URL}/limits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                food: food,
                travel: travel,
                shopping: shopping,
                bills: bills,
                other: other
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Limits updated successfully!', 'success');
            closeSetLimits();
            loadExpenses();
        } else {
            showToast(data.error || 'Failed to update limits!', 'error');
        }
    } catch (error) {
        showToast('Unable to connect to server!', 'error');
        console.error('Set limits error:', error);
    }
}

// ========== Utility Functions ==========
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== Close Modal on Outside Click ==========
window.onclick = function(event) {
    const addModal = document.getElementById('addExpenseModal');
    const limitsModal = document.getElementById('setLimitsModal');
    
    if (event.target === addModal) {
        closeAddExpense();
    }
    if (event.target === limitsModal) {
        closeSetLimits();
    }
}