'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, Lock, Mail, Info } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      // Use FormData for OAuth2PasswordRequestForm
      const formData = new FormData();
      formData.append('username', email); // OAuth2 uses 'username' field
      formData.append('password', password);

      // Ensure API URL has protocol
      const apiUrl = process.env.NEXT_PUBLIC_API || 'http://localhost:8002';
      const normalizedApiUrl = apiUrl.startsWith('http://') || apiUrl.startsWith('https://') 
        ? apiUrl 
        : `http://${apiUrl}`;
      
      const response = await fetch(`${normalizedApiUrl}/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Invalid credentials' }));
        throw new Error(error.detail || 'Invalid credentials');
      }

      const data = await response.json();
      login(data.access_token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      router.push('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Login failed');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#F8F9FB',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decoration matching sidebar theme */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '400px',
        height: '100%',
        background: 'var(--primary-dark)',
        clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)',
        zIndex: 0
      }}></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ 
          maxWidth: '480px', 
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '16px',
            background: 'var(--primary-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(10, 35, 66, 0.3)'
          }}>
            <Lock size={36} color="#fff" />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--primary-dark)' }}>
            SPARS CRM
          </h1>
          <p style={{ color: '#666', fontSize: '15px', margin: 0 }}>
            Admin Panel - Sign in to your account
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={16} color="#666" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} color="#666" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn primary"
            disabled={loading}
            style={{ 
              width: '100%', 
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '16px',
              padding: '14px'
            }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ 
          marginTop: '24px', 
          padding: '20px', 
          background: 'var(--gray-100)', 
          borderRadius: '12px',
          border: '1px solid var(--gray-200)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Info size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--primary-dark)' }}>
              Test Credentials
            </h3>
          </div>

          <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.8' }}>
            <div style={{ marginBottom: '16px', padding: '16px', background: '#fff', borderRadius: '8px', border: '2px solid var(--primary)' }}>
              <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '10px', fontSize: '15px' }}>
                Admin
              </strong>
              <div style={{ marginBottom: '6px' }}>Email: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>admin@spars.com</code></div>
              <div style={{ marginBottom: '10px' }}>Password: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>admin123</code></div>
              <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                Full system access, configuration, and user management.
              </div>
            </div>

            <div style={{ marginBottom: '16px', padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
              <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '10px', fontSize: '15px' }}>
                Sales Managers
              </strong>
              <div style={{ marginBottom: '6px' }}>
                <strong>Sales Manager X:</strong><br />
                Email: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>managerx@spars.com</code><br />
                Password: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>manager123</code>
              </div>
              <div style={{ marginBottom: '6px', marginTop: '10px' }}>
                <strong>Sales Manager Y:</strong><br />
                Email: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>managery@spars.com</code><br />
                Password: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>manager123</code>
              </div>
              <div style={{ marginBottom: '10px', marginTop: '10px' }}>
                <strong>Sales Manager Z:</strong><br />
                Email: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>managerz@spars.com</code><br />
                Password: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>manager123</code>
              </div>
              <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                Can view all leads, assign them to Sales Executives, track team performance, and manage follow-ups.
              </div>
            </div>

            <div style={{ marginBottom: '16px', padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
              <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '10px', fontSize: '15px' }}>
                Sales Executives
              </strong>
              <div style={{ marginBottom: '6px', fontSize: '13px' }}>
                <strong>Under Sales Manager X:</strong><br />
                • <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>execa1@spars.com</code> / <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>exec123</code><br />
                • <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>execa2@spars.com</code> / <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>exec123</code><br />
                • <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>execa3@spars.com</code> / <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>exec123</code>
              </div>
              <div style={{ marginBottom: '6px', marginTop: '10px', fontSize: '13px' }}>
                <strong>Under Sales Manager Y:</strong><br />
                • <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>execb1@spars.com</code> / <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>exec123</code><br />
                • <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>execb2@spars.com</code> / <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>exec123</code>
              </div>
              <div style={{ marginBottom: '10px', marginTop: '10px', fontSize: '13px' }}>
                <strong>Under Sales Manager Z:</strong><br />
                • <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>execc1@spars.com</code> / <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>exec123</code><br />
                • <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>execc2@spars.com</code> / <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>exec123</code><br />
                • <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>execc3@spars.com</code> / <code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>exec123</code>
              </div>
              <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                Can only view and manage leads assigned to them. Can log calls, add comments, set follow-ups, and track progress.
              </div>
            </div>

            <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
              <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '10px', fontSize: '15px' }}>
                Marketing Users
              </strong>
              <div style={{ marginBottom: '6px' }}>
                <strong>Marketing User 1:</strong><br />
                Email: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>marketing1@spars.com</code><br />
                Password: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>marketing123</code>
              </div>
              <div style={{ marginBottom: '10px', marginTop: '10px' }}>
                <strong>Marketing User 2:</strong><br />
                Email: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>marketing2@spars.com</code><br />
                Password: <code style={{ background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>marketing123</code>
              </div>
              <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                View and analyze marketing leads and form submissions. Cannot assign or manage leads.
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

