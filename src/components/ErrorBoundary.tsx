import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled render error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center justify-center p-6 z-50">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center backdrop-blur-xl">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400 mb-4">
              <AlertTriangle className="w-10 h-10 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-cyber text-amber-300 mb-2">
              Oyun Duraklatıldı
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              Beklenmeyen bir görsel hata oluştu. Oyun durumunuz güvenle korundu.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-transform active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Yeniden Başlat</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
