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
  Legend,
  Filler,
  LogarithmicScale
} from 'chart.js';

// Register all Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  LogarithmicScale
);

// Custom chart configuration
const createChartOptions = (title, yAxisLabel, useLogScale = false) => ({
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: true,
      text: title,
      font: {
        size: 16,
        weight: 'bold'
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    }
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Training Step',
        font: {
          weight: 'bold'
        }
      }
    },
    y: {
      title: {
        display: true,
        text: yAxisLabel,
        font: {
          weight: 'bold'
        }
      },
      type: useLogScale ? 'logarithmic' : 'linear',
    }
  },
  interaction: {
    intersect: false,
    mode: 'nearest',
  },
  elements: {
    line: {
      tension: 0.3,
      fill: true
    },
    point: {
      radius: 2,
      hoverRadius: 6
    }
  },
  maintainAspectRatio: false
});

// Custom chart data setup
const createChartData = (label, data, labels, color) => ({
  labels,
  datasets: [{
    label,
    data,
    borderColor: color,
    backgroundColor: `${color}20`,
    borderWidth: 2,
    pointBackgroundColor: color,
    fill: true
  }]
});

export default function Dashboard() {
  const wsRef = useRef(null);
  const chartRefs = useRef({});
  
  // Initialize state for all metrics
  const [trainAccData, setTrainAccData] = React.useState(
    createChartData('Train Accuracy', [], [], '#4e73df')
  );
  const [valAccData, setValAccData] = React.useState(
    createChartData('Validation Accuracy', [], [], '#1cc88a')
  );
  const [gpuData, setGpuData] = React.useState(
    createChartData('GPU Utilization (%)', [], [], '#f6c23e')
  );
  const [lossData, setLossData] = React.useState(
    createChartData('Loss', [], [], '#e74a3b')
  );
  const [perplexityData, setPerplexityData] = React.useState(
    createChartData('Perplexity', [], [], '#36b9cc')
  );

  // Safe chart data updater
  const updateChartData = (setter, metric) => {
    setter(prev => ({
      ...prev,
      labels: [...prev.labels, metric.step],
      datasets: [{
        ...prev.datasets[0],
        data: [...prev.datasets[0].data, metric.value]
      }]
    }));
  };

  useEffect(() => {
    // Initialize WebSocket connection
    wsRef.current = new WebSocket('ws://localhost:8000/ws/metrics');
    //wsRef.current = new WebSocket('wss://1eae-2402-e280-3e0c-42e-d578-80e-2b38-e357.ngrok-free.app/ws/metrics');

    wsRef.current.onmessage = (evt) => {
      const metric = JSON.parse(evt.data);
      
      // Handle different metric types
      switch (true) {
        case metric.type === 'train' && metric.metric === 'accuracy':
          updateChartData(setTrainAccData, metric);
          break;
        case metric.type === 'val' && metric.metric === 'accuracy':
          updateChartData(setValAccData, metric);
          break;
        case metric.type === 'system' && metric.metric === 'gpu_util':
          updateChartData(setGpuData, metric);
          break;
        case metric.type === 'train' && metric.metric === 'loss':
          updateChartData(setLossData, metric);
          break;
        case metric.type === 'eval' && metric.metric === 'loss':
          const perplexity = Math.exp(metric.value);
          setPerplexityData(prev => ({
            ...prev,
            labels: [...prev.labels, metric.step],
            datasets: [{
              ...prev.datasets[0],
              data: [...prev.datasets[0].data, perplexity]
            }]
          }));
          break;
        default:
          break;
      }
    };

    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // Destroy all chart instances
      Object.values(chartRefs.current).forEach(chart => {
        if (chart) chart.destroy();
      });
    };
  }, []);

  // Chart render helper with proper ref handling
  const renderChart = (data, options, chartKey) => (
    <Line 
      ref={(ref) => {
        if (ref) chartRefs.current[chartKey] = ref;
      }}
      data={data}
      options={options}
      key={chartKey}
    />
  );

  return (
    <div className="dashboard-container" style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '1800px',
      margin: '0 auto'
    }}>
      {/* Dashboard Header */}
      <header style={{
        marginBottom: '30px',
        borderBottom: '1px solid #e3e6f0',
        paddingBottom: '20px'
      }}>
        <h1 style={{
          color: '#2e59d9',
          fontWeight: '700',
          marginBottom: '10px'
        }}>Model Monitoring Dashboard</h1>
        <p style={{ color: '#858796' }}>Real-time monitoring of model metrics</p>
      </header>

      {/* Training Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)'
        }}>
          <div style={{ height: '300px' }}>
            {renderChart(
              trainAccData, 
              createChartOptions('Training Accuracy', 'Accuracy'), 
              'trainAcc'
            )}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)'
        }}>
          <div style={{ height: '300px' }}>
            {renderChart(
              lossData, 
              createChartOptions('Training Loss', 'Loss'), 
              'loss'
            )}
          </div>
        </div>
      </div>

      {/* Validation Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)'
        }}>
          <div style={{ height: '300px' }}>
            {renderChart(
              valAccData, 
              createChartOptions('Validation Accuracy', 'Accuracy'), 
              'valAcc'
            )}
          </div>
        </div>

        {/* <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)'
        }}>
          <div style={{ height: '300px' }}>
            {renderChart(
              perplexityData, 
              createChartOptions('Perplexity', 'Perplexity', true), 
              'perplexity'
            )}
          </div>
        </div> */}
      </div>

      {/* System Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)'
        }}>
          <div style={{ height: '300px' }}>
            {renderChart(
              gpuData, 
              createChartOptions('GPU Utilization', 'Utilization (%)'), 
              'gpu'
            )}
          </div>
        </div>

        {/* Placeholder for additional metrics */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#858796'
        }}>
          <div>
            <h3>Additional Metrics</h3>
            <p>Next Token Entropy or other metrics can be displayed here</p>
          </div>
        </div>
      </div>
    </div>
  );
}