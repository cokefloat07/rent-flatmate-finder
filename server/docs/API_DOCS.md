# API Documentation

## Authentication Endpoints

### Register User
- **POST** `/api/auth/register`
- **Request**: UserRegister schema
- **Response**: Token

### Login User
- **POST** `/api/auth/login`
- **Request**: UserLogin schema
- **Response**: Token

### Logout
- **POST** `/api/auth/logout`
- **Response**: Success message

## Listings Endpoints

### Get All Listings
- **GET** `/api/listings/`
- **Response**: List[ListingResponse]

### Create Listing
- **POST** `/api/listings/`
- **Request**: ListingCreate schema
- **Response**: ListingResponse

### Get Listing
- **GET** `/api/listings/{listing_id}`
- **Response**: ListingResponse

### Update Listing
- **PUT** `/api/listings/{listing_id}`
- **Request**: ListingUpdate schema
- **Response**: ListingResponse

### Delete Listing
- **DELETE** `/api/listings/{listing_id}`
- **Response**: Success message

## Profile Endpoints

### Get Profile
- **GET** `/api/profiles/`
- **Response**: TenantProfileResponse

### Create Profile
- **POST** `/api/profiles/`
- **Request**: TenantProfileCreate schema
- **Response**: TenantProfileResponse

### Update Profile
- **PUT** `/api/profiles/`
- **Request**: TenantProfileUpdate schema
- **Response**: TenantProfileResponse

## Interests Endpoints

### Get Interests
- **GET** `/api/interests/`
- **Response**: List[InterestResponse]

### Create Interest
- **POST** `/api/interests/`
- **Request**: InterestCreate schema
- **Response**: InterestResponse

### Update Interest
- **PUT** `/api/interests/{interest_id}`
- **Request**: InterestUpdate schema
- **Response**: InterestResponse

## Chat Endpoints

### Get Conversations
- **GET** `/api/chat/conversations`
- **Response**: List[ConversationResponse]

### Get Conversation
- **GET** `/api/chat/conversations/{conversation_id}`
- **Response**: ConversationResponse

### Send Message
- **POST** `/api/chat/messages`
- **Request**: MessageCreate schema
- **Response**: MessageResponse

### Get Messages
- **GET** `/api/chat/messages/{conversation_id}`
- **Response**: List[MessageResponse]

## WebSocket Endpoints

### Chat WebSocket
- **WS** `/ws/chat/{user_id}`
