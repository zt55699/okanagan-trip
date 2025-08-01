# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a static web application for an interactive Okanagan travel planner. It's a pure client-side application built with vanilla HTML, CSS, and JavaScript that displays an interactive map with travel routes from Burnaby to Okanagan, BC.

## Architecture
- **Pure Static Site**: No build process, server, or package management required
- **Client-Side Only**: All functionality runs in the browser
- **Map Integration**: Uses Leaflet.js for interactive mapping with routing capabilities
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox

## Core Components

### Map System (script.js)
- `locations` object: Contains all coordinate data for destinations and attractions
- `dayRoutes` object: Defines 3-day travel itinerary with waypoints
- `initMap()`: Initializes Leaflet map with OpenStreetMap tiles
- `showDayRoute()`: Displays route for selected day with markers and routing
- Map uses Leaflet Routing Machine for turn-by-turn directions

### Styling Architecture (styles.css)
- CSS Grid for layout structure
- CSS custom properties for theming (gradients, colors)
- Responsive breakpoints at 768px for mobile
- Timeline component for itinerary display (currently removed from UI)

## Development Workflow

### Local Development
Simply open `index.html` in a web browser - no build process required.

### Deployment
Automatic deployment to GitHub Pages via GitHub Actions:
- Triggered on push to `main` branch
- Uses standard Pages deployment workflow
- No build step - deploys static files directly

### Map Configuration
To modify routes or add locations:
1. Update `locations` object in `script.js` with new coordinates
2. Modify `dayRoutes` object to include new waypoints
3. Add corresponding UI elements in HTML if needed

## External Dependencies
- **Leaflet.js**: Core mapping library (loaded via CDN)
- **Leaflet Routing Machine**: Route calculation and display
- **Font Awesome**: Icon library for UI elements
- **OpenStreetMap**: Map tile provider (free, no API key required)

## Map Data Structure
The application uses a predefined set of coordinates for British Columbia locations. Route calculation is handled by Leaflet Routing Machine which automatically generates driving directions between waypoints.

## Current State
The UI has been simplified to show only the header and full-screen map. The detailed itinerary sections have been removed, but the underlying route data and functionality remain intact in the JavaScript code.