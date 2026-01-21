# Fullstack Food Ordering App with Next.js

A comprehensive full-stack food ordering platform built with Next.js 16. Users can browse menus, customize items, manage carts, and pay with Stripe; staff and admins can control menu items, categories, couriers, and orders with role-based permissions, loyalty tracking, delivery assignment, and real-time analytics. The app ships with end-to-end flows: authentication, profile management, checkout, delivery tracking with live courier maps, and admin dashboards for orders, couriers, users, and category/menu maintenance.

**Production:** [https://foacwd.vercel.app/]

## Project Description

This is a modern food ordering platform that allows customers to browse menus, customize items, add to cart, place orders, and track deliveries. Administrators can manage restaurant operations end to end: menu items and categories, inventory images via Cloudinary, user accounts, courier onboarding and location tracking, delivery assignment, and analytics/exports. The stack includes role-based access control, secure payments with Stripe, loyalty point accumulation, delivery fee calculations, profile editing with avatars, and real-time order tracking with courier location overlays on Leaflet maps.

### Recent Updates (January 2026)

#### Courier Location Tracking

- **Real-time Location Updates**: Couriers can now share their live location while making deliveries
- **Map Visualization**: Interactive maps powered by Leaflet showing both courier (red marker) and customer (blue marker) locations
- **Auto-Polling**: Map automatically fetches courier location every 60 seconds for minimal database load
- **Immediate Refresh**: Location updates appear instantly on the map after sharing
- **Distance Validation**: Prevents unrealistic location jumps (max 50km between updates) to catch bad GPS data
- **Permission-Based**: Respects browser geolocation permissions with graceful fallbacks
- **Location History**: Tracks last update timestamp for verification

## 🚀 Technologies Used

### **Frontend**

- **Next.js 16.0.7** - React framework with App Router
- **React 19.2.0** - UI library
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Component system built on Radix ([Studio](https://shadcnstudio.com/) and [Docs](https://ui.shadcn.com/))
- **Radix UI** - Headless UI components (Alert Dialog, Avatar, Dropdown Menu, Label, Select, Slot)
- **Lucide React** - Icon library
- **React Icons** - Additional icon library
- **React Hook Form 7.69.0** - Form management
- **Zod 4.2.1** - Schema validation
- **@hookform/resolvers 5.2.2** - Form validation resolver
- **Next Themes 0.4.6** - Dark mode support
- **React Hot Toast 2.6.0** - Toast notifications
- **Recharts 2.15.4** - Data visualization and charts

### **Backend & Database**

- **MongoDB 6.21.0** - Database client
- **Mongoose 9.0.0** - MongoDB ODM
- **NextAuth.js 4.24.13** - Authentication
- **@auth/mongodb-adapter 3.11.1** - NextAuth MongoDB adapter
- **Bcrypt 6.0.0** - Password hashing

### **Payment Processing**

- **Stripe 20.1.0** - Payment gateway
- **@stripe/react-stripe-js 5.4.1** - React components for Stripe

### **Image Storage**

- **Cloudinary 2.8.0** - Cloud image storage and management

### **Maps & Location**

- **Leaflet 1.9.4** - Interactive maps
- **React Leaflet 5.0.0** - React components for Leaflet
- **@types/leaflet 1.9.21** - TypeScript types for Leaflet
- **leaflet-defaulticon-compatibility 0.1.2** - Icon compatibility

## 👨‍💼 Courier Features

### Location Tracking System

- **Share Location**: Couriers can share their real-time GPS location while on delivery
- **Live Map Display**: Dual-marker map showing courier position (red) and delivery destination (blue)
- **Route Visualization**: Visual route line connecting courier to customer on the map
- **60-Second Auto-Polling**: Automatically fetches location updates every minute without overwhelming the database
- **Immediate Updates**: Location appears on map instantly after sharing, not after the 60-second poll
- **Location Validation**:
  - Prevents location spoofing by validating coordinate ranges
  - Rejects jumps > 50km between consecutive updates
  - Tracks update timestamps for verification

### API Endpoints for Couriers

```api
POST /api/courier/location
- Share or update courier's current location
- Body: { latitude: number, longitude: number }
- Returns: Updated location with timestamp

GET /api/courier/location
- Fetch courier's current location
- Returns: { location: { latitude, longitude, lastLocationUpdate } }
```

### Database Schema

Couriers have the following location-related fields:

```typescript
latitude: Number | null           // Current latitude (null if not shared)
longitude: Number | null          // Current longitude (null if not shared)
lastLocationUpdate: Date | null   // Timestamp of last location update
```

## 🗺️ Maps & Location

### **Development Tools**

- **ESLint 9** - Code linting
- **PostCSS** - CSS processing
- **tw-animate-css 1.4.0** - Tailwind animations

## 🔗 Third-Party Services Setup

### **Google Cloud Console**

Create OAuth credentials for Google authentication:

- [https://console.cloud.google.com/](https://console.cloud.google.com/)
- Set up OAuth 2.0 credentials for Google Sign-In

### **Cloudinary**

Set up cloud storage for menu item images:

- [https://cloudinary.com/](https://cloudinary.com/)
- All uploaded images are stored and managed here

### **MongoDB Atlas**

Your database is hosted on MongoDB Atlas:

- [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Create a cluster and get your connection string

### **Stripe**

Track all payments and manage subscriptions:

- [https://stripe.com/](https://stripe.com/)
- Set up your Stripe account and get API keys
- Install Stripe CLI: [https://docs.stripe.com/stripe-cli](https://docs.stripe.com/stripe-cli)

### **Stripe Webhook Testing**

To test Stripe webhooks locally, install the Stripe CLI, then from your working directory (for example `cd Desktop`) run:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

Or use the npm script:

```bash
npm run stripe:listen
```

## ⚙️ Environment Variables

Create a `.env` file in the root directory with the following variables (see `example.env` for reference):

- MongoDB connection string
- NextAuth configuration
- Google OAuth credentials
- Cloudinary credentials
- Stripe API keys

## 📋 Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run stripe:listen    # Listen to Stripe webhooks
npm run stripe:trigger   # Trigger Stripe test events
```

---

## Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
