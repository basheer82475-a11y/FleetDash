FleetDash Backend

Project Information

- Project Name: FleetDash – Fleet Telemetry Dashboard
- Project ID: ITS/WEB/1494
- Role: Backend Development

Technology Stack

- Node.js – JavaScript runtime
- Express.js – Backend web framework
- MongoDB – Planned database for vehicle telemetry
- Redis and Socket.IO – Planned real-time communication

Current Implementation

- Created a separate backend directory.
- Initialized the Node.js project using npm.
- Installed Express.js.
- Created an Express server in "server.js".
- Configured the server to run on port 5000.
- Added a GET endpoint at "/".
- Tested the endpoint successfully in a browser.

Setup Instructions

1. Install Dependencies

npm install

2. Start the Server

node server.js

3. Test the Endpoint

Open:

http://localhost:5000/

Expected response:

FleetDash Backend is running!

Planned Work

- MongoDB connection and telemetry schema.
- Vehicle telemetry APIs.
- Worker threads for processing telemetry.
- Redis Pub/Sub integration.
- Socket.IO real-time updates.
- Geospatial boundary validation using Turf.js.
