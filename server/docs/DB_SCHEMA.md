# Database Schema

## Collections

### users
| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | Auto-generated |
| name | string | |
| email | string | Unique index |
| password_hash | string | bcrypt |
| role | enum | owner \| tenant \| admin |
| created_at | datetime | UTC |

### listings
| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| owner_id | string | ref → users._id |
| location | string | |
| rent | float | |
| available_from | date | |
| room_type | enum | single \| double \| shared \| studio |
| furnishing_status | enum | furnished \| semi-furnished \| unfurnished |
| photos | string[] | URLs/paths |
| is_filled | bool | false = available |
| created_at | datetime | UTC |

**Indexes:** owner_id, location, rent, is_filled

### tenant_profiles
| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| tenant_id | string | ref → users._id, 1-to-1 |
| preferred_location | string | |
| budget_min | float | |
| budget_max | float | |
| move_in_date | date | |
| created_at | datetime | UTC |

**Indexes:** tenant_id

### interests
| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| tenant_id | string | ref → users._id |
| listing_id | string | ref → listings._id |
| status | enum | pending \| accepted \| declined |
| created_at | datetime | UTC |
| responded_at | datetime? | set on owner response |

**Indexes:** tenant_id, listing_id, compound (tenant_id, listing_id)

### compatibility_scores
| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| tenant_id | string | |
| listing_id | string | |
| score | float | 0–100 |
| explanation | string | human-readable reasoning |
| method | enum | llm \| rule-based |
| computed_at | datetime | UTC |

**Indexes:** compound (tenant_id, listing_id) — unique; checked before LLM call

### messages
| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| interest_id | string | ref → interests._id (chat room key) |
| sender_id | string | ref → users._id |
| content | string | |
| created_at | datetime | UTC |
| read_at | datetime? | null = unread |

**Indexes:** interest_id, sender_id, compound (interest_id, created_at) for pagination

## Relationships