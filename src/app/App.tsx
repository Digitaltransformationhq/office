import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { PartnerDashboard } from './components/PartnerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { TeamLeaderDashboard } from './components/TeamLeaderDashboard';
import { TeamMemberDashboard } from './components/TeamMemberDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { InitializeData } from './components/InitializeData';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { Settings } from './components/Settings';
import { TaskMIS } from './components/TaskMIS';
import { TeamTasks } from './components/TeamTasks';
import { Billing } from './components/Billing';
import { CalendarManagement } from './components/CalendarManagement';
import { LoginHistoryAdmin } from './components/LoginHistoryAdmin';
import { ApprovalQueue } from './components/ApprovalQueue';
import { AnnouncementManagement } from './components/AnnouncementManagement';
import { AnnouncementsView } from './components/AnnouncementsView';
import { ImportantDatesBar } from './components/ImportantDatesBar';
import { AnnouncementBar } from './components/AnnouncementBar';
import { MyInquiries } from './components/MyInquiries';
import { InquiryManagement } from './components/InquiryManagement';
import { ToastProvider } from './components/Toast';
import { Reports } from './components/Reports';
import { ClientManagement } from './components/ClientManagement';
import { enablePush, pushPermission } from './services/push';
import { viewForType, typeFromUrl, NOTIF_PARAM } from './utils/notifications';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Refs so the (once-registered) popstate handler always reads current values.
  const activeViewRef = useRef(activeView);
  const sidebarOpenRef = useRef(isMobileSidebarOpen);
  useEffect(() => { activeViewRef.current = activeView; }, [activeView]);
  useEffect(() => { sidebarOpenRef.current = isMobileSidebarOpen; }, [isMobileSidebarOpen]);

  // Helper function to extract numeric ID from user ID format (e.g., "user:2" -> 2)
  const extractNumericId = (userId: string): number => {
    // If userId is in format "user:X", extract X
    if (userId.includes(':')) {
      const parts = userId.split(':');
      const numericPart = parseInt(parts[1]);
      return isNaN(numericPart) ? 0 : numericPart;
    }
    // Otherwise try to parse directly
    const parsed = parseInt(userId);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('kaps_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setActiveView(parsedUser.role);
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveView(loggedInUser.role);
    localStorage.setItem('kaps_user', JSON.stringify(loggedInUser));
  };

  // Auto-enable browser push once a user is active (asks for permission the
  // first time only; if already granted it silently refreshes the subscription).
  useEffect(() => {
    if (!user?.id) return;
    if (pushPermission() === 'unsupported') return;
    enablePush(user.id).catch(() => { /* best-effort */ });
  }, [user?.id]);

  const handleLogout = () => {
    setUser(null);
    setActiveView('');
    localStorage.removeItem('kaps_user');
  };

  // Navigate to a view and record it in browser history so the mobile / browser
  // Back button walks back through visited sections instead of closing the app.
  const navigateTo = (view: string) => {
    if (view === activeViewRef.current) return;
    setActiveView(view);
    if (typeof window !== 'undefined') {
      window.history.pushState({ view }, '');
    }
  };

  const handleViewChange = (view: string) => {
    // Prevent users from switching to other roles
    // Only allow navigation to feature views or their own role dashboard
    const roleViews = ['partner', 'admin', 'team-leader', 'team-member', 'client',];

    if (roleViews.includes(view)) {
      // If trying to switch to a role view, only allow if it's their own role
      if (view === user?.role) {
        navigateTo(view);
      }
      // Silently ignore attempts to switch to other roles
      return;
    }

    // Allow navigation to feature views (settings, tasks, etc.)
    navigateTo(view);
  };

  // Sync the phone / browser Back button with in-app navigation. Without this,
  // a Back press hits the empty browser history and closes the site entirely.
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    // Seed the root entry (the user's dashboard) so the first Back press lands here.
    window.history.replaceState({ view: activeViewRef.current || user.role, root: true }, '');

    const handlePop = (event: PopStateEvent) => {
      // If the mobile sidebar is open, a Back press should just close it —
      // re-add an entry so we don't fall through and exit the app.
      if (sidebarOpenRef.current) {
        setIsMobileSidebarOpen(false);
        window.history.pushState({ view: activeViewRef.current }, '');
        return;
      }
      const state = event.state as { view?: string } | null;
      setActiveView(state?.view || user.role);
    };

    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [user]);

  // A push click on a cold start opens the app at /?notif=<type>. Resolve it
  // once we know who's logged in, then strip the param so a later refresh
  // doesn't silently re-navigate. Keeps the history state the effect above
  // seeded — only the query string goes.
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    const type = new URLSearchParams(window.location.search).get(NOTIF_PARAM);
    if (!type) return;
    window.history.replaceState(window.history.state, '', window.location.pathname);
    const view = viewForType(type);
    if (view) handleViewChange(view);
  }, [user]);

  // A push click while the app is already open: the service worker can't change
  // a focused tab's URL, so it messages us the destination instead.
  useEffect(() => {
    if (!user || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'notification-click') return;
      const type = typeFromUrl(event.data.url || '');
      const view = type ? viewForType(type) : null;
      if (view) handleViewChange(view);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [user]);

  const renderDashboard = () => {
    switch (activeView) {
      case 'partner':
        // Only show partner dashboard if user is actually a partner
        if (user?.role === 'partner') {
          return <PartnerDashboard user={user || undefined} />;
        }
        return renderDefaultDashboard();
      case 'admin':
        // Only show admin dashboard if user is actually an admin
        if (user?.role === 'admin') {
          return <AdminDashboard user={user || undefined} />;
        }
        return renderDefaultDashboard();
      case 'team-leader':
        // Only show team-leader dashboard if user is actually a team-leader
        if (user?.role === 'team-leader') {
          return <TeamLeaderDashboard user={user || undefined} />;
        }
        return renderDefaultDashboard();
      case 'team-member':
        // Only show team-member dashboard if user is actually a team-member
        if (user?.role === 'team-member') {
          return <TeamMemberDashboard user={user || undefined} />;
        }
        return renderDefaultDashboard();
      case 'client':
        // Only show client dashboard if user is actually a client
        if (user?.role === 'client') {
          return <ClientDashboard />;
        }
        return renderDefaultDashboard();
      case 'initialize':
        return <InitializeData />;
      case 'settings':
        return user ? <Settings user={user} /> : null;
      case 'task-mis':
        return user ? <TaskMIS user={user} /> : null;
      case 'team-tasks':
        return <TeamTasks user={user || undefined} />;
      case 'billing':
        return <Billing user={user || undefined} />;
      case 'billing-reports':
        // Merged into Reports (Billing Records tab)
        setActiveView('reports');
        return null;
      case 'users':
        // Users are now managed inside the Team section
        setActiveView('team-tasks');
        return null;
      case 'clients':
        if (user && user.role === 'admin') return <ClientManagement />;
        if (user) setActiveView(user.role);
        return null;
      case 'approvals':
        // Leave approvals. The sidebar has offered this to team leaders all
        // along with nothing behind it, so the item did nothing when clicked.
        if (user && ['team-leader', 'admin', 'partner'].includes(user.role)) {
          return <ApprovalQueue userId={user.id} userName={user.name} userRole={user.role} />;
        }
        if (user) {
          setActiveView(user.role);
        }
        return null;
      case 'login-history':
        // Admin only. The per-user panel this replaces lived in Settings and
        // only ever showed you your own sign-ins, which audits nothing.
        if (user && user.role === 'admin') {
          return <LoginHistoryAdmin />;
        }
        if (user) {
          setActiveView(user.role);
        }
        return null;
      case 'calendar':
        // Only allow admin to access calendar management
        if (user && user.role === 'admin') {
          return <CalendarManagement user={user} />;
        }
        if (user) {
          setActiveView(user.role);
        }
        return null;
      case 'announcements':
        // Admins manage announcements; everyone else gets the read-only list of
        // the ones aimed at them.
        if (user && user.role === 'admin') {
          return <AnnouncementManagement user={user} />;
        }
        if (user) {
          return <AnnouncementsView user={user} />;
        }
        return null;
      case 'reports':
        // Only allow admin and partner to access reports
        if (user && (user.role === 'admin' || user.role === 'partner')) {
          return <Reports user={user} />;
        }
        // Redirect other roles back to their dashboard
        if (user) {
          setActiveView(user.role);
        }
        return null;
      case 'inquiries':
        // Partners see the full Inquiry Management interface, others see My Inquiries
        if (user?.role === 'partner') {
          return user ? <InquiryManagement userId={extractNumericId(user.id)} userName={user.name} /> : null;
        }
        return user ? <MyInquiries userId={extractNumericId(user.id)} userName={user.name} /> : null;
      case 'time-log':
      case 'attendance':
        // Temporarily hidden features - redirect to dashboard
        if (user) {
          setActiveView(user.role);
        }
        return null;
      default:
        return user ? renderDefaultDashboard() : null;
    }
  };

  const renderDefaultDashboard = () => {
    switch (user?.role) {
      case 'partner':
        return <PartnerDashboard user={user || undefined} />;
      case 'admin':
        return <AdminDashboard user={user || undefined} />;
      case 'team-leader':
        return <TeamLeaderDashboard user={user || undefined} />;
      case 'team-member':
        return <TeamMemberDashboard user={user || undefined} />;
      case 'client':
        return <ClientDashboard />;
      default:
        return <PartnerDashboard user={user || undefined} />;
    }
  };

  if (!user) {
    if (showForgotPassword) {
      return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
    }
    return <Login onLogin={handleLogin} onForgotPassword={() => setShowForgotPassword(true)} />;
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar
          activeRole={activeView || user.role}
          onRoleChange={handleViewChange}
          user={user}
          onLogout={handleLogout}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <Navbar
            user={user}
            onLogout={handleLogout}
            onNavigate={handleViewChange}
            onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />
          {/* Important Dates Bar - Shows for all users */}
          <ImportantDatesBar />
          {/* Announcement Bar - Shows for all users */}
          <AnnouncementBar userRole={user.role} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {renderDashboard()}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}