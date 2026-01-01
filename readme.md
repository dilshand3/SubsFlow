# Subscription Management System (Stripe-like)

A robust, full-stack Subscription Management System designed to handle limited-capacity plans, user subscriptions, concurrency, and admin management. This system mimics core functionalities of platforms like Stripe, focusing on data integrity and concurrency control.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture & Design](#system-architecture--design)
- [Setup & Installation](#setup--installation)
- [API Documentation](#api-documentation)
- [Assumptions & Trade-offs](#assumptions--trade-offs)

---

## Overview

This project allows users to purchase subscriptions to plans with limited seats. It handles complex scenarios like:
- **Concurrency:** Preventing over-booking when multiple users try to buy the last seat simultaneously using database transactions (`FOR UPDATE`).
- **Idempotency:** Ensuring users don't get charged twice or subscribed to the same plan multiple times.
- **Audit Logging:** Tracking every critical action (Purchase, Upgrade, Cancel, Failure) for transparency.

---

## Features

### Admin Panel
- **Authentication:** Secure Login/Register for Admins.
- **Dashboard:** Real-time stats (Total Revenue, Active Subs, User Count).
- **Plan Management:** Create, Edit, Suspend (Soft Delete) plans.
- **Audit Logs:** View detailed history of user actions with search filters (Name/Email/Event).
- **Conflict Resolution:** Manually confirm failed subscriptions if needed.

### 👤 User Application
- **Authentication:** Secure Register/Login.
- **Plan Browsing:** View available plans with live seat counts.
- **Subscription Lifecycle:**
  - **Purchase:** Buy a plan (handles race conditions).
  - **Upgrade/Downgrade:** Switch plans with atomic updates (Old plan canceled, New plan activated).
  - **Cancel:** Cancel active subscriptions.
- **Profile:** View current active subscription.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Redux Toolkit (RTK Query), CSS Modules.
- **Backend:** Node.js, Express.js.
- **Database:** PostgreSQL (Relational Data & ACID transactions).
- **State Management:** Redux Toolkit.
- **Caching/State Sync:** RTK Query Tags (`invalidation`).
- **Security:** JWT (JSON Web Tokens), HttpOnly Cookies, CORS configuration.

---

## System Architecture & Design

### 1. Database Schema (PostgreSQL)
* **Users/Admins:** Stores authentication details.
* **Plans:** Stores pricing, duration, total capacity, and `subscriptions_left`.
* **Subscriptions:** Links Users to Plans with start/end dates and status.
* **Audit_Logs:** Records event types (`PLAN_PURCHASED`, `PURCHASE_FAILED`, etc.) and metadata.

### 2. Handling Concurrency (The "Sold Out" Problem)
To prevent overselling:
- We use **PostgreSQL Transactions (`BEGIN` ... `COMMIT`)**.
- We use **Row-Level Locking (`FOR UPDATE`)** when fetching a plan during purchase.
- This ensures that if 2 users try to buy the last seat, the database queues them. The first one gets it, and the second one sees `subscriptions_left = 0` and gets a "Sold Out" error.

### 3. Edge Case Handling
- **Same Plan Check:** Users cannot upgrade to the plan they already hold.
- **Idempotency:** Unique constraints prevent duplicate active subscriptions for the same user.
- **Rollbacks:** If any step fails (e.g., payment success but DB update fail), the entire transaction rolls back to maintain consistency.

---

## Setup & Installation

### Prerequisites
- Node.js installed.
- PostgreSQL installed and running.

### 1. Backend Setup
```bash
# Navigate to backend folder
cd server

# Install dependencies
npm install


# Run Server
npm run dev