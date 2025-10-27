Expense Tracking and Analytics System

A full-stack **Expense Tracking and Analytics System** built as part of a Database Management Systems (DBMS) course project.  
This application allows users to record daily expenses, manage spending limits per category, and visualize financial data through interactive dashboards and analytics.

Tech Stack

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Python (Flask Framework)  
- **Database:** MySQL  
- **Server:** Flask Development Server

Project Overview

The system provides an intuitive interface for users to manage and analyze their expenses. It supports features such as user authentication, CRUD operations, limit monitoring, and graphical analysis of spending patterns.

Key Objectives:
- To demonstrate integration of database operations with a web application.
- To provide useful insights into personal finance through data analytics.
- To ensure proper use of CRUD operations and relational database design principles.


Features
User Features
- **User Authentication:** Login/signup functionality with session management.
- **Dashboard Overview:** Displays total expenses, monthly summaries, and alerts for limit exceedances.
- **Add/Edit/Delete Expenses:** Allows users to record or modify their daily spendings.
- **Category-based Limits:** Set, update, or delete limits for different categories (e.g., Food, Travel, Utilities).

Analytics & Visualization
- **Interactive Charts:** Visualizes expense trends using charts and graphs.
- **Spending Insights:** Highlights top spending categories and monthly variance.
- **PDF Export:** Option to download analytics and reports in PDF format.

Database Management
- MySQL tables designed using **normalized schema** (3NF) for efficient data handling.
- Clear entity relationships between users, expenses, and categories.
- Secure CRUD operations implemented through Flask and MySQL integration.

---

System Architecture

**Frontend:**  
HTML/CSS/JavaScript pages handle user input, form validation, and UI interactivity.  

**Backend (Flask):**  
Handles routing, session management, and communication with the MySQL database.  

**Database (MySQL):**  
Stores user accounts, expense records, and category data. Optimized using indexing and relational mapping.
