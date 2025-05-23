from pydantic import BaseModel
from datetime import datetime

class Metric(BaseModel):
    timestamp: datetime
    step: int
    type: str
    metric: str
    value: float