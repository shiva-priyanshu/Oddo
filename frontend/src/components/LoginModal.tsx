import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Lock, Mail, Building, AlertCircle, X, Loader2, UserCog } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, registerCustomer, error, clearError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await registerCustomer({
          name,
          email,
          password,
          companyName: companyName || undefined,
        });
      } else {
        await login({ email, password });
      }
      onClose();
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    clearError();
    setIsRegister(false);
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {isRegister ? 'Create Customer Account' : 'Sign in to SubscriptIQ'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRegister
                ? 'Register for the self-service customer billing portal'
                : 'Access your administrator, staff, or subscriber portal'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1-Click Demo Credentials Quick Fill Banner */}
        {!isRegister && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              1-Click Demo Quick Fill (3 Distinct Roles):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@subscriptiq.com', 'admin123')}
                className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-md text-xs font-semibold text-center transition flex items-center justify-center space-x-1"
                title="System Administrator (Full access)"
              >
                <Shield className="h-3 w-3" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('staff@subscriptiq.com', 'staff123')}
                className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-md text-xs font-semibold text-center transition flex items-center justify-center space-x-1"
                title="Operations Staff (Granular module permissions)"
              >
                <UserCog className="h-3 w-3" />
                <span>Staff</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('acme@example.com', 'customer123')}
                className="px-2 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-md text-xs font-semibold text-center transition flex items-center justify-center space-x-1"
                title="Customer (Acme Corp)"
              >
                <Users className="h-3 w-3" />
                <span>Acme</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('globex@example.com', 'customer123')}
                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-md text-xs font-semibold text-center transition flex items-center justify-center space-x-1"
                title="Customer (Globex Corp)"
              >
                <Users className="h-3 w-3" />
                <span>Globex</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-800 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Name (Optional)
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Starlight Ventures"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-sm transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{isRegister ? 'Register Customer Account' : 'Sign In'}</span>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                clearError();
                setIsRegister(!isRegister);
              }}
              className="text-xs text-teal-700 hover:text-teal-800 font-medium transition"
            >
              {isRegister
                ? 'Already have an account? Sign In'
                : 'Need a customer account? Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
