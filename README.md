# 🎬 MovieFlix & Chill

### Movie Recommendation & Discovery Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-red?style=for-the-badge)](https://movie-flix-chill.vercel.app/)

Discover movies, search for your favorite titles, explore trending searches, and browse movie information through a modern and responsive React application powered by the TMDB API and Appwrite.

![UI Screenshot](./screenshot.png)

![UI Screenshot 2](./screenshot1.png)

---

## 🚀 Features

- 🎬 **Movie Discovery** – Browse popular and trending movies using real-time TMDB data.
- 🔎 **Movie Search** – Search for movies and get results dynamically.
- ⚡ **Debounced Search** – Reduces unnecessary API requests while searching.
- 📈 **Trending Searches** – Tracks popular search terms using Appwrite TablesDB.
- 🔄 **Dynamic Search Analytics** – Search counts are stored and updated in Appwrite.
- 📱 **Responsive Design** – Optimized for desktop, tablet, and mobile devices.
- ⭐ **Movie Information** – View movie posters, ratings, release dates, language, and other metadata.
- ⚡ **Fast Development** – Built with Vite for fast development and optimized production builds.

---

## 🛠️ Tech Stack

### Frontend

- **React 19** – Component-based user interface
- **Vite** – Frontend build tool and development server
- **Tailwind CSS 4** – Responsive and utility-first styling
- **JavaScript (ES6+)** – Application logic

### APIs & Backend

- **TMDB API** – Movie data, search results, posters, ratings, and metadata
- **Appwrite** – Backend-as-a-Service
- **Appwrite TablesDB** – Stores and manages search analytics

### Development Tools

- **Git** – Version control
- **GitHub** – Source code hosting
- **ESLint** – Code quality and linting

---

## 🏗️ Application Architecture

```text
                         ┌─────────────────┐
                         │      User       │
                         └────────┬────────┘
                                  │
                                  ▼
                       ┌────────────────────┐
                       │   React Frontend   │
                       │                    │
                       │ Search / UI /      │
                       │ Movie Components   │
                       └─────────┬──────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
           ┌─────────────────┐       ┌─────────────────┐
           │    TMDB API     │       │    Appwrite     │
           │                 │       │    TablesDB     │
           │ Movie Data      │       │                 │
           │ Search          │       │ Search Counts   │
           │ Posters         │       │ Analytics       │
           └─────────────────┘       └─────────────────┘