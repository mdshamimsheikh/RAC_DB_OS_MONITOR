import React from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in Oracle DataCore portal component:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070913] text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-[#0f1424] border border-red-500/30 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-white">
                  Oracle DataCore Portal Recovery
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  An unexpected UI or network exception occurred while executing in Tomcat / Standalone mode.
                </p>
              </div>
            </div>

            <div className="bg-[#080a14] border border-slate-800 rounded-xl p-4 font-mono text-xs text-amber-300 space-y-2 overflow-x-auto">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Error details:</span>
              </div>
              <p className="text-slate-300 break-words">
                {this.state.error?.message || 'Unknown application runtime error'}
              </p>
            </div>

            <div className="text-xs text-slate-400 space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <p className="font-semibold text-slate-200">Recommended Recovery Steps:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>If deployed on Tomcat, verify <code className="text-sky-300 font-mono">dist/server.cjs</code> backend is running on Node.js port 3000.</li>
                <li>Ensure Oracle DB tablespace <code className="text-sky-300 font-mono">DATACORE_TS</code> is initialized.</li>
                <li>Clear local browser storage cache or click "Reset Portal Cache" below.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                onClick={this.handleResetCache}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Reset Local Cache
              </button>

              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Portal Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
