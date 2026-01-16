# Fullstack Food Ordering App with Next.js

A comprehensive full-stack food ordering application built with Next.js 16, featuring user authentication, menu management, shopping cart, order tracking, payment processing, and delivery management. This application includes admin panels for managing menu items, orders, users, and couriers, along with real-time statistics and analytics.

## Project Description

This is a modern food ordering platform that allows users to browse menus, add items to cart, place orders, and track deliveries. Administrators can manage the entire restaurant operation including menu items, categories, orders, and user accounts. The application features role-based access control, secure payment processing via Stripe, and real-time order tracking with delivery assignment to couriers.

## 🚀 Technologies Used

### **Frontend**

- **Next.js 16.0.7** - React framework with App Router
- **React 19.2.0** - UI library
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
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

### **Stripe Webhook Testing**

To test Stripe webhooks locally, run this command in your terminal:

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
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run stripe:listen    # Listen to Stripe webhooks
npm run stripe:trigger   # Trigger Stripe test events
```

---

## Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
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
