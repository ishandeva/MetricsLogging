import React, { useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register the components with Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const wsRef = useRef(null);
  const [trainAccData, setTrainAccData] = React.useState({ labels: [], datasets: [{ label: 'Train Accuracy', data: [] }] });
  const [valAccData, setValAccData] = React.useState({ labels: [], datasets: [{ label: 'Val Accuracy', data: [] }] });
  const [gpuData, setGpuData] = React.useState({ labels: [], datasets: [{ label: 'GPU Utilization', data: [] }] });

  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:8000/ws/metrics');
    wsRef.current.onmessage = (evt) => {
      const metric = JSON.parse(evt.data);
      // update chart data (append new point)
      // setData(prev => {
      //   const labels = [...prev.labels, metric.step];
      //   const dataset = { ...prev.datasets[0], data: [...prev.datasets[0].data, metric.value] };
      //   return { labels, datasets: [dataset] };
      // });
      if (metric.type === 'train' && metric.metric === 'accuracy') {
        setTrainAccData(prev => ({
          labels: [...prev.labels, metric.step],
          datasets: [{ ...prev.datasets[0], data: [...prev.datasets[0].data, metric.value] }]
        }));
      } else if (metric.type === 'val' && metric.metric === 'accuracy') {
        setValAccData(prev => ({
          labels: [...prev.labels, metric.step],
          datasets: [{ ...prev.datasets[0], data: [...prev.datasets[0].data, metric.value] }]
        }));
      } else if (metric.type === 'system' && metric.metric === 'gpu_util') {
        setGpuData(prev => ({
          labels: [...prev.labels, metric.step],
          datasets: [{ ...prev.datasets[0], data: [...prev.datasets[0].data, metric.value] }]
        }));
      }
    };
    return () => wsRef.current.close();
  }, []);

  //return <Line data={data} />;
  return (
    <div>
      <h2>Train Accuracy</h2>
      <Line data={trainAccData} />
      <h2>Validation Accuracy</h2>
      <Line data={valAccData} />
      <h2>GPU Utilization</h2>
      <Line data={gpuData} />
    </div>
  );
}