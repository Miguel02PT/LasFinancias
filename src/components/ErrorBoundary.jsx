import React from 'react';
import './ErrorBoundary.css';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <h1>⚠️ Algo correu mal</h1>
            <p>Desculpe, encontramos um erro. Por favor, tente novamente.</p>
            
            <details className="error-details">
              <summary>Detalhes do erro</summary>
              <pre>
                {this.state.error && this.state.error.toString()}
                {'\n'}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>

            <button onClick={this.handleReset} className="error-reset-btn">
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
