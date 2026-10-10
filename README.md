# 💧 AquaConnect — Smart Water Delivery Management System

AquaConnect is a modern, high-performance, specialized POS and delivery management platform specifically designed for the **water-can and water-bottle supply business** (20L jars, 10L cans, packaged water bottles, dispenser bubble tops).

It features a dual-sided architecture:
1. **React.js Web Application & Dashboard**: Enterprise POS, dispatch center, can inventory tracker, customer credit manager, and sales reporting.
2. **Flutter Mobile Application**: Clean, on-the-go experience for delivery drivers, plant supervisors, and retail/home customers.
3. **Firebase Cloud Backend**: Role-based authentication, Cloud Firestore with real-time listeners, Storage, and production security rules.

---

## 🏗️ Architecture & Technology Stack

### Frontend (Web)
- **Framework**: React.js 18 + Vite
- **Styling**: Tailored Water/Aqua Design System with CSS Variables, Glassmorphism, and responsive breakpoints (Desktop sidebar + Mobile bottom nav)
- **Icons**: Lucide React
- **Animations & Effects**: Canvas Confetti, subtle ripple glows, and smooth transitions
- **Persistence & Realtime**: Unified Firebase / Firestore reactive engine with automatic active sync and live event pub-sub

### Frontend (Mobile)
- **Framework**: Flutter 3 (Dart 3)
- **State Management**: `provider` (MultiProvider with `AuthProvider` and `CartProvider`)
- **Design**: Material 3 with customized `AquaTheme` palette

### Backend
- **Firebase Authentication**: Email & password authentication with strict role enforcement.
- **Cloud Firestore**: Real-time collections for `users`, `suppliers`, `products`, `customers`, `orders`, `deliveries`, `payments`, `inventory`, and `notifications`.
- **Firebase Security Rules**: Granular role-based security rules ensuring customers cannot inspect supplier figures and suppliers only manage their plant data.

---

## 👥 Dual-Portal Roles & Features

### 1. Welcome & Authentication
- **Clean Aqua Landing**: Direct role selection between **[Supplier Login]** and **[Customer Login]**.
- **Role Isolation**: Strict redirection based on the user's Firestore role attribute (`supplier` or `customer`). Customers cannot open supplier pages and vice-versa.
- **Fast 1-Click Demo Evaluation**: One-click demo buttons allowing instant evaluation as **Supplier (Rajesh)** or **Customer (Ramesh)** with zero setup.

---

### 2. Supplier Portal (POS & Plant Management)
- **Operational Dashboard**:
  - Today's Orders, Pending Approvals, Confirmed, Out for Delivery, Delivered.
  - Today's Revenue and Pending Payments counter.
  - Live recent orders list with quick status transitions.
- **Order Management**:
  - Filter orders by date, customer, and 6-stage status (`Pending`, `Confirmed`, `Preparing`, `Out for Delivery`, `Delivered`, `Cancelled`).
  - Search by Order ID, customer phone number, or locality.
  - Accept, reject, or assign orders to delivery vans.
  - Printable delivery challans / tax receipts with GST and returnable can deposit notes.
- **Water Products Catalog**:
  - Full CRUD management for:
    - 20L Water Can (Returnable Jar)
    - 10L Water Can (Returnable Dispenser Top)
    - 5L Water Bottle (Pack of 2)
    - 1L Water Bottles (Box of 12)
    - 500ml Water Bottles (Box of 24)
    - Custom Water Products
  - Selling price, available volume, container types, and visibility toggle.
- **Customer Directory & Credit Management**:
  - Customer profile, contact number, delivery address, lifetime order count, and gross billing.
  - Outstanding dues / credit tracker with one-click collection clearance.
- **Delivery Fleet Dispatch**:
  - Views for Today's Deliveries, Pending Assignment, and Out for Delivery.
  - Driver assignment (e.g. Suresh, Mahesh, route mini-trucks).
  - Quick action to start delivery or mark fulfilled upon jar return.
- **Can Inventory & Empty Jar Returns**:
  - Can tracking: **Available Stock**, **Delivered Quantity**, **Returned Empty Jars**, and **Damaged Cans**.
  - Automated low-stock alerts triggering plant replenishment notifications.
- **Sales & Analytics Reports**:
  - Daily, weekly, monthly, and custom date range filters.
  - Visual revenue and volume trend charts.
  - Product-wise sales breakdown and customer revenue rankings.
  - **Export to CSV / Excel** and **Print PDF Report**.
- **Plant Profile & Settings**:
  - Plant name, owner details, phone, email, address, GSTIN, purification details (RO + UV + Ozone).
  - Serviced delivery zones and payment toggles (COD, UPI VPA).

---

### 3. Customer Portal (Doorstep Ordering & Tracking)
- **Home Storefront**:
  - Welcome greeting: *"Hello, [Name] — Need water? Order now."*
  - Clean water cards with `[-] 1 [+]` quantity selector and instant Add-to-Cart.
- **Cart & Checkout**:
  - Sliding drawer with item summary, delivery address, and date/slot selection (`Morning`, `Noon`, `Afternoon`, `Evening`).
  - Payment choices: **Cash on Delivery (COD)**, **UPI QR code**, or **Online Card**.
  - Order placed celebration with confetti and instant **Order ID #AC1025** generation.
- **Order Tracking & History**:
  - Categorized under Active Deliveries, Past Orders, and Cancelled.
  - Real-time 5-stage timeline: `Order Placed` ➔ `Confirmed` ➔ `Preparing` ➔ `Out for Delivery` ➔ `Delivered`.
  - View delivery slips / invoices.
- **Consumption & Expense Reports**:
  - Total cans ordered, total water expenditure, and monthly spending chart.
- **Customer Profile**:
  - Personal information, primary delivery address, and saved address book (Home, Office, Shop).

---

## 🗄️ Firestore Database Schema

```text
users/{userId}
  ├── uid: string
  ├── name: string
  ├── email: string
  ├── phone: string
  ├── role: "supplier" | "customer"
  ├── profileImage: string
  ├── address: string
  ├── createdAt: timestamp
  └── updatedAt: timestamp

suppliers/{supplierId}
  ├── businessName: string
  ├── ownerName: string
  ├── phone: string
  ├── email: string
  ├── address: string
  ├── city: string
  ├── logo: string
  ├── gstNumber: string
  ├── deliveryAreas: array<string>
  ├── paymentSettings: map
  └── createdAt: timestamp

products/{productId}
  ├── supplierId: string
  ├── name: string
  ├── description: string
  ├── price: number
  ├── image: string
  ├── stock: number
  ├── unit: string
  ├── containerType: string
  ├── isActive: boolean
  └── updatedAt: timestamp

orders/{orderId}
  ├── orderId: string (e.g. "AC1025")
  ├── customerId: string
  ├── customerName: string
  ├── customerPhone: string
  ├── supplierId: string
  ├── items: array<{productId, name, quantity, price, unit}>
  ├── totalAmount: number
  ├── deliveryAddress: string
  ├── deliveryDate: string
  ├── deliveryTime: string
  ├── deliveryPerson: string
  ├── paymentMethod: string
  ├── paymentStatus: string ("Pending" | "Paid")
  ├── orderStatus: string ("Pending" | "Confirmed" | "Preparing" | "Out for Delivery" | "Delivered" | "Cancelled")
  ├── timeline: array<{status, time, note}>
  └── createdAt: timestamp

inventory/{inventoryId}
  ├── supplierId: string
  ├── productId: string
  ├── productName: string
  ├── containerType: string
  ├── availableStock: number
  ├── soldQuantity: number
  ├── returnedQuantity: number
  ├── damagedQuantity: number
  └── lowStockThreshold: number

deliveries/{deliveryId}
  ├── orderId: string
  ├── supplierId: string
  ├── customerId: string
  ├── deliveryPersonName: string
  ├── deliveryAddress: string
  ├── status: string
  └── assignedAt: timestamp

notifications/{notificationId}
  ├── userId: string
  ├── role: string
  ├── title: string
  ├── message: string
  ├── type: string
  ├── isRead: boolean
  └── createdAt: timestamp
```

---

## 🔒 Security Rules (`firestore.rules`)
- **Role Authorization**: Customers only read/write their own orders; Suppliers only read/write their business plant data.
- **Dashboard Shield**: Customers cannot read supplier analytics, inventory, or driver allocations.
- **Audit Preservation**: Direct client deletions of users and historical audit logs are forbidden.

---

## 🚀 How to Run the Project

### 1. Web Application (React + Vite)
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```
Open **`http://localhost:3000`** in your browser.

### 2. Mobile Application (Flutter)
```bash
cd aquaconnect_mobile

# Fetch packages
flutter pub get

# Run on connected device, emulator, or chrome
flutter run
```

### 3. Connecting to Live Firebase (Optional)
AquaConnect runs **out of the box** with instant real-time sync and pre-populated water delivery seed data. To connect to your actual Firebase project:
1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication** (Email/Password) and **Cloud Firestore**.
3. Create a `.env.local` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
4. Deploy security rules:
```bash
firebase deploy --only firestore:rules
```
