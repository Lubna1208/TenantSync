# Final Project Submission Report

**Project Title:** TenantSync  
**GitHub Repository Link:** https://github.com/Lubna1208/TenantSync.git  
**Live Deployment URL:** [Insert live deployment URL here if available]

## 1. Project Proposal

### 1.1 Problem Statement
Managing rental properties manually is time-consuming and error-prone for owners, managers, and tenants. In many small apartment or rental environments, property information, tenant records, rent tracking, complaints, and communication are handled through phone calls, notebooks, spreadsheets, or disconnected messaging apps. This creates delays, poor record keeping, limited accountability, and difficulty monitoring ongoing issues.

TenantSync addresses this gap by providing a centralized digital platform for property owners, property managers, and tenants. The system is important because it reduces administrative overhead, improves transparency, supports faster communication, and gives each user role a dedicated interface for their daily tasks.

### 1.2 Objectives
- Build a role-based property management platform for admin, manager, and tenant users.
- Allow secure user authentication using JWT-based login and protected API routes.
- Enable owners to create managers, create properties, and assign managers to properties.
- Enable managers to create units, assign tenants, manage complaints, publish announcements, and record rent payments.
- Enable tenants to view their assigned property and unit, submit complaints, pay rent, and view announcements.
- Provide AI-assisted tenant support chat and AI-assisted complaint reply drafting for managers.
- Maintain structured database records for users, apartments, units, tenants, complaints, announcements, and rent payments.

### 1.3 Methodology & Feasibility
The project follows a practical client-server web application architecture. The frontend is developed as a React single-page application using Vite and TypeScript. The backend is developed with Laravel and exposes REST-style JSON APIs secured by JWT authentication stored in cookies. The database layer uses MySQL with relational tables and foreign-key constraints.

This approach is feasible because the selected stack is widely used, well documented, and suitable for role-based CRUD applications. React supports interactive dashboards and route-based role separation, while Laravel provides MVC organization, middleware-based authorization, request validation, and database integration. MySQL is appropriate for the relational nature of apartments, units, tenants, complaints, and payments.

**Technology Stack**
- Frontend: React, TypeScript, Vite, React Router, Bootstrap
- Backend: Laravel 8, PHP, JWT Auth
- Database: MySQL 8
- Testing/Quality: Vitest, ESLint, PHPUnit
- Containerization/Automation: Docker, Docker Compose, GitHub Actions

### 1.4 Timeline
**Milestone 1**
- Project planning and requirements analysis
- Initial repository setup
- Laravel backend and React frontend initialization
- Authentication and role-based access foundation

**Milestone 2**
- Owner dashboard implementation
- Property, manager, unit, and tenant management
- Complaint handling, announcements, and rent payment modules
- Database schema finalization and API integration

**Milestone 3**
- Tenant dashboard and manager dashboard refinement
- AI support chat for tenants and AI reply generation for managers
- Testing, Docker setup, CI workflow, README completion, and submission preparation

## 2. Core Functionality

### 2.1 System Architecture
TenantSync uses a modern client-server architecture. The React frontend is responsible for rendering the user interface, handling route-based navigation, storing logged-in user information on the client, and calling backend API endpoints through authenticated HTTP requests. The Laravel backend contains the business logic, request validation, role-based middleware, controller actions, and database access using Eloquent models.

The frontend communicates with the backend through JSON APIs under `/api`. After authentication, users are redirected to different dashboards based on their role: admin, manager, or tenant. The backend persists application state in MySQL using relational tables connected through foreign keys. This design separates presentation, business logic, and persistence clearly.

### 2.2 Frontend Implementation (React)
The frontend is built with **React** using **TypeScript** and **Vite**. Routing is handled with **React Router**, and the UI is implemented through reusable views and components. The client follows a component-based SPA structure where major pages are placed inside `client/src/views`, shared manager dashboard elements are placed in `client/src/components/manager`, and styling is handled through CSS files and inline component styling.

The UI design process also references **Figma**, as documented in the existing README. On the client side, state is mainly managed using React hooks such as `useState` and `useEffect`, with role-aware navigation and dashboard-specific data loading. The application currently includes:
- A landing/login experience
- An owner dashboard for property and manager administration
- A manager dashboard for unit, tenant, complaint, announcement, and payment workflows
- A tenant dashboard for rent, complaint, announcement, and profile-related actions
- AI-assisted tenant chat and AI-generated manager reply drafting

**Suggested UI images to insert before final submission**
- Figure 1: Landing page / login screen
- Figure 2: Owner dashboard
- Figure 3: Manager dashboard
- Figure 4: Tenant dashboard

### 2.3 Backend & API (Laravel)
The backend is implemented with **Laravel**, which handles routing, validation, middleware protection, role authorization, business logic, and database communication. Controllers are organized around core resources such as authentication, apartments, units, tenants, complaints, rent payments, announcements, owner actions, and manager actions.

Primary API endpoints include:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `GET /api/owner/managers`
- `POST /api/owner/managers`
- `GET /api/owner/properties`
- `POST /api/owner/properties`
- `PATCH /api/owner/properties/{id}/manager`
- `GET /api/manager/dashboard`
- `POST /api/manager/units`
- `POST /api/manager/units/{id}/assign-tenant`
- `GET /api/manager/complaints`
- `PATCH /api/manager/complaints/{id}`
- `POST /api/manager/complaints/{id}/reply`
- `POST /api/manager/rent-payments`
- `POST /api/manager/announcements`
- `GET /api/tenant/dashboard`
- `POST /api/tenant/complaints`
- `POST /api/tenant/rent-payments`
- Resource routes for `apartments`, `units`, `tenants`, `complaints`, `rent-payments`, and `announcements`

### 2.4 Database Integration
The system uses **MySQL** as the database management system. The schema is relational and uses foreign-key constraints to preserve consistency between business entities.

Key interconnected tables include:
- `users`: stores admin, manager, and tenant login accounts
- `apartments`: stores property records and links owners with managers
- `units`: stores unit-level details for each apartment
- `tenants`: links tenant user accounts with assigned units and lease information
- `complaints`: stores tenant complaints and manager replies
- `rent_payments`: stores monthly payment records for tenants and units
- `announcements`: stores notices created by management
- `ai_logs`: reserved for storing AI interaction summaries

The schema reflects a logical real-estate workflow where one owner can create properties, one property can contain multiple units, tenants can be assigned to units, and complaints or payments are attached to tenant-unit relationships.

## 3. Code Quality & Best Practices

### 3.1 Project Structure
The backend follows Laravel's **MVC paradigm**, which helps maintain separation of concerns between routing, controller logic, models, and persistence. Controllers are placed in `server/app/Http/Controllers`, models in `server/app/Models`, routes in `server/routes`, and tests in `server/tests`.

The frontend is organized into a clear React structure:
- `client/src/views`: route-level pages such as landing, owner, manager, and tenant dashboards
- `client/src/components`: reusable UI components
- `client/src/styles`: dashboard-specific styling
- `client/src/assets`: images and static assets
- `client/src/__tests__` and `client/src/test`: frontend test setup and smoke tests

This structure makes it easier to maintain and extend the project.

### 3.2 Coding Standards
The API follows REST-oriented conventions by using standard HTTP verbs such as `GET`, `POST`, `PATCH`, `PUT`, and `DELETE`. Laravel request validation is used to reject invalid input, and JSON responses consistently return status messages and HTTP response codes. Middleware enforces authentication and role-based access control so that only authorized users can access protected routes.

On the frontend, TypeScript improves type safety, React components are separated by responsibility, and ESLint is configured to enforce consistent code quality rules. The project also includes automated frontend and backend test commands to support reliability.

### 3.3 Technical Documentation
The project includes a `README.md` that documents the overall project title, team members, objective, target audience, tech stack, Figma design link, major features, sample API endpoints, and milestone breakdown. This helps future developers understand the purpose of the project and the intended feature scope before working on the codebase.

In addition to the README, the repository contains:
- A database schema SQL dump and seed data
- Docker-related files for environment setup
- A GitHub Actions workflow for automated checks
- This final submission report for formal academic documentation

## 4. DevOps Integration: Docker & CI/CD

### 4.1 Docker Integration
The repository includes Docker support through a root `Dockerfile`, a `server/Dockerfile`, and a `docker-compose.yml` file. The root `Dockerfile` prepares a PHP-Apache environment, installs Composer and Node dependencies, builds the React client, and copies the generated frontend build into Laravel's public directory. This helps standardize the application runtime environment.

The current `docker-compose.yml` file primarily orchestrates the **MySQL database service** and maps port `3306` for local development. In the present repository state, the database service is clearly isolated through Docker Compose, while the main application is prepared for containerized execution through Dockerfiles. This provides a practical containerization foundation even though the frontend and backend are not fully separated into distinct Compose services in the current configuration.

### 4.2 CI/CD Pipeline
The project uses **GitHub Actions** for Continuous Integration through `.github/workflows/ci.yml`. The workflow is triggered on:
- Push events to `main` and `dev`
- Pull requests targeting `main` and `dev`

The CI pipeline contains two jobs:
- **Backend job:** sets up PHP, starts MySQL, loads the SQL schema and seed data, and runs Laravel smoke and project feature tests
- **Frontend job:** sets up Node.js, installs dependencies, runs ESLint, executes a Vitest smoke test, and builds the React frontend

This repository currently demonstrates a clear **CI setup**. However, a full automatic **CD deployment workflow** is not defined in the checked-in GitHub Actions file. Because of that, the hosting platform and automatic deployment target should be added here only if deployment is being handled outside the repository.

**Suggested CI/CD evidence to insert before final submission**
- Screenshot 1: Successful GitHub Actions backend job run
- Screenshot 2: Successful GitHub Actions frontend job run

## 5. Documentation

### 5.1 Prerequisites
To run the project locally, a developer should have the following installed:
- Git
- Node.js (recommended: version 20 to match CI)
- npm
- PHP 8.2 or a compatible PHP version for the Laravel project
- Composer
- MySQL 8
- Docker Desktop and Docker Compose (optional but recommended for database setup)

For AI-enabled client features, the following is also needed:
- A valid Gemini API key stored as `VITE_GEMINI_API_KEY` in `client/.env`

### 5.2 Local Setup
Below is a clean setup flow from scratch:

1. Clone the repository and enter the project folder.
```powershell
git clone https://github.com/Lubna1208/TenantSync.git
cd TenantSync
```

2. Start MySQL with Docker Compose (recommended).
```powershell
docker compose up -d
```

3. Install backend dependencies.
```powershell
cd server
composer install
Copy-Item .env.example .env
```

4. Update `server/.env` for the local database. If you are using the provided Docker Compose file, set these values:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tenantsync
DB_USERNAME=root
DB_PASSWORD=root
FRONTEND_URL=http://localhost:5173
```

5. Generate the Laravel application key and JWT secret.
```powershell
php artisan key:generate
php artisan jwt:secret
```

6. Create the database and import the provided schema and seed data.
```powershell
mysql -h 127.0.0.1 -u root -proot -e "CREATE DATABASE IF NOT EXISTS tenantsync;"
mysql -h 127.0.0.1 -u root -proot tenantsync < ..\database\schema.sql
mysql -h 127.0.0.1 -u root -proot tenantsync < ..\database\data.sql
```

7. Start the Laravel backend server.
```powershell
php artisan serve
```

8. In a new terminal, install frontend dependencies.
```powershell
cd client
npm install
```

9. If you want to use AI chat/reply features, create `client/.env` and add your Gemini key.
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

10. Start the React frontend.
```powershell
npm run dev
```

11. Open the application in the browser.
```text
Frontend: http://localhost:5173
Backend API: http://localhost:8000/api
```

## Submission Notes
- Replace the live deployment placeholder with your actual deployed URL if you have one.
- Add real screenshots for the UI and GitHub Actions workflow before exporting this report to PDF.
- The report content above is based on the current repository implementation and existing documentation.
