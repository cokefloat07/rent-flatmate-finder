# Rent Flatmate Finder - Backend Server

A modern FastAPI-based backend for the Rent Flatmate Finder application, which connects landlords with potential tenants and helps tenants find compatible roommates/listings.

## Features

- **User Authentication**: Secure registration and login with JWT tokens
- **Listings Management**: Create, read, update, and delete property listings
- **Tenant Profiles**: Create and manage tenant profiles with preferences
- **Compatibility Scoring**: AI-powered and rule-based compatibility matching
- **Real-time Chat**: WebSocket-based messaging between users
- **Admin Panel**: Administrative functions for platform management

## Tech Stack

- **FastAPI**: Modern Python web framework
- **MongoDB**: NoSQL database
- **Pydantic**: Data validation
- **JWT**: Secure authentication
- **WebSocket**: Real-time communication

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the application**
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

## Project Structure

```
server/
├── app/
│   ├── api/           # API routes and endpoints
│   ├── core/          # Configuration and security
│   ├── db/            # Database utilities
│   ├── models/        # Data models
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic services
│   ├── sockets/       # WebSocket handlers
│   └── utils/         # Utility functions
├── docs/              # Documentation
├── scripts/           # Utility scripts
├── tests/             # Test files
└── README.md
```

## API Endpoints

See [API_DOCS.md](docs/API_DOCS.md) for detailed API documentation.

## Database Schema

See [DB_SCHEMA.md](docs/DB_SCHEMA.md) for database schema details.

## System Design

See [SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) for architecture overview.

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black app/
isort app/
```

### Type Checking
```bash
mypy app/
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Contact

For questions or support, please contact [your-email@example.com]
