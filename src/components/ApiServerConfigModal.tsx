import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, XCircle, RefreshCw, Globe, HelpCircle, Copy, Check, Terminal, ExternalLink, Info, AlertTriangle } from 'lucide-react';

interface ApiServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (baseUrl: string) => void;
}

export default function ApiServerConfigModal({ isOpen, onClose, onSaved }: ApiServerConfigModalProps) {
  const [apiUrl, setApiUrl] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('api_base_url') || '';
      setApiUrl(saved);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const currentPort = typeof window !== 'undefined' ? window.location.port : '';
  const isTomcatPort = currentPort !== '' && currentPort !== '3000';

  const defaultSuggestedUrl = `http://${currentHost}:3000`;

  const handleTestConnection = async (targetUrl?: string) => {
    const urlToTest = targetUrl !== undefined ? targetUrl : apiUrl;
    setTesting(true);
    setTestResult(null);

    const cleanBase = urlToTest.trim().replace(/\/+$/, '');
    const endpoint = cleanBase ? `${cleanBase}/api/oracle-db/status` : '/api/oracle-db/status';

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setTestResult({
          success: true,
          message: `Connected successfully! Engine Status: ${data.engineStatus || 'ONLINE'}`
        });
      } else if (!contentType.includes('application/json')) {
        setTestResult({
          success: false,
          message: `Server returned non-JSON response (Tomcat 404/HTML). Please verify Node.js backend port 3000.`
        });
      } else {
        setTestResult({
          success: false,
          message: `HTTP Error ${res.status}: Unable to reach Oracle DataCore backend.`
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.name === 'TimeoutError' 
          ? `Connection timed out. Check firewall and verify server is running at ${cleanBase || 'local origin'}.`
          : `Network error: ${err.message || 'Failed to fetch API.'}`
      });
    } finally {
      setTesting(null as any);
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = apiUrl.trim().replace(/\/+$/, '');
    if (trimmed) {
      localStorage.setItem('api_base_url', trimmed);
    } else {
      localStorage.removeItem('api_base_url');
    }
    onSaved(trimmed);
    onClose();
  };

  const handleResetDefault = () => {
    setApiUrl('');
    localStorage.removeItem('api_base_url');
    setTestResult(null);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Tomcat & API Server Connection
              </h2>
              <p className="text-xs text-slate-400">
                Configure backend Node.js API endpoint for Tomcat / Cloud / Standalone deployments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* Tomcat Detection Warning Banner */}
          {isTomcatPort && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Apache Tomcat Servlet Environment Detected (Port: {currentPort})</span>
              </div>
              <p className="text-amber-200/90 leading-relaxed">
                Apache Tomcat static web container is serving the frontend, but Tomcat cannot directly execute Node.js SSH backend endpoints. 
                Enter your Node.js backend server URL (e.g., <code className="bg-amber-950/80 px-1.5 py-0.5 rounded text-amber-300 font-mono">{defaultSuggestedUrl}</code>) below.
              </p>
            </div>
          )}

          {/* Configuration Input */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Backend API Base URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder={`Leave empty for default relative origin (or e.g. ${defaultSuggestedUrl})`}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => handleTestConnection()}
                disabled={testing}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-2 transition disabled:opacity-50"
              >
                {testing ? <RefreshCw className="w-4 h-4 animate-spin text-blue-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                Test Link
              </button>
            </div>

            {/* Quick Auto-fill buttons */}
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
              <span className="text-slate-500">Quick Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setApiUrl(defaultSuggestedUrl);
                  handleTestConnection(defaultSuggestedUrl);
                }}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-blue-400 border border-slate-700/60 rounded-lg font-mono text-[11px] transition"
              >
                {defaultSuggestedUrl}
              </button>
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 rounded-lg font-mono text-[11px] transition"
              >
                Default (Relative Origin)
              </button>
            </div>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
              testResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">
                  {testResult.success ? 'Backend API Connection Healthy' : 'Backend Connection Failed'}
                </span>
                <span>{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Step by Step Deployment Guide in Bengali & English */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                Tomcat Deployment & Setup Guide (টমক্যাট গাইড)
              </span>
              <span className="text-[11px] text-slate-500">Standalone Node.js + Tomcat</span>
            </div>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p className="text-slate-400">
                <strong className="text-slate-200">১. Server Command:</strong> টমক্যাট সার্ভারে Node.js ব্যাকএন্ড চালু করুন:
              </p>
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-emerald-400 text-[11px]">
                <code>npm run build && npm start</code>
                <button
                  onClick={() => copyToClipboard('npm run build && npm start', 'cmd1')}
                  className="text-slate-400 hover:text-slate-200 p-1"
                >
                  {copiedText === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <p className="text-slate-400 pt-1">
                <strong className="text-slate-200">২. Set API URL:</strong> যদি Tomcat পোর্ট 8080 এ চলে এবং Node.js পোর্ট 3000 এ চলে, তাহলে উপরে <code className="text-blue-300 font-mono">http://{currentHost}:3000</code> দিয়ে <strong className="text-slate-200">Save & Apply</strong> এ ক্লিক করুন।
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save & Reconnect
          </button>
        </div>

      </div>
    </div>
  );
}
