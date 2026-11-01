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

## 👥 Multi-Portal Architecture & Roles

### 1. Welcome & Authentication
- **Multi-Role Portal Access**: Direct role selection between **[Customer Login]**, **[Supplier Login]**, and **[Admin Website]**.
- **Role Isolation**: Strict redirection based on the user's Firestore role attribute (`admin`, `super_admin`, `supplier`, `customer`). Cross-role route tampering is strictly prohibited.
- **Fast 1-Click Demo Evaluation Credentials**:
  - 👑 **Platform Administrator**: `admin@aquaconnect.com` / `admin123`
  - ⚡ **Super Administrator**: `superadmin@aquaconnect.com` / `admin123`
  - 🏭 **Water Plant Supplier (Rajesh)**: `supplier@aquaconnect.com` / `supplier123`
  - 🛒 **Retail/Home Customer (Ramesh)**: `customer@aquaconnect.com` / `customer123`

---

### 2. Admin Website & Control Center (`/admin`)
- **Operations Dashboard**: Real-time KPI counters (active orders, revenue, unverified payments, platform subscriptions), plant fulfillment feeds, and quick verification actions.
- **Live Orders Center**: Full cross-plant visibility, direct supplier reassignment, order status transition tracking with live pub-sub sync (no page reload).
- **Direct Payment Verification Queue**: Review direct Cash & UPI payments with UTR/transaction references. Admin actions: `Verify`, `Dispute`, or `Refund`. Direct payments remain `Reported / Pending Verification` until confirmed.
- **User & Supplier Directory**: Manage plant suppliers, delivery drivers, and customers; toggle accounts active/suspended; switch user roles.
- **Platform Subscriptions Management**: Track and manage supplier SaaS subscriptions (`Free Starter ₹0`, `Enterprise Aqua ₹2,999/mo`) with renewal actions.
- **Financial & Delivery Reports**: **Strict Separation of Funds** (PRD Section 10): separates water order value (retained 100% by suppliers via direct payment) from Aqua Connect platform SaaS subscription licensing revenue. Includes CSV report exports.
- **Tamper-Evident Audit Logs**: Complete chronological history of orders created, status changes, direct payments recorded, and admin verifications.

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

payments/{paymentId}
  ├── orderId: string
  ├── supplierId: string
  ├── customerId: string
  ├── amount: number
  ├── method: string ("Cash" | "UPI")
  ├── reference: string (UTR / bank transaction ref)
  ├── status: string ("Reported" | "Verified" | "Disputed" | "Refunded")
  ├── recordedBy: map<{uid, name, role}>
  ├── verifiedBy: map<{uid, name, role}>
  ├── paidAt: timestamp
  └── verifiedAt: timestamp

supplier_subscriptions/{subscriptionId}
  ├── supplierId: string
  ├── planId: string ("plan_starter" | "plan_enterprise")
  ├── planName: string
  ├── amount: number
  ├── status: string ("Active" | "Expired")
  ├── startDate: timestamp
  └── endDate: timestamp

audit_logs/{logId}
  ├── actor: map<{uid, name, role}>
  ├── action: string ("ORDER_CREATED" | "DIRECT_PAYMENT_RECORDED" | "PAYMENT_VERIFIED" | "PAYMENT_DISPUTED" | "SUBSCRIPTION_RENEWED")
  ├── entityType: string
  ├── entityId: string
  ├── metadata: map
  └── timestamp: timestamp
```

---

## 🔒 Security Rules (`firestore.rules`)
- **Admin & Super Admin**: Full platform oversight, direct payment verification, subscription management, and audit log inspection.
- **Supplier Isolation**: Suppliers only read and manage orders assigned to their plant. Cross-supplier access is strictly blocked.
- **Customer Privacy**: Customers can only view their own delivery orders and payment receipts.
- **Audit Immutability**: Historical audit log entries cannot be modified or deleted.

---

## 🚀 How to Run & Test the Project

### 1. Run Automated PRD Verification Suite
Runs the 31-test integration suite verifying authoritative pricing, strict supplier isolation, direct payments, partial payments, and revenue separation:
```bash
npm run test:prd
```

### 2. Web Application (React + Vite)
```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Optimized production build (with modular chunk splitting)
npm run build
```

### 3. Deploy to Firebase (Hosting & Firestore)
```bash
# Deploy Web Hosting only
npm run deploy:web

# Deploy Hosting and Firestore Security Rules
npm run deploy:all
```

### 4. Mobile Application (Flutter)
```bash
cd aquaconnect_mobile

# Fetch packages
flutter pub get

# Run on connected device, emulator, or chrome
flutter run
```

### 5. Connecting to Live Firebase (Optional)
AquaConnect runs **out of the box** with instant real-time sync and pre-populated seed data. To connect to your actual Firebase project:
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
