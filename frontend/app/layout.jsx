import './globals.css';
import ToastProvider from './components/Toaster';
import { AuthProvider } from './components/AuthProvider';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

export const metadata = { title: 'SPARS Admin Panel' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
        <div className="shell">
            <Sidebar />
          <main className="main">
              <Topbar />
            <div className="content">{children}</div>
          </main>
        </div>
          <ToastProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
