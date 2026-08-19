import * as React from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare readonly props: Readonly<ErrorBoundaryProps>;

  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetToHome = () => {
    try {
      localStorage.removeItem('omex_current_tab');
    } catch (_e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">متأسفیم، خطایی در بارگذاری رخ داده است</h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                سیستم با موفقیت از توقف کل صفحه جلوگیری کرد. با یک بار به‌روزرسانی یا بازگشت به صفحه اصلی، نرم‌افزار بازیابی خواهد شد.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-[11px] text-rose-300 font-mono text-left overflow-x-auto max-h-32" dir="ltr">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بارگذاری مجدد صفحه</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetToHome}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>صفحه اصلی</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
