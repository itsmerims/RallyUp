# RallyUp - Badminton Club Manager

RallyUp is a modern, full-stack application designed to help badminton clubs easily manage players, courts, and matchmaking.

## Features

- **Player Management**: Register players with skill tiers (Beginner, Low Intermediate, Intermediate, Advanced) and track their ELO-style ratings and win/loss statistics.
- **Real-Time Matchmaking**: Drag-and-drop players into courts to seamlessly create matches.
- **Court Management**: Track which courts are currently active, waiting for players, or available.
- **Financial Tracking**: Track shuttlecocks used per match and calculate fees.
- **Authentication**: Secure login using Firebase Authentication (Google Sign-In and Email/Password).
- **Cloud Sync**: All data is stored and synced in real-time using Firebase Firestore.
- **3D Visualizations**: Beautiful 3D representations of badminton courts using React Three Fiber.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **State Management**: Zustand
- **Backend & Database**: Firebase (Authentication, Firestore)
- **3D Graphics**: Three.js, React Three Fiber (@react-three/fiber, @react-three/drei)
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable

## Getting Started

1. Clone the repository.
2. Run `npm install` to install all dependencies.
3. Set up a Firebase project and add your configuration variables to `.env.example` to create a `.env` file.
4. Run `npm run dev` to start the development server.

## Deployment

The app can be deployed to Vercel, Firebase Hosting, or any static hosting provider. Since it uses Firebase for the backend, ensure your environment variables are correctly set in your hosting platform.

## Author

Developed for badminton enthusiasts to simplify club operations.
