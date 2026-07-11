from typing import Optional

from pydantic import BaseModel


class MessageOut(BaseModel):
    id: str
    interest_id: str
    sender_id: str
    content: str
    created_at: str
    read_at: Optional[str] = None