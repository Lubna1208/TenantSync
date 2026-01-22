# **Project Title:** TenantSync

## Team Members

### I. Faria Islam Lubna
- **Role:** Team Lead  
- **Email:** faria.cse.20230104135@aust.edu  
- **ID:** 20230104135  

### II. Sojib Hasan
- **Role:** Front-end Developer  
- **Email:** sojib.cse.20230104126@aust.edu  
- **ID:** 20230104126  

### III. Safwat Ashraf Nabil
- **Role:** Front-end Developer and Back-end Developer  
- **Email:** safwat.cse.20230104129@aust.edu  
- **ID:** 20230104129  

### IV. Jawad Al Nasrum Shams
- **Role:** Back-end Developer  
- **Email:** jawad.cse.20230104145@aust.edu  
- **ID:** 20230104145  

---

## Project Overview

### Objective
TenantSync aims to simplify the daily tasks of property managers and landlords.  
It helps manage tenants, track rent, handle complaints, and make better decisions using AI-powered assistance.  
The system integrates AI APIs to automate decision support, improve response quality, and enhance productivity.

### Target Audience
- Property Owners  
- Property Managers  
- Small Real Estate Firms  
- Tenants living in rental properties  

---

## Tech Stack

### Backend
- Laravel  
- JWT for authentication  
- MySQL Database  

### Frontend
- React.js  
- Tailwind CSS / Bootstrap  

### Rendering Method
- Client-Side Rendering (CSR)

---

## UI Design

- **Mock UI:** Designed using Figma  
- **Figma Design Link:**  
  https://www.figma.com/design/Wl6kOtpopyWvzjOYuSDryR/TenantSync?node-id=0-1&t=sDsHI0fEqtdXdLrM-1

---

## Project Features

### Core Features
- User Registration & Authentication (JWT-based)  
- Role-based access for Admin, Manager, and Tenant  
- Property & Unit Management (CRUD)  
- Tenant Profile Management  
- Rent Tracking & Payment Records  
- Complaint & Maintenance Requests  
- Notification and status tracking  

### AI-Integrated Features
- **AI Tenant Support Chatbot:** Answers tenant queries using system data  
- **AI Complaint Categorization:** Automatically categorizes and prioritizes complaints  
- **AI Auto-Reply Generator:** Drafts professional responses for property managers  
- **AI Lease & Document Explanation:** Explains lease clauses in simple language  
- **AI Dashboard Insights:** Summarizes trends and decision-support insights for owners  

---

## CRUD Operations
- Properties  
- Units  
- Tenants  
- Complaints  
- Maintenance Requests  
- Payments  
- Documents  

---

## API Endpoints (Examples)

### Authentication
- POST `/api/login`  
- POST `/api/register`  
- POST `/api/logout`  

### Properties & Tenants
- GET `/api/properties`  
- POST `/api/properties`  
- PUT `/api/properties/{id}`  
- DELETE `/api/properties/{id}`  

### Complaints
- POST `/api/complaints`  
- GET `/api/complaints`  
- PUT `/api/complaints/{id}`  

### AI Services
- POST `/api/ai/chat`  
- POST `/api/ai/categorize-complaint`  
- POST `/api/ai/generate-reply`  
- POST `/api/ai/insights`  

---

## Milestones

### Milestone 1 – Core System Setup
- Project setup (Laravel + React)  
- Authentication & role management  
- Property, tenant, and unit CRUD  
- Basic UI implementation
- User authentication (JWT)  

### Milestone 2 – Core Features & System Setup
- Secure API handling  
- Complaint & Maintenance system  
- Property, Tenant, and Unit Management (CRUD)  
- Rent & Payment tracking  
- Dashboard (role-based) 

### Milestone 3 – AI Integration & Finalization
- AI chatbot integration (embedded in Complaint Page)  
- AI complaint categorization  
- AI auto-reply generation  
- AI dashboard insights  
- Lease/document explanation using AI  
- UI polishing and improvements  
- Testing & deployment preparation  
- README finalization  

---

## Conclusion
TenantSync is a modern, AI-powered property management system that improves productivity, decision-making, and communication.  
By integrating AI APIs, the project remains scalable, practical, and suitable for real-world deployment.
