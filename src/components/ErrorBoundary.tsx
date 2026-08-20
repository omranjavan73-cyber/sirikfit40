import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { clearAllStorageAndReload } from '../utils/safeStorage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error(`[ErrorBoundary] Uncaught runtime exception in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleResetAppData = () => {
    clearAllStorageAndReload();
  };

  private handleCopyError = () => {
    const errorText = `[SirikFit Error in ${this.props.name || 'Root'}]\nMessage: ${this.state.error?.message || 'Unknown'}\nStack:\n${this.state.error?.stack || ''}\nComponentStack:\n${this.state.errorInfo?.componentStack || ''}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isRoot = !this.props.name || this.props.name === 'Root Application' || this.props.name === 'SirikFit Application';

      return (
        <div
          id="error-boundary-card"
          className={`p-6 my-4 bg-slate-900 border border-rose-600/50 rounded-3xl text-right max-w-2xl mx-auto shadow-2xl font-['Vazirmatn',sans-serif] text-slate-100 ${
            isRoot ? 'mt-10 mb-10' : ''
          }`}
          dir="rtl"
        >
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
            <div className="w-12 h-12 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>خطای اجرای برنامه (System Error)</span>
                <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md font-mono">
                  {this.props.name || 'Core System'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                The UI caught a runtime error. سیستم برای جلوگیری از صفحه سفید این بخش را مهار کرد.
              </p>
            </div>
          </div>

          {/* Error Message Box */}
          <div className="bg-rose-950/50 border border-rose-900/60 rounded-2xl p-4 mb-4 text-xs font-mono text-rose-200 dir-ltr text-left overflow-x-auto select-all">
            <div className="font-bold text-rose-400 mb-1 font-sans text-right dir-rtl">پیام خطا:</div>
            {this.state.error?.message || 'Unknown runtime error occurred.'}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold transition shadow-md cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بارگذاری مجدد (Reload)</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAppData}
                className="inline-flex items-center gap-2 px-3 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="پاک‌سازی حافظه کش مرورگر و راه‌اندازی مجدد"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>پاک‌سازی حافظه محلی و بازیابی (Reset App Data)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={this.handleCopyError}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition border border-slate-700 cursor-pointer"
              >
                {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{this.state.copied ? 'کپی شد' : 'کپی متن خطا'}</span>
              </button>

              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 rounded-xl text-xs transition border border-slate-700 cursor-pointer"
              >
                <span>جزئیات فنی (Stack)</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Collapsible Stack Trace */}
          {this.state.showDetails && (
            <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-400 dir-ltr text-left overflow-x-auto max-h-60 overflow-y-auto">
              <div className="text-slate-500 font-bold mb-1">Stack Trace:</div>
              <pre className="whitespace-pre-wrap">{this.state.error?.stack || 'No stack trace available'}</pre>
              {this.state.errorInfo?.componentStack && (
                <>
                  <div className="text-slate-500 font-bold mt-2 mb-1">Component Stack:</div>
                  <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                </>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
