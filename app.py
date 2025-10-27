from flask import Flask, request, jsonify #type: ignore
from flask_cors import CORS #type: ignore
import mysql.connector  #type: ignore
from mysql.connector import Error #type: ignore
from datetime import datetime
import hashlib
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ========== Database Configuration ==========
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',  
    'password': 'your_Password',  
    'database': 'Database_name'
}

# ========== Database Connection ==========
def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# ========== Initialize Database ==========
def init_database():
    """Initialize database and create tables if they don't exist"""
    try:
        # First connect without database to create it
        temp_config = DB_CONFIG.copy()
        db_name = temp_config.pop('database')
        connection = mysql.connector.connect(**temp_config)
        cursor = connection.cursor()
        
        # Create database if not exists
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        cursor.execute(f"USE {db_name}")
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(30) NOT NULL UNIQUE,
                password VARCHAR(512) NOT NULL,
                fullName VARCHAR(200) NOT NULL,
                Food INT DEFAULT 0,
                shopping INT DEFAULT 0,
                travel INT DEFAULT 0,
                bills INT DEFAULT 0,
                other INT DEFAULT 0,
                INDEX idx_username (username)
            )
        """)
        
        # Create expenses table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                expense_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(50) NOT NULL,
                amount INT NOT NULL,
                category VARCHAR(25) NOT NULL,
                notes VARCHAR(200),
                date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_date_created (date_created)
            )
        """)
        
        connection.commit()
        cursor.close()
        connection.close()
        print("Database initialized successfully!")
        
    except Error as e:
        print(f"Error initializing database: {e}")

# ========== Password Hashing ==========
def hash_password(password):
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

# ========== API Routes ==========

@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not all(key in data for key in ['username', 'password', 'fullName']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        username = data['username'].strip()
        password = data['password']
        full_name = data['fullName'].strip()
        
        if not username or not password or not full_name:
            return jsonify({'error': 'All fields are required'}), 400
        
        if len(username) > 30:
            return jsonify({'error': 'Username must be 30 characters or less'}), 400
        
        if len(full_name) > 200:
            return jsonify({'error': 'Full name must be 200 characters or less'}), 400
        
        # Hash the password
        hashed_password = hash_password(password)
        
        # Insert into database
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        
        try:
            cursor.execute(
                "INSERT INTO users (username, password, fullName) VALUES (%s, %s, %s)",
                (username, hashed_password, full_name)
            )
            connection.commit()
            user_id = cursor.lastrowid
            
            cursor.close()
            connection.close()
            
            return jsonify({
                'message': 'User registered successfully',
                'user_id': user_id
            }), 201
            
        except mysql.connector.IntegrityError:
            cursor.close()
            connection.close()
            return jsonify({'error': 'Username already exists'}), 409
            
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not all(key in data for key in ['username', 'password']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        username = data['username'].strip()
        password = data['password']
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Hash the password
        hashed_password = hash_password(password)
        
        # Query database
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT user_id, fullName FROM users WHERE username = %s AND password = %s",
            (username, hashed_password)
        )
        
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if user:
            return jsonify({
                'message': 'Login successful',
                'user_id': user['user_id'],
                'fullName': user['fullName']
            }), 200
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
            
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/expenses', methods=['POST'])
def add_expense():
    """Add a new expense"""
    try:
        data = request.get_json()
        
        # Validate input
        required_fields = ['user_id', 'title', 'amount', 'category']
        if not data or not all(key in data for key in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        user_id = data['user_id']
        title = data['title'].strip()
        amount = data['amount']
        category = data['category'].strip()
        notes = data.get('notes', '').strip() if data.get('notes') else None
        
        # Validate data
        if not title or not category:
            return jsonify({'error': 'Title and category are required'}), 400
        
        if len(title) > 50:
            return jsonify({'error': 'Title must be 50 characters or less'}), 400
        
        if len(category) > 25:
            return jsonify({'error': 'Category must be 25 characters or less'}), 400
        
        if notes and len(notes) > 200:
            return jsonify({'error': 'Notes must be 200 characters or less'}), 400
        
        try:
            amount = int(amount)
            if amount <= 0:
                return jsonify({'error': 'Amount must be greater than zero'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid amount'}), 400
        
        # Insert into database
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        cursor.execute(
            """INSERT INTO expenses (user_id, title, amount, category, notes) 
               VALUES (%s, %s, %s, %s, %s)""",
            (user_id, title, amount, category, notes)
        )
        connection.commit()
        expense_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': 'Expense added successfully',
            'expense_id': expense_id
        }), 201
        
    except Exception as e:
        print(f"Add expense error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/expenses/<int:user_id>', methods=['GET'])
def get_expenses(user_id):
    """Get all expenses for a user"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """SELECT expense_id, user_id, title, amount, category, notes, date_created 
               FROM expenses 
               WHERE user_id = %s 
               ORDER BY date_created DESC""",
            (user_id,)
        )
        
        expenses = cursor.fetchall()
        
        # Convert datetime to string
        for expense in expenses:
            if expense['date_created']:
                expense['date_created'] = expense['date_created'].isoformat()
        
        cursor.close()
        connection.close()
        
        return jsonify({'expenses': expenses}), 200
        
    except Exception as e:
        print(f"Get expenses error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """Delete an expense"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        cursor.execute("DELETE FROM expenses WHERE expense_id = %s", (expense_id,))
        connection.commit()
        
        if cursor.rowcount == 0:
            cursor.close()
            connection.close()
            return jsonify({'error': 'Expense not found'}), 404
        
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Expense deleted successfully'}), 200
        
    except Exception as e:
        print(f"Delete expense error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/limits', methods=['POST'])
def set_limits():
    """Set category spending limits for a user"""
    try:
        data = request.get_json()
        
        # Validate input
        required_fields = ['user_id', 'food', 'travel', 'shopping', 'bills', 'other']
        if not data or not all(key in data for key in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        user_id = data['user_id']
        food = int(data['food']) if data['food'] else 0
        travel = int(data['travel']) if data['travel'] else 0
        shopping = int(data['shopping']) if data['shopping'] else 0
        bills = int(data['bills']) if data['bills'] else 0
        other = int(data['other']) if data['other'] else 0
        
        # Validate limits are non-negative
        if any(limit < 0 for limit in [food, travel, shopping, bills, other]):
            return jsonify({'error': 'Limits must be non-negative'}), 400
        
        # Update database
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        cursor.execute(
            """UPDATE users 
               SET Food = %s, travel = %s, shopping = %s, bills = %s, other = %s 
               WHERE user_id = %s""",
            (food, travel, shopping, bills, other, user_id)
        )
        connection.commit()
        
        if cursor.rowcount == 0:
            cursor.close()
            connection.close()
            return jsonify({'error': 'User not found'}), 404
        
        cursor.close()
        connection.close()
        
        return jsonify({'message': 'Limits updated successfully'}), 200
        
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid limit values'}), 400
    except Exception as e:
        print(f"Set limits error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/limits/<int:user_id>', methods=['GET'])
def get_limits(user_id):
    """Get category spending limits for a user"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT Food, travel, shopping, bills, other FROM users WHERE user_id = %s",
            (user_id,)
        )
        
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        limits = {
            'food': user['Food'] or 0,
            'travel': user['travel'] or 0,
            'shopping': user['shopping'] or 0,
            'bills': user['bills'] or 0,
            'other': user['other'] or 0
        }
        
        return jsonify({'limits': limits}), 200
        
    except Exception as e:
        print(f"Get limits error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/stats/<int:user_id>', methods=['GET'])
def get_statistics(user_id):
    """Get expense statistics for a user"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get total, min, max, avg
        cursor.execute(
            """SELECT 
                COUNT(*) as count,
                SUM(amount) as total,
                MIN(amount) as minimum,
                MAX(amount) as maximum,
                AVG(amount) as average
               FROM expenses 
               WHERE user_id = %s""",
            (user_id,)
        )
        
        stats = cursor.fetchone()
        
        # Get category-wise totals
        cursor.execute(
            """SELECT category, SUM(amount) as total 
               FROM expenses 
               WHERE user_id = %s 
               GROUP BY category""",
            (user_id,)
        )
        
        category_totals = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'stats': {
                'count': stats['count'] or 0,
                'total': float(stats['total']) if stats['total'] else 0,
                'minimum': float(stats['minimum']) if stats['minimum'] else 0,
                'maximum': float(stats['maximum']) if stats['maximum'] else 0,
                'average': float(stats['average']) if stats['average'] else 0
            },
            'categoryTotals': category_totals
        }), 200
        
    except Exception as e:
        print(f"Get statistics error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'SmartExpense API is running'}), 200


# ========== Error Handlers ==========
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# ========== Main ==========
if __name__ == '__main__':
    print("Initializing SmartExpense Backend...")
    init_database()
    print("Starting Flask server on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)