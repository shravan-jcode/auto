# AutoSathi Frontend 🛺

## Setup

```bash
npm install
npm start
```

Frontend runs on: http://localhost:3000  
Backend must be running on: http://localhost:5000

## Pages

| Route | Who | Description |
|-------|-----|-------------|
| `/` | All | Landing page |
| `/login` | All | Login |
| `/register` | All | Register (rider or driver) |
| `/dashboard` | User | Book rides, fare calculator |
| `/history` | User | Booking history |
| `/ride/:id` | User | Ride detail, cancel, rate driver |
| `/driver` | Driver | See & accept rides, start/complete |
| `/admin` | Admin | Manage users, drivers, rides |

## Color Theme

- **Dark Background**: `#1A1A2E` (auto-dark)
- **Auto Yellow**: `#FFB800` (auto-yellow)
- **Accent**: `#0F3460` (auto-accent)
- **Light BG**: `#F5F5F0` (auto-light)

## Tech Stack

- React 18 + React Router v6
- Tailwind CSS (utility-first)
- Axios (API calls)
- Google Fonts: Baloo 2 + Nunito
