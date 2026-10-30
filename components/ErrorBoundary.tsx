import React from 'react';
import DataState from './DataState';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Erro ao renderizar a tela', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center p-4">
          <DataState
            variant="error"
            title="Algo deu errado nesta tela"
            description="Recarregue a página para tentar de novo."
            actionLabel="Recarregar"
            onAction={() => window.location.reload()}
          />
        </main>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
