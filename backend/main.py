import asyncio
from collections import deque, defaultdict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from fastapi.encoders import jsonable_encoder
#Import the created Metric Schema
from backend.schemas import Metric
#======================================================================================================

app = FastAPI(title="Realtime Metrics API")

#CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

#In-Memory Store for metrics
data_buffer: deque[Metric] = deque(maxlen=1000)

#Connection Manager for Websocket Clients
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        """
        Send a Json-Serializable message to all active clients
        """
        living =[]
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
                living.append(conn)
            except WebSocketDisconnect:
                #Drop disconnected clients
                pass
        self.active_connections = living

manager = ConnectionManager()

#Dependency to get buffer snapshot
async def get_buffer():
    return list(data_buffer)

@app.post("/webhook", status_code=204)
async def receive_metric(metric: Metric):
    """
    Webhook endpoint: receive a single Metric object posted by the generator.
    """
    # Append to buffer
    data_buffer.append(metric)
    # Broadcast to WebSocket clients
    payload = jsonable_encoder(metric)
    await manager.broadcast(payload)
#    return None

@app.get("/metrics")
# async def get_metrics(n: int = 50, buffer: List[Metric] = Depends(get_buffer)):
#     """
#     Return the latest n metrics.
#     """
#     if n < 1 or n > len(buffer):
#         # clamp n to buffer size
#         n = min(max(n, 1), len(buffer))
#     return buffer[-n:]
async def get_metrics_grouped(n: int = 50, buffer: List[Metric] = Depends(get_buffer)):
    n = min(max(n, 1), len(buffer))
    recent = buffer[-n:]

    grouped = defaultdict(lambda: defaultdict(list))
    for m in recent:
        grouped[m.type][m.metric].append({"step": m.step, "value": m.value})

    return JSONResponse(content=grouped)

@app.get("/metrics/raw", response_model=List[Metric])
async def get_metrics_raw(n: int = 50, buffer: List[Metric] = Depends(get_buffer)):
    n = min(max(n,1), len(buffer))
    return buffer[-n:]

@app.websocket("/ws/metrics")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for live metrics.
    Clients receive each new metric as soon as it's posted to /webhook.
    """
    await manager.connect(websocket)
    try:
        # Keep connection open; optionally handle incoming messages
        while True:
            await asyncio.sleep(1) #Just to keep the connection open
    except WebSocketDisconnect:
        manager.disconnect(websocket)
