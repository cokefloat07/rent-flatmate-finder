# System Design

## Architecture Overview

The Rent Flatmate Finder is a modern web application designed to connect landlords with potential tenants and help tenants find compatible roommates/listings.

## Key Components

### Backend
- **FastAPI**: RESTful API framework
- **MongoDB**: NoSQL database for flexible data storage
- **PyJWT**: JWT-based authentication
- **Pydantic**: Data validation and serialization

### Frontend
- React-based web application (separate repository)
- Real-time chat with WebSocket support

### Services
- **LLM Service**: AI-powered compatibility scoring and recommendations
- **Email Service**: Notifications and verification emails
- **Chat Service**: Real-time messaging via WebSocket

## Data Flow

### User Registration & Authentication
1. User registers with email and credentials
2. Password is hashed using bcrypt
3. JWT token is generated for session management
4. User can then create their profile (landlord or tenant)

### Listing Management
1. Landlords create property listings
2. Listings are stored in MongoDB
3. Search and filtering done on backend

### Tenant-Listing Matching
1. System calculates compatibility scores using:
   - Rule-based scoring (budget, amenities, location)
   - LLM-based scoring (AI evaluation)
2. Scores are cached for performance
3. Recommendations are generated based on scores

### Messaging & Chat
1. Users can initiate conversations
2. Real-time chat via WebSocket
3. Messages stored in MongoDB
4. Typing indicators and read receipts

## Security Considerations
- Password hashing with bcrypt
- JWT token-based authentication
- HTTPS for all communications
- Input validation with Pydantic
- CORS configuration
- Rate limiting (to be implemented)

## Scalability
- MongoDB for horizontal scaling
- Stateless API design
- WebSocket connection pooling
- Caching for compatibility scores
- Async/await for concurrent operations

## Deployment
- Docker containerization
- Environment-based configuration
- Database migration scripts
- Admin seed script for initial setup
