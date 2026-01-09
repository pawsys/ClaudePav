# Basalt - Liquid Democracy Platform

> Using liquid democracy to crowdsource priorities from networks

## Overview

Basalt is a platform that enables communities to identify and fund priorities through a liquid democracy voting system. Users receive 100 votes monthly which they can allocate to other users, problems, or solutions. Funding follows votes through the network to support the most important initiatives.

## Key Features

### 🗳️ Liquid Democracy Voting
- Each user receives 100 votes per month
- Allocate votes to:
  - **Users**: Delegate voting power to trusted experts
  - **Problems**: Highlight critical issues
  - **Solutions**: Support organizations working on solutions
- Votes flow through the network, amplifying community priorities

### 💰 Funding Mechanism
- Set a monthly budget for supporting initiatives
- Funding automatically follows your vote distribution
- Toggle funding on/off for individual nodes
- Funds trickle down through the network to reach projects

### 📊 Transparent Rankings
- View top problems, solutions, and contributors
- Track vote distributions and funding flows
- Filter by your network or all users
- Monthly resets ensure current priorities are reflected

### 🔄 Knowledge Hub
- Browse and discuss societal problems
- Discover solutions and organizations
- Learn from experts in your areas of interest
- Connect with like-minded community members

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (via Prisma ORM)
- **Authentication**: NextAuth.js (planned)
- **State Management**: React hooks

## Project Structure

```
basalt/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page
│   ├── feed/              # Activity feed
│   ├── problems/          # Problems list and detail pages
│   ├── solutions/         # Solutions list and detail pages
│   ├── users/             # User profiles
│   ├── rankings/          # Rankings page
│   ├── onboarding/        # 3-step onboarding flow
│   └── settings/          # User settings
├── components/            # Reusable UI components
│   ├── Navigation.tsx     # Main navigation bar
│   ├── NodeCard.tsx       # Card for users/problems/solutions
│   └── VoteSlider.tsx     # Vote allocation slider
├── lib/                   # Utility functions
│   ├── prisma.ts          # Prisma client
│   ├── auth.ts            # Authentication setup
│   ├── votes.ts           # Vote management logic
│   └── funding.ts         # Funding distribution logic
└── prisma/
    └── schema.prisma      # Database schema
```

## Database Schema

The application uses the following main models:

- **User**: User accounts with voting and funding capabilities
- **Problem**: Issues that need attention
- **Solution**: Organizations/projects addressing problems
- **Vote**: Vote allocations between nodes
- **VoteAllocation**: Monthly vote budgets (100 per user)
- **FundingAllocation**: Funding distribution following votes
- **Follow**: User following relationships

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd basalt
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

4. Set up the database:
```bash
# Generate Prisma client (Note: may require online access)
npx prisma generate

# Create database and run migrations
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Pages

### Home (`/`)
- Hero section explaining liquid democracy
- Top problems and solutions
- Platform statistics
- "How it works" section

### Feed (`/feed`)
- Activity from your network
- Filter by following, trending, or all activity
- Recent updates on problems and solutions

### Problems (`/problems`)
- Browse all problems
- Filter by category
- Add new problems
- View problem details with voting

### Solutions (`/solutions`)
- Browse all solutions
- Filter by category
- Add new solutions
- View solution details with milestones

### Rankings (`/rankings`)
- Top problems, solutions, and contributors
- Monthly rankings based on votes
- Switch between different views

### Onboarding (`/onboarding`)
- Step 1: Welcome and platform overview
- Step 2: Select problems you care about
- Step 3: Follow experts in your areas

### Settings (`/settings`)
- Profile management
- Monthly funding budget
- Voting preferences
- Notification settings
- Account management

## Development

### Running the App
```bash
npm run dev     # Development server
npm run build   # Production build
npm start       # Production server
```

### Database Management
```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma db push --force-reset
```

## Core Concepts

### Liquid Democracy
Basalt implements liquid democracy, allowing users to:
- Vote directly on issues they understand
- Delegate votes to experts for complex topics
- Change allocations monthly as priorities shift
- Build expertise through community trust

### Vote Flow Algorithm
1. Users receive 100 votes monthly
2. Votes can be allocated to users, problems, or solutions
3. Delegated votes flow through the network
4. Rankings calculated based on total votes (direct + delegated)
5. Monthly reset ensures current priorities

### Funding Distribution
1. Users set monthly funding budget
2. Funding follows vote allocations proportionally
3. Users can opt-out of funding specific nodes
4. Funds flow through network to reach solutions
5. Transparent tracking of funding impact

## About

Basalt was originally developed in 2018 to explore liquid democracy as a mechanism for crowdsourcing priorities. The platform aims to:

- Move beyond the binary choice between direct and representational democracy
- Enable informed decision-making at scale
- Create transparent priority-setting mechanisms
- Fund impactful projects through community consensus
- Build a more engaged and informed populace

---

Built with Next.js, TypeScript, and Tailwind CSS
