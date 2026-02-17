import './DeepfakeAlert.css';

function DeepfakeAlert({ alert }) {
  return (
    <div className="deepfake-alert fade-in">
      <div className="alert-icon">⚠️</div>
      <div className="alert-content">
        <h4>Deepfake Detected</h4>
        <p>Potential deepfake detected from <strong>{alert.userName}</strong></p>
        <p className="confidence">Confidence: {(alert.confidence * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}

export default DeepfakeAlert;
