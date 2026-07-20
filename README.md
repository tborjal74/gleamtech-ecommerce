
## Gleamtech E-Commerce

  Gleamtech E-Commerce is an online platform for browsing and ordering cleaning solutions from Gleamtech. The site allows customers to view available products, check product details, place orders, and choose a preferred delivery or pickup option.

  The platform is designed to provide a simple and convenient shopping experience for customers while giving administrators the tools needed to manage product listings, track orders, monitor sales, and maintain store operations efficiently. 

## Key Features

  - Product catalog for Gleamtech cleaning solutions
  - Customer account registration and login
  - Shopping cart and order placement
  - Efficient Delivery and pickup order options
  - Admin management for products, orders, and listings
  - Sales and order tracking for business insights


## Tech Stack

  - Frontend: React, TypeScript, Vite
  - Styling and UI: Tailwind CSS, Radix UI, Material UI, Lucide React
  - Backend: NestJS, Express, TypeScript
  - Database and ORM: PostgreSQL, Prisma
  - Authentication and security: bcrypt, cookie-based sessions, CSRF protection, Helmet, NestJS Throttler
  - Email and integrations: SendGrid, Google OAuth
  - Testing and tooling: Jest, ts-jest, npm scripts

## Purpose


  This project was built to support Gleamtech’s online sales operations by making its cleaning products more accessible to customers and easier to manage through a centralized e-commerce system

## Running locally

  Install Node.js 20 or newer, then run `npm install` to install the dependencies.

  Run `npm run dev` to start both the React app and the backend API.

  - React app: http://localhost:5173
  - Backend API: http://localhost:4000
  - Health check: http://localhost:4000/health
  - Example proxied API route: http://localhost:5173/api/status

## Backend commands

  - `npm run dev:server` starts the backend only.
  - `npm run build:server` compiles the backend into `dist/server`.
  - `npm start` runs the compiled backend.
  - `npm run db:deploy` applies committed database migrations.
  - `npm run db:seed-admin` explicitly creates or updates the initial administrator account.

## Database data policy

  Product, inventory, homepage, promotion, and review content is read from the live PostgreSQL database. Product demo data is not seeded during install, build, migration, or application startup. Manage storefront records through the administrator screens.

  Deployments should run `npm run db:deploy` before starting the server. Do not add a product seed command to the build or start command: migrations change the schema, while administrator actions own production content.

  Product uploads should use Cloudinary in production. Set the backend-only Render variable `CLOUDINARY_URL` to the value from the Cloudinary console (`cloudinary://API_KEY:API_SECRET@CLOUD_NAME`). Enter only the value: do not include `CLOUDINARY_URL=`, quotes, or an `https://` prefix. Then run the normal migration and build commands. New uploads are stored in Cloudinary and their CDN URLs plus public IDs are stored in PostgreSQL; deleting a product image also removes the Cloudinary asset. Never expose `CLOUDINARY_URL` or the API secret to the frontend.

  If `CLOUDINARY_URL` is absent, local storage remains available for local development. Existing local uploads must be re-uploaded once to move them to Cloudinary. Missing image files intentionally return 404 so failed uploads and lost storage are visible in the browser console.
