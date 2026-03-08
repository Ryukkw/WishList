from decimal import Decimal
from pydantic import BaseModel


class ReserveRequest(BaseModel):
    guest_name: str
    guest_identifier: str


class UnreserveRequest(BaseModel):
    guest_identifier: str


class ContributeRequest(BaseModel):
    guest_name: str
    guest_identifier: str
    amount: Decimal
