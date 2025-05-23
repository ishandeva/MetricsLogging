"""
This script generates dummy model runtime metrics and outputs them to a file "model_metrics.log"
"""
import json
#import time
from datetime import datetime
from pathlib import Path
import numpy as np
from random import randint

NUM_STEPS = 1000
LOG_FILE = Path("model_metrics.log")


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


def write_metric(metric_type: str, step: int, metric: str, value: float):
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "step": step,
        "type": metric_type,
        "metric": metric,
        "value": round(value, 6),
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")


def run():
    LOG_FILE.unlink(missing_ok=True)  # Clear previous logs
    for step in range(NUM_STEPS):
        acc, loss = training_step(step)
        val_acc, val_loss = validation_step(step)
        test_acc, test_loss = test_step(step)
        gpu = get_gpu_utilization(step)

        write_metric("train", step, "accuracy", acc)
        write_metric("train", step, "loss", loss)
        write_metric("val", step, "accuracy", val_acc)
        write_metric("val", step, "loss", val_loss)
        write_metric("test", step, "accuracy", test_acc)
        write_metric("test", step, "loss", test_loss)
        write_metric("system", step, "gpu_util", gpu)

        #time.sleep(0.5)  # Simulate training time


if __name__ == "__main__":
    run()
