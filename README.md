## Features

### Real-Time Communication
- WebSocket-based real-time messaging between users in chat rooms.

### Room-Based User Management
- Users can join specific chat rooms.
- Room-based message broadcasting to all participants.

### Redis Integration
- Redis is used for:
  - Managing connected users (`usersConnected`).
  - Subscribing to and publishing messages in rooms (`subscribedChannels`).
  - Rate-limiting logic for users.

### Rate Limiting
- Basic rate-limiting logic to prevent users from sending too many messages in a short time.
- Redis is used to store and manage rate-limiting data.

### Pub/Sub for Scaling
- Redis Pub/Sub is implemented to enable message broadcasting across multiple WebSocket server instances.