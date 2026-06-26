# RallyUp - Badminton Club Manager

RallyUp is a modern, full-stack application designed to help badminton clubs easily manage players, courts, and matches with real-time cloud persistence and interactive 3D visualizations.

## Features

- **Player Management**: Register players with skill tiers (Beginner, Low Intermediate, Intermediate, Advanced), track their ELO-style ratings, win/loss records, and active/resting statuses.
- **Collapsible 3D Court Monitor**: An interactive 3D scene representing the court layouts in real-time. Can be toggled open or collapsed with a single click to maximize screen space. Features full panning, rotating, and zooming controls powered by `MapControls`.
- **Dynamic 3D Player Representation**: Real-time 3D avatar visualization on the courts. Active players are rendered directly on the court in their respective halves (Team A vs. Team B) and are color-coded based on their skill tier:
  - 🔘 **Beginner** (Slate Grey)
  - 🔵 **Low Intermediate** (Blue)
  - 🟢 **Intermediate** (Emerald Green)
  - 🟣 **Advanced** (Purple)
- **Real-Time Matchmaker**: A smart matchmaking modal that calculates optimal balanced games based on ELO, skill weights, and court history.
- **Financial Tracking**: Track shuttlecocks consumed per match and automatically calculate accurate play/court fee contributions.
- **Real-Time Cloud Sync**: Completely backed by Firebase Firestore to securely store, synchronize, and update your roster and active courts across devices instantly.
- **Authentication**: Secured using Firebase Authentication with support for Google Sign-In and Email/Password flows.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Animations**: `motion` (fka Framer Motion) for smooth collapsible transitions
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **State Management**: Zustand
- **Backend & Database**: Firebase (Authentication, Firestore)
- **3D Graphics**: Three.js, React Three Fiber (`@react-three/fiber`, `@react-three/drei`)
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`

## Getting Started

1. Clone the repository.
2. Install the dependencies using:
   ```bash
   npm install
   ```
3. Setup your environment variables using `.env.example` as a template.
4. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

RallyUp compiles into a single-page application using Vite. Run `npm run build` to generate the production-ready build output in `/dist`.

## Author

Developed for badminton enthusiasts to simplify and elevate club game operations.
