# AutoSathi - API Reference 🚖

## Base URL
```
http://localhost:5000/api
```

---

## 🔐 AUTH ROUTES  `/api/auth`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/auth/register` | ❌ | - | Register user or driver |
| POST | `/auth/login` | ❌ | - | Login |
| GET | `/auth/me` | ✅ | any | Get my profile |
| PUT | `/auth/driver/status` | ✅ | driver | Go online/offline |

### Register User
```json
POST /api/auth/register
{
  "name": "Ramesh Kumar",
  "email": "ramesh@gmail.com",
  "phone": "9876543210",
  "password": "password123",
  "role": "user"
}
```

### Register Driver
```json
POST /api/auth/register
{
  "name": "Suresh Auto",
  "email": "suresh@gmail.com",
  "phone": "9876543211",
  "password": "password123",
  "role": "driver",
  "vehicleNumber": "MH12AB1234",
  "vehicleColor": "Yellow"
}
```

### Login
```json
POST /api/auth/login
{
  "email": "ramesh@gmail.com",
  "password": "password123"
}
```

### Driver Online/Offline
```json
PUT /api/auth/driver/status
Authorization: Bearer <token>
{
  "isOnline": true
}
```

---

## 🚕 RIDE ROUTES  `/api/rides`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/rides/fare` | ✅ | user | Calculate fare |
| POST | `/rides` | ✅ | user | Book a ride |
| GET | `/rides/my` | ✅ | user | Booking history |
| GET | `/rides/pending` | ✅ | driver | See available rides |
| GET | `/rides/driver/history` | ✅ | driver | Driver's ride history |
| GET | `/rides/:id` | ✅ | any | Get ride details |
| PUT | `/rides/:id/accept` | ✅ | driver | Accept ride |
| PUT | `/rides/:id/start` | ✅ | driver | Start ride |
| PUT | `/rides/:id/complete` | ✅ | driver | Complete ride |
| PUT | `/rides/:id/cancel` | ✅ | user/driver | Cancel ride |
| PUT | `/rides/:id/rate` | ✅ | user | Rate driver (1-5 ⭐) |
| PUT | `/rides/:id/location` | ✅ | driver | Update live location |

### Fare Calculation
```json
POST /api/rides/fare
Authorization: Bearer <user_token>
{
  "pickupLocation": "Dadar, Mumbai",
  "dropLocation": "Andheri, Mumbai",
  "distanceKm": 15
}
// Response:
// totalFare: ₹20 + (15 × ₹12) = ₹200
```

### Book a Ride
```json
POST /api/rides
Authorization: Bearer <user_token>
{
  "pickupLocation": "Dadar, Mumbai",
  "dropLocation": "Andheri, Mumbai",
  "distanceKm": 15
}
```

### Cancel Ride
```json
PUT /api/rides/:id/cancel
Authorization: Bearer <token>
{
  "reason": "Changed my mind"
}
```

### Rate Driver
```json
PUT /api/rides/:id/rate
Authorization: Bearer <user_token>
{
  "rating": 5,
  "comment": "Very smooth ride!"
}
```

### Update Driver Location
```json
PUT /api/rides/:id/location
Authorization: Bearer <driver_token>
{
  "lat": 19.0760,
  "lng": 72.8777
}
```

---

## ⚙️ ADMIN ROUTES  `/api/admin`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/admin/stats` | ✅ | admin | Dashboard stats |
| GET | `/admin/users` | ✅ | admin | All users |
| GET | `/admin/drivers` | ✅ | admin | All drivers |
| GET | `/admin/rides` | ✅ | admin | All rides |
| PUT | `/admin/users/:id/block` | ✅ | admin | Block/unblock user |
| DELETE | `/admin/users/:id` | ✅ | admin | Delete user |
| PUT | `/admin/rides/:id/cancel` | ✅ | admin | Cancel any ride |

### Block User
```json
PUT /api/admin/users/:id/block
Authorization: Bearer <admin_token>
{
  "isBlocked": true
}
```

---

## 🔄 Ride Status Flow

```
pending → accepted → ongoing → completed
   ↓
cancelled (from pending or accepted only)
```

---

## 💰 Fare Formula
```
Base Fare  = ₹20
Per KM     = ₹12
Total Fare = 20 + (distanceKm × 12)

Example: 5 km → ₹20 + (5 × 12) = ₹80
```

---

## 🗂 Project Folder Structure
```
autosathi-backend/
│
├── config/
│   └── db.js               ← MongoDB connection
│
├── controllers/
│   ├── authController.js   ← Register, Login, Profile
│   ├── rideController.js   ← Full ride flow + fare + rating
│   └── adminController.js  ← Admin operations
│
├── middleware/
│   └── authMiddleware.js   ← protect + authorizeRoles
│
├── models/
│   ├── User.js             ← User + Driver schema
│   └── Ride.js             ← Ride schema with all statuses
│
├── routes/
│   ├── authRoutes.js       ← /api/auth
│   ├── rideRoutes.js       ← /api/rides
│   └── adminRoutes.js      ← /api/admin
│
├── .env.example
├── package.json
└── server.js               ← Entry point
```

---

## 🚀 How to Run
```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env

# 3. Start server
npm run dev
```

---

## 👤 Create Admin User (MongoDB)
Run this in MongoDB shell or Compass:
```js
db.users.insertOne({
  name: "Admin",
  email: "admin@autosathi.com",
  phone: "0000000000",
  password: "<bcrypt_hashed_password>",
  role: "admin"
})
```
Or register normally then manually update role to "admin" in MongoDB.
