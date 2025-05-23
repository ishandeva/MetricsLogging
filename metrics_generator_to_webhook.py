"""
This script generates dummy model runtime metrics and outputs them to stream via a webhook.
"""
import json
import time
from datetime import datetime, timezone
import numpy as np
from random import randint
import requests

API_URL = "http://localhost:8000/webhook"
NUM_STEPS = 1000


def get_gradient_norm(layer: int, step: int) -> float:
    time_decay = 1.0 / (1.0 + step / 1000)
    layer_factor = np.exp(-0.5 * ((layer - 5) ** 2) / 4)
    noise = np.random.uniform(-0.1, 0.1) * (1 - step / NUM_STEPS)
    return (0.5 + layer_factor) * time_decay + noise


def get_gpu_utilization(step: int) -> float:
    base_util = 0.85
    data_loading_drop = 0.2 if step % 10 == 0 else 0.0
    update_spike = 0.1 if step % 5 == 0 else 0.0
    noise = np.random.uniform(-0.05, 0.05)
    return base_util - data_loading_drop + update_spike + noise


def _generate_metric(step: int, factor: float = 1.0) -> float:
    relative_progress = step / NUM_STEPS
    noise = np.random.uniform(-0.3, 0.3) * (1 - relative_progress)
    random_int = randint(0, 1000)
    return 1 / np.log(relative_progress / factor * random_int + 1.1) + noise


def training_step(step: int) -> tuple[float, float]:
    accuracy = 0.45 + 1 / (1 + np.exp(_generate_metric(step)))
    loss = _generate_metric(step)
    return accuracy, loss


def validation_step(step: int) -> tuple[float, float]:
    accuracy = 0.45 + 1 / (1 + np.exp(_generate_metric(step, 20)))
    loss = _generate_metric(step, 20)
    return accuracy, loss


def test_step(step: int) -> tuple[float, float]:
    accuracy = 0.45 + 1 / (1 + np.exp(_generate_metric(step, 30)))
    loss = _generate_metric(step, 30)
    return accuracy, loss



def run():
    for step in range(NUM_STEPS):
        print("Starting metric generation...")
        acc, loss = training_step(step)
        val_acc, val_loss = validation_step(step)
        test_acc, test_loss = test_step(step)
        gpu = get_gpu_utilization(step)

        metrics = [
            {"timestamp": datetime.now(timezone.utc).isoformat(), "step": step, "type": "train", "metric": "accuracy", "value": round(acc,6)},
            {"timestamp": datetime.now(timezone.utc).isoformat(), "step": step, "type": "train", "metric": "loss",     "value": round(loss,6)},
            {"timestamp": datetime.now(timezone.utc).isoformat(), "step": step, "type": "val",   "metric": "accuracy", "value": round(val_acc,6)},
            {"timestamp": datetime.now(timezone.utc).isoformat(), "step": step, "type": "val",   "metric": "loss",     "value": round(val_loss,6)},
            {"timestamp": datetime.now(timezone.utc).isoformat(), "step": step, "type": "test",  "metric": "accuracy", "value": round(test_acc,6)},
            {"timestamp": datetime.now(timezone.utc).isoformat(), "step": step, "type": "test",  "metric": "loss",     "value": round(test_loss,6)},
            {"timestamp": datetime.now(timezone.utc).isoformat(), "step": step, "type": "system","metric": "gpu_util",  "value": round(gpu,6)},
        ]

        for m in metrics:
            try:
                response = requests.post(API_URL, json=m)
                print(f"Posted: {m} => status {response.status_code}")
            except Exception as e:
                print(f"Failed posting metric: {e}")

        time.sleep(0.1)  # Simulate training time


if __name__ == "__main__":
    run()
