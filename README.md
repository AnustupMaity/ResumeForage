# ResumeForge

ResumeForge is an open-source, minimalist, and highly functional resume builder application. It features a modern, tech-oriented UI inspired by "Nothing OS" and is designed to help you create ATS-friendly, LaTeX-style resumes in minutes.

## Core Features

- **100% Free & Open Source**: No hidden fees, no subscriptions. Everything is available for free.
- **AI-Powered Extraction**: Automatically extracts your skills, experience, and education from unstructured text or uploaded PDF resumes.
- **Live Preview Editor**: Watch your resume format perfectly in real-time as you enter your details.
- **ATS-Friendly PDF Export**: Generate clean, professional PDFs based on industry-standard LaTeX styling.
- **Smart Data Import**: Seamlessly import your data from LinkedIn dumps, raw text, or existing PDF resumes.
- **Secure Storage**: Your resume data is safely stored in Firebase, allowing you to edit and update your resume across devices.

## Tech Stack

- **Frontend**: React, Vite
- **Styling**: Vanilla CSS with custom Nothing UI monochromatic design system
- **Backend/Database**: Firebase (Auth, Firestore, Cloud Functions)
- **AI Integration**: Gemini API (via Firebase Cloud Functions)
- **PDF Processing**: pdfjs-dist for client-side PDF parsing and extraction

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Setup Firebase configuration in a `.env` file (if applicable)
4. Start the development server: `npm run dev`

## Design Philosophy

The UI is built with a focus on structure, minimalism, and clarity. It uses a monochromatic palette (black backgrounds, white text) with stark red accents and dot-matrix typography, drawing heavy inspiration from modern digital aesthetic trends.
