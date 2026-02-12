'use client';
import { useState, useEffect } from 'react';
import React from 'react';
import { useAuth } from '../components/AuthProvider';
import { BookOpen, ChevronRight, Search, X } from 'lucide-react';

export default function HelpPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [role, setRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.role_name) {
      // Map role names to manual types - check exact matches first
      const roleName = String(user.role_name).trim();
      
      // Exact role name matching
      if (roleName === 'Super Admin' || roleName === 'Admin') {
        setRole('Admin');
      } else if (roleName === 'Sales Manager') {
        setRole('SalesManager');
      } else if (roleName === 'Sales Executive') {
        setRole('SalesExecutive');
      } else if (roleName === 'Marketing User' || roleName === 'Marketing') {
        setRole('Marketing');
      } else if (roleName === 'Read-Only User' || roleName === 'Read Only User') {
        setRole('ReadOnly');
      } else {
        // Fallback: try to detect by permissions
        if (user.permissions?.all === true) {
          setRole('Admin');
        } else if (user.permissions?.leads === true && user.permissions?.reports === true) {
          setRole('SalesManager');
        } else if (user.permissions?.submissions === true && user.permissions?.leads !== true) {
          // Marketing: has submissions access but NOT leads access (or leads is false)
          setRole('Marketing');
        } else {
          setRole('ReadOnly');
        }
      }
    } else if (user && !user.role_name) {
      // User loaded but no role_name - try permissions fallback
      if (user.permissions?.all === true) {
        setRole('Admin');
      } else {
        setRole('ReadOnly');
      }
    }
  }, [user]);

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // TOC is no longer filtered - all headings remain visible
  // Search only applies to document content, not sidebar navigation

  // Search through content and scroll to first match
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const query = searchQuery.toLowerCase();
    const tocItems = getTOC();
    
    // First, try to find matching section titles
    const matchingSection = tocItems.find(item => 
      item.label.toLowerCase().includes(query)
    );
    
    if (matchingSection) {
      scrollToSection(matchingSection.id);
      return;
    }
    
    // If no section title matches, search through content
    const allSections = document.querySelectorAll('section[id]');
    for (const section of allSections) {
      const text = section.textContent?.toLowerCase() || '';
      if (text.includes(query)) {
        const sectionId = section.id;
        scrollToSection(sectionId);
        setActiveSection(sectionId);
        break;
      }
    }
  };

  // Handle Enter key in search
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Table of Contents for each role
  const getTOC = () => {
    if (!role) {
      return [];
    }
    const baseTOC = [
      { id: 'overview', label: 'Role Overview' },
      { id: 'getting-started', label: 'Getting Started' },
      { id: 'dashboard', label: 'Dashboard Overview' },
      { id: 'navigation', label: 'Header and Navigation' },
    ];

    if (role === 'Admin') {
      return [
        ...baseTOC,
        { id: 'leads', label: 'Leads Management' },
        { id: 'submissions', label: 'Form Submissions' },
        { id: 'calendar', label: 'Calendar' },
        { id: 'activities', label: 'Activities' },
        { id: 'newsletter', label: 'Newsletter' },
        { id: 'reports', label: 'Reports' },
        { id: 'users', label: 'User Management' },
        { id: 'roles', label: 'Roles & Permissions' },
        { id: 'settings', label: 'Settings' },
        { id: 'errors', label: 'Error Handling' },
        { id: 'best-practices', label: 'Best Practices' },
      ];
    } else if (role === 'SalesManager') {
      return [
        ...baseTOC,
        { id: 'leads', label: 'Leads Management' },
        { id: 'submissions', label: 'Form Submissions' },
        { id: 'calendar', label: 'Calendar' },
        { id: 'activities', label: 'Activities' },
        { id: 'newsletter', label: 'Newsletter' },
        { id: 'reports', label: 'Reports' },
        { id: 'users', label: 'User Management' },
        { id: 'roles', label: 'Roles & Permissions' },
        { id: 'settings', label: 'Settings' },
        { id: 'errors', label: 'Error Handling' },
        { id: 'best-practices', label: 'Best Practices' },
      ];
    } else if (role === 'SalesExecutive') {
      return [
        ...baseTOC,
        { id: 'leads', label: 'Leads Management' },
        { id: 'assigned-leads', label: 'My Assigned Leads' },
        { id: 'submissions', label: 'Form Submissions' },
        { id: 'calendar', label: 'Calendar' },
        { id: 'activities', label: 'Activities' },
        { id: 'settings', label: 'Settings' },
        { id: 'errors', label: 'Error Handling' },
        { id: 'best-practices', label: 'Best Practices' },
      ];
    } else if (role === 'Marketing') {
      return [
        ...baseTOC,
        { id: 'submissions', label: 'Form Submissions' },
        { id: 'newsletter', label: 'Newsletter' },
        { id: 'calendar', label: 'Calendar' },
        { id: 'activities', label: 'Activities' },
        { id: 'settings', label: 'Settings' },
        { id: 'errors', label: 'Error Handling' },
        { id: 'best-practices', label: 'Best Practices' },
      ];
    } else {
      return [
        ...baseTOC,
        { id: 'leads', label: 'Leads (Read-Only)' },
        { id: 'submissions', label: 'Form Submissions' },
        { id: 'calendar', label: 'Calendar' },
        { id: 'activities', label: 'Activities' },
        { id: 'settings', label: 'Settings' },
        { id: 'errors', label: 'Error Handling' },
        { id: 'best-practices', label: 'Best Practices' },
      ];
    }
  };

  const renderManualContent = () => {
    if (!role) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Loading user information...</p>
        </div>
      );
    }
    if (role === 'Admin') {
      return <AdminManual searchQuery={searchQuery} />;
    } else if (role === 'SalesManager') {
      return <SalesManagerManual searchQuery={searchQuery} />;
    } else if (role === 'SalesExecutive') {
      return <SalesExecutiveManual searchQuery={searchQuery} />;
    } else if (role === 'Marketing') {
      return <MarketingManual searchQuery={searchQuery} />;
    } else {
      return <ReadOnlyManual searchQuery={searchQuery} />;
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 60px)',
      background: '#F8F9FB'
    }}>
      {/* Sidebar - Table of Contents */}
      <div style={{
        width: '280px',
        background: '#fff',
        borderRight: '1px solid var(--gray-200)',
        padding: '24px',
        position: 'sticky',
        top: '60px',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--gray-200)'
        }}>
          <BookOpen size={20} color="#1E73FF" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#333' }}>
            User Manual
          </h2>
        </div>
        
        {/* Search Bar */}
        <div style={{
          marginBottom: '20px',
          position: 'relative'
        }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                color: '#999',
                pointerEvents: 'none',
                zIndex: 1
              }} 
            />
            <input
              type="text"
              placeholder="Search manual..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: searchQuery ? '32px' : '12px',
                paddingTop: '8px',
                paddingBottom: '8px',
                border: '1px solid var(--gray-200)',
                borderRadius: '6px',
                fontSize: '14px',
                background: '#f8f9fa',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.background = '#fff';
                e.target.style.borderColor = '#1E73FF';
                e.target.style.boxShadow = '0 0 0 3px rgba(30, 115, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.background = '#f8f9fa';
                e.target.style.borderColor = 'var(--gray-200)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#999',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--gray-100)';
                  e.currentTarget.style.color = '#666';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = '#999';
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        
        <nav>
          {getTOC().map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                marginBottom: '4px',
                background: activeSection === item.id ? 'var(--gray-100)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: activeSection === item.id ? '#1E73FF' : '#666',
                fontWeight: activeSection === item.id ? 600 : 400,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                transition: 'all 0.2s ease',
                wordBreak: 'normal',
                overflowWrap: 'normal'
              }}
              onMouseEnter={(e) => {
                if (activeSection !== item.id) {
                  e.currentTarget.style.background = 'var(--gray-50)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== item.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <ChevronRight size={14} style={{ opacity: activeSection === item.id ? 1 : 0.3, flexShrink: 0, marginTop: '2px' }} />
              <span style={{ 
                flex: 1,
                lineHeight: '1.4'
              }}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        padding: '40px',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          {renderManualContent()}
        </div>
      </div>
    </div>
  );
}

// Admin Manual Component
function AdminManual({ searchQuery = '' }) {
  return (
    <div>
      <Section id="overview" title="Role Overview" searchQuery={searchQuery}>
        <p>
          As an <strong>Admin</strong> (Super Admin), you have complete access to all features and data in the SPARS CRM system. You are responsible for system configuration, user management, and organizational oversight.
        </p>
        <h3>Key Responsibilities</h3>
        <ul>
          <li>Manage all users across the organization, including Sales Managers, Sales Executives, and Marketing Users</li>
          <li>Create and assign Sales Managers and their teams</li>
          <li>View and manage all leads organization-wide</li>
          <li>Access organizational performance reports</li>
          <li>Configure roles and permissions</li>
          <li>Monitor all system activities</li>
        </ul>
        <h3>Access Control Summary</h3>
        <ul>
          <li><strong>View:</strong> All leads, submissions, users, activities, reports, and system data</li>
          <li><strong>Create:</strong> Leads, users, roles, reminders, comments, call logs, tags</li>
          <li><strong>Edit:</strong> All leads, users, roles, submissions, reminders, call logs</li>
          <li><strong>Delete:</strong> Leads, users, roles, reminders, call logs</li>
          <li><strong>Cannot Access:</strong> None - full system access</li>
        </ul>
      </Section>

      <Section id="getting-started" title="Getting Started" searchQuery={searchQuery}>
        <h3>Logging In</h3>
        <ol>
          <li>Navigate to the login page</li>
          <li>Enter your email address: <code>admin@spars.com</code></li>
          <li>Enter your password: <code>admin123</code></li>
          <li>Click the "Sign In" button</li>
        </ol>
        <p>After logging in, you will be redirected to your Admin Dashboard.</p>
        <h3>First-Time Navigation</h3>
        <p>Upon first login, familiarize yourself with:</p>
        <ul>
          <li>The Dashboard showing organizational overview</li>
          <li>The Sidebar navigation menu on the left</li>
          <li>The Topbar with search, help, notifications, and user menu</li>
        </ul>
      </Section>

      <Section id="dashboard" title="Dashboard Overview" searchQuery={searchQuery}>
        <p>Your Admin Dashboard provides a comprehensive view of organizational performance and key metrics.</p>
        <h3>Stat Cards</h3>
        <p>The dashboard displays four key statistics at the top:</p>
        <ul>
          <li><strong>Total Leads:</strong> Count of all leads in the system</li>
          <li><strong>Total Submissions:</strong> Count of all form submissions</li>
          <li><strong>Conversion Rate:</strong> Percentage of submissions converted to leads</li>
          <li><strong>New Leads:</strong> Count of leads created in the current period</li>
        </ul>
        <h3>Charts and Widgets</h3>
        <ul>
          <li><strong>Leads Pipeline:</strong> Bar chart showing leads by status (New, Contacted, Qualified, Proposal Sent, In Discussion, Closed Won, Closed Lost)</li>
          <li><strong>Leads by Source:</strong> Pie chart showing distribution of leads by source type (Website, Referral, Trade Show, etc.)</li>
          <li><strong>Submissions Timeline:</strong> Line or area chart showing submission trends over time</li>
          <li><strong>Recent Leads:</strong> List of up to 5 most recently created leads with quick access</li>
          <li><strong>Top Lead Sources:</strong> List of most productive lead sources</li>
        </ul>
        <h3>Activity Feed</h3>
        <p>At the bottom of the dashboard, you'll see a feed of recent activities (up to 10 items) showing system-wide actions such as lead conversions, status changes, user creations, and more.</p>
      </Section>

      <Section id="navigation" title="Header and Navigation" searchQuery={searchQuery}>
        <h3>Topbar Components</h3>
        <h4>Logo and Breadcrumbs</h4>
        <ul>
          <li>Click the "SPARS CRM" logo to return to the Dashboard</li>
          <li>Breadcrumbs show your current location in the system (e.g., Dashboard / Leads / Lead Detail)</li>
          <li>Click any breadcrumb to navigate to that section</li>
        </ul>
        <h4>Search Bar</h4>
        <ul>
          <li>Located in the center of the Topbar</li>
          <li>Type to search for leads, users, or submissions</li>
          <li>Press Enter or click to view results on the Activities page</li>
          <li>Use Ctrl+K as a keyboard shortcut</li>
          <li>Press Escape to clear the search</li>
        </ul>
        <h4>Help Icon</h4>
        <ul>
          <li>Click the Help icon (circle with question mark) to open this user manual</li>
          <li>The manual is role-specific and shows only features available to you</li>
        </ul>
        <h4>Notifications</h4>
        <ul>
          <li>Bell icon shows recent system activities</li>
          <li>Red badge indicates the number of recent activities</li>
          <li>Click to view a dropdown of recent activities</li>
          <li>Click any activity to navigate to the related lead or activity page</li>
          <li>Click "View All" to go to the full Activities page</li>
        </ul>
        <h4>User Menu</h4>
        <ul>
          <li>Shows your name, email, and role badge</li>
          <li>Click to open dropdown menu with:</li>
          <li>Settings - Change password and view account information</li>
          <li>Logout - Sign out of the system</li>
        </ul>
        <h3>Sidebar Navigation</h3>
        <p>The sidebar on the left provides access to all main sections:</p>
        <ul>
          <li><strong>Dashboard:</strong> Return to the main dashboard</li>
          <li><strong>Form Submissions:</strong> View all form submissions by type</li>
          <li><strong>Leads:</strong> View and manage all leads</li>
          <li><strong>Calendar:</strong> View reminders, follow-ups, and call logs</li>
          <li><strong>Activities:</strong> View complete activity log</li>
          <li><strong>Newsletter:</strong> Manage newsletter subscribers and tags</li>
          <li><strong>Reports:</strong> View organizational and team performance reports</li>
          <li><strong>Users:</strong> Manage users and their hierarchy</li>
          <li><strong>Roles:</strong> View roles and permissions</li>
          <li><strong>Settings:</strong> Change password and account settings</li>
        </ul>
        <p>The sidebar can be collapsed by clicking the toggle button at the bottom.</p>
      </Section>

      <Section id="leads" title="Leads Management" searchQuery={searchQuery}>
        <h3>Viewing All Leads</h3>
        <p>To view all leads in the system:</p>
        <ol>
          <li>Click "Leads" in the sidebar</li>
          <li>The leads page displays all leads with filters and search</li>
        </ol>
        <h3>Lead List Features</h3>
        <ul>
          <li><strong>Stats:</strong> Total Leads and Active Leads counts at the top</li>
          <li><strong>Search:</strong> Search by name, company, email, source type, or source</li>
          <li><strong>Status Filter:</strong> Filter by status (All Status, New, Contacted, Qualified, Proposal Sent, In Discussion, Closed Won, Closed Lost)</li>
          <li><strong>Table Columns:</strong> Lead (name + email), Company, Status, Source Type, Source, Actions</li>
        </ul>
        <h3>Creating a New Lead</h3>
        <ol>
          <li>Click the "Add New Lead" button at the top of the leads page</li>
          <li>Fill in the required fields:</li>
          <ul>
            <li><strong>Name:</strong> Lead's full name (required)</li>
            <li><strong>Email:</strong> Lead's email address (required)</li>
            <li><strong>Phone:</strong> Lead's phone number (optional)</li>
            <li><strong>Company:</strong> Company name (required)</li>
            <li><strong>Source Type:</strong> Select from dropdown (Website, Referral, Trade Show, Email Campaign, Other) (required)</li>
            <li><strong>Source:</strong> If Source Type is "Website", select from dropdown (Request a Demo, Talk to Sales, General Inquiry, Product Profile Download, Brochure Download). Otherwise, enter text (required)</li>
            <li><strong>Designation:</strong> Lead's job title (optional)</li>
            <li><strong>Status:</strong> Select initial status from dropdown (required)</li>
            <li><strong>Assign To:</strong> Select a Sales Executive or Sales Manager from dropdown (required)</li>
          </ul>
          <li>Click "Create Lead" to save</li>
        </ol>
        <h3>Viewing Lead Details</h3>
        <ol>
          <li>Click "View" in the Actions column for any lead</li>
          <li>The lead detail page shows:</li>
          <ul>
            <li>Lead header with name, email, phone, company, and status</li>
            <li>Info grid with Source Type, Source, Stage (A-H), Designation, and Assigned To</li>
            <li>Comments section</li>
            <li>Call History section</li>
            <li>Follow-ups History section</li>
          </ul>
        </ol>
        <h3>Changing Lead Status</h3>
        <ol>
          <li>Open the lead detail page</li>
          <li>Click the "Change Status" button at the top</li>
          <li>Select the new status from the dropdown</li>
          <li>Click "Update Status"</li>
        </ol>
        <h3>Adding Comments</h3>
        <ol>
          <li>Open the lead detail page</li>
          <li>Scroll to the Comments section</li>
          <li>Type your comment in the text area</li>
          <li>Optionally select a status to associate with the comment</li>
          <li>Click "Add Comment"</li>
        </ol>
        <h3>Logging a Call</h3>
        <ol>
          <li>Open the lead detail page</li>
          <li>Click "Log a Call" button</li>
          <li>Fill in the call log form:</li>
          <ul>
            <li><strong>Activity Type:</strong> Face to Face, Phone Call, Video Call, Email, Other</li>
            <li><strong>Stage:</strong> Select stage A through H</li>
            <li><strong>Meeting Date:</strong> Select date (required)</li>
            <li><strong>Meeting Time:</strong> Enter time in HH:MM format</li>
            <li><strong>Objective:</strong> Purpose of the meeting</li>
            <li><strong>Planning Notes:</strong> Pre-meeting notes</li>
            <li><strong>Secured Order:</strong> Checkbox if an order was secured</li>
            <li><strong>Project Value:</strong> Dollar value if applicable</li>
            <li><strong>Challenges:</strong> Any challenges encountered</li>
            <li><strong>Post Meeting Notes:</strong> Notes after the meeting</li>
            <li><strong>Follow-Up Notes:</strong> Notes for follow-up</li>
            <li><strong>Follow-Up Required:</strong> Checkbox to set a follow-up</li>
            <li>If Follow-Up Required is checked:</li>
            <ul>
              <li><strong>Follow-up Date:</strong> Select date</li>
              <li><strong>Follow-up Time:</strong> Enter time</li>
            </ul>
            <li><strong>Mark meeting as complete:</strong> Checkbox to mark as completed</li>
            <li><strong>Cancel Meeting:</strong> Checkbox to mark as cancelled</li>
          </ul>
          <li>Click "Save Call Log"</li>
        </ol>
        <h3>Viewing Call Logs</h3>
        <ol>
          <li>Open the lead detail page</li>
          <li>Scroll to the Call History section</li>
          <li>Click "View" on any call log to see full details</li>
          <li>Click "Edit" to modify an existing call log</li>
        </ol>
        <h3>Managing Follow-ups</h3>
        <p>Follow-ups can be set when:</p>
        <ul>
          <li>Creating or editing a lead</li>
          <li>Logging a call</li>
        </ul>
        <p>To clear a follow-up:</p>
        <ol>
          <li>Open the lead detail page</li>
          <li>If a follow-up exists, click "Clear Follow-up" button</li>
        </ol>
        <h3>Deleting a Lead</h3>
        <ol>
          <li>On the leads list page, click "Delete" in the Actions column</li>
          <li>Confirm deletion in the modal that appears</li>
          <li>Click "Delete Lead" to confirm</li>
        </ol>
        <p><strong>Warning:</strong> Deleting a lead will also delete all associated comments, call logs, and follow-ups.</p>
      </Section>

      <Section id="submissions" title="Form Submissions" searchQuery={searchQuery}>
        <h3>Viewing Form Submissions</h3>
        <p>To view form submissions:</p>
        <ol>
          <li>Click "Form Submissions" in the sidebar</li>
          <li>The submissions index shows five form types:</li>
          <ul>
            <li>Request a Demo</li>
            <li>Talk to Sales</li>
            <li>General Inquiry</li>
            <li>Product Profile Download</li>
            <li>Brochure Download</li>
          </ul>
          <li>Each card shows the form type name, icon, and count badge</li>
          <li>Click any card or "View submissions" link to see submissions of that type</li>
        </ol>
        <h3>Viewing Submissions by Type</h3>
        <ol>
          <li>Click on a form type card from the submissions index</li>
          <li>The page shows a table of all submissions for that type</li>
          <li>Use the search bar to filter by name, email, or company</li>
          <li>Table columns: Name, Email, Company, Submitted At, Status, Details</li>
        </ol>
        <h3>Viewing Submission Details</h3>
        <ol>
          <li>Click "View Details" for any submission</li>
          <li>The modal shows:</li>
          <ul>
            <li><strong>Summary:</strong> Name, Email, Company, Submitted At, Status, Form Type, Source Type, Source</li>
            <li><strong>Original Submitted Information:</strong> All form-specific fields from the submission data</li>
          </ul>
        </ol>
        <h3>Converting a Submission to a Lead</h3>
        <ol>
          <li>Open the submission details modal</li>
          <li>If the submission status is "New" (not yet converted), click "Convert to Lead"</li>
          <li>The convert modal shows:</li>
          <ul>
            <li><strong>Source Type:</strong> Pre-filled as "Website" (read-only)</li>
            <li><strong>Source:</strong> Pre-filled based on form type (read-only)</li>
            <li><strong>Assign To Sales Executive:</strong> Table showing all Sales Executives</li>
            <ul>
              <li>Select a Sales Executive using the radio button</li>
              <li>You can see their name, email, and manager</li>
            </ul>
          </ul>
          <li>Click "Convert to Lead" to create the lead</li>
          <li>The submission status will change to "Converted to Lead"</li>
        </ol>
      </Section>

      <Section id="calendar" title="Calendar" searchQuery={searchQuery}>
        <p>The Calendar page displays reminders, follow-ups, and call logs in calendar format or list view.</p>
        <h3>Calendar Views</h3>
        <ul>
          <li><strong>Day View:</strong> Shows events for a single day</li>
          <li><strong>Week View:</strong> Shows events for the current week</li>
          <li><strong>Month View:</strong> Shows events for the current month</li>
        </ul>
        <h3>Event Types</h3>
        <ul>
          <li><strong>Reminders:</strong> User-created reminders</li>
          <li><strong>Follow-ups:</strong> Follow-ups set on leads</li>
          <li><strong>Call Logs:</strong> Scheduled meetings from call logs</li>
        </ul>
        <h3>Creating a Reminder</h3>
        <ol>
          <li>Click "Create New Reminder" button</li>
          <li>Enter a title for the reminder</li>
          <li>Select the due date and time</li>
          <li>Click "Create Reminder"</li>
        </ol>
        <h3>Managing Reminders</h3>
        <ul>
          <li>Click on any reminder to view details</li>
          <li>Mark reminders as complete or incomplete</li>
          <li>Delete reminders (only reminders can be deleted, not follow-ups or call logs)</li>
        </ul>
        <h3>View Toggle</h3>
        <ul>
          <li>Switch between "View All" (list) and "Calendar View" (calendar)</li>
          <li>Use "Hide Completed" toggle to filter out completed items</li>
        </ul>
        <h3>Navigation</h3>
        <ul>
          <li>Use Previous/Next buttons to navigate between time periods</li>
          <li>Click "Today" to return to the current date</li>
        </ul>
      </Section>

      <Section id="activities" title="Activities" searchQuery={searchQuery}>
        <p>The Activities page shows a complete log of all system activities.</p>
        <h3>Activity List</h3>
        <ul>
          <li>Each activity shows an icon based on action type</li>
          <li>Description of the activity</li>
          <li>Timestamp showing relative time (e.g., "2 hours ago") and absolute time</li>
        </ul>
        <h3>Filters</h3>
        <ul>
          <li><strong>Action Type:</strong> Filter by All Actions, Lead Conversions, Status Changes, Comments, User Created/Updated/Deleted, Logins</li>
          <li><strong>Entity Type:</strong> Filter by All Entities, Leads, Users, Comments, Submissions</li>
        </ul>
        <h3>Search</h3>
        <ul>
          <li>Use the search bar at the top to search activities</li>
          <li>Search works across all activity descriptions</li>
        </ul>
        <h3>Pagination</h3>
        <ul>
          <li>Activities are paginated with 50 items per page</li>
          <li>Use Previous/Next buttons to navigate</li>
          <li>Click "Refresh" to reload activities</li>
        </ul>
      </Section>

      <Section id="newsletter" title="Newsletter" searchQuery={searchQuery}>
        <p>The Newsletter page manages newsletter subscribers and tags.</p>
        <h3>Subscribers Table</h3>
        <ul>
          <li>Columns: Email, Subscribed On, Status (Active/Inactive), Tags, Actions</li>
          <li>View all newsletter subscribers</li>
        </ul>
        <h3>Managing Subscriber Status</h3>
        <ol>
          <li>Find the subscriber in the table</li>
          <li>Click "Toggle" in the Actions column</li>
          <li>This switches between Active and Inactive status</li>
        </ol>
        <h3>Creating Tags</h3>
        <ol>
          <li>Click "Create Tag" button</li>
          <li>Enter a tag name</li>
          <li>Select a color using the color picker</li>
          <li>Click "Create Tag"</li>
        </ol>
        <h3>Adding Tags to Subscribers</h3>
        <ol>
          <li>Click "Add Tag" for any subscriber</li>
          <li>Select an existing tag from the dropdown, or</li>
          <li>Create a new tag by entering name and color, then click "Create & Add Tag"</li>
        </ol>
        <h3>Removing Tags</h3>
        <ol>
          <li>Find the tag on a subscriber</li>
          <li>Click the "X" button on the tag</li>
          <li>The tag will be removed from that subscriber</li>
        </ol>
      </Section>

      <Section id="reports" title="Reports" searchQuery={searchQuery}>
        <p>As an Admin, you have access to both organizational and team performance reports.</p>
        <h3>Organizational Performance</h3>
        <ul>
          <li><strong>Conversion Rates by Manager:</strong> Bar chart showing conversion rates for each Sales Manager</li>
          <li><strong>Project Value by Manager:</strong> Bar chart showing total project value by Sales Manager</li>
        </ul>
        <h3>Manager Performance Overview</h3>
        <ol>
          <li>Select a Sales Manager from the dropdown</li>
          <li>View summary metrics for that manager</li>
          <li>See a chart of their team's performance</li>
        </ol>
        <h3>Manager Details</h3>
        <p>The page shows a breakdown table for each Sales Manager with:</p>
        <ul>
          <li>Team Member name</li>
          <li>Total Leads</li>
          <li>Total Calls</li>
          <li>Closed Won count</li>
          <li>Conversion Rate</li>
          <li>Project Value</li>
          <li>Secured Orders count</li>
        </ul>
      </Section>

      <Section id="users" title="User Management" searchQuery={searchQuery}>
        <p>As an Admin, you can create and manage all users in the system.</p>
        <h3>User Hierarchy View</h3>
        <p>The users page displays a tree structure:</p>
        <ul>
          <li>Admin users at the top</li>
          <li>Sales Managers with their teams expanded below</li>
          <li>Unassigned Sales Executives</li>
          <li>Marketing users</li>
        </ul>
        <h3>Creating a User</h3>
        <ol>
          <li>Click "Add User" button</li>
          <li>Fill in the form:</li>
          <ul>
            <li><strong>Name:</strong> User's full name (required)</li>
            <li><strong>Email:</strong> User's email address (required, must be unique)</li>
            <li><strong>Password:</strong> Initial password (required, minimum 6 characters)</li>
            <li><strong>Role:</strong> Select from dropdown (required)</li>
            <ul>
              <li>If creating a Sales Executive, you must assign them to a Sales Manager</li>
              <li>Select "Assign to Sales Manager" dropdown</li>
            </ul>
          </ul>
          <li>Click "Create User"</li>
        </ol>
        <h3>Editing a User</h3>
        <ol>
          <li>Click "Edit" for any user</li>
          <li>Modify name, email, or role</li>
          <li>For Sales Executives, change their assigned manager if needed</li>
          <li>Optionally enter a new password (leave blank to keep current password)</li>
          <li>Click "Update User"</li>
        </ol>
        <h3>Deleting a User</h3>
        <ol>
          <li>Click "Delete" for any user</li>
          <li>Confirm deletion in the modal</li>
          <li>Click "Delete User" to confirm</li>
        </ol>
        <p><strong>Note:</strong> You cannot delete users who have leads assigned to them. Reassign leads first.</p>
        <h3>Assigning Managers</h3>
        <p>For unassigned Sales Executives:</p>
        <ol>
          <li>Find the user in the "Unassigned Sales Executives" section</li>
          <li>Click "Assign Manager"</li>
          <li>Select a Sales Manager from the dropdown</li>
          <li>Click "Assign"</li>
        </ol>
      </Section>

      <Section id="roles" title="Roles & Permissions" searchQuery={searchQuery}>
        <p>The Roles page displays all roles and their permissions. This page is read-only for viewing purposes.</p>
        <h3>Roles Table</h3>
        <ul>
          <li>Columns: ID, Role Name, Authorized Permissions</li>
          <li>View all available roles in the system</li>
        </ul>
        <h3>Permission Display</h3>
        <p>For each role, you can see:</p>
        <ul>
          <li>View Submissions</li>
          <li>View Leads</li>
          <li>Assign Leads</li>
          <li>Update Lead Status</li>
          <li>Add Comments</li>
          <li>Set Reminders</li>
          <li>View Reports</li>
          <li>Manage Users</li>
          <li>Manage Email Templates</li>
          <li>Convert to Lead</li>
          <li>Delete Submissions</li>
        </ul>
        <p>Admin role shows "Full access to all features" instead of individual permissions.</p>
      </Section>

      <Section id="settings" title="Settings" searchQuery={searchQuery}>
        <h3>Change Password</h3>
        <ol>
          <li>Enter your current password</li>
          <li>Enter your new password (minimum 6 characters)</li>
          <li>Confirm your new password</li>
          <li>Click "Change Password"</li>
          <li>Use the eye icon to show/hide passwords</li>
        </ol>
        <h3>Account Information</h3>
        <p>The page displays your account details:</p>
        <ul>
          <li>Name (read-only)</li>
          <li>Email (read-only)</li>
          <li>Role (read-only)</li>
        </ul>
        <p>To change your name or email, contact your system administrator.</p>
      </Section>

      <Section id="errors" title="Error Handling and Restrictions" searchQuery={searchQuery}>
        <h3>Permission Errors</h3>
        <p>If you attempt an action you don't have permission for, you will see an error message. As an Admin, you should not encounter permission errors.</p>
        <h3>Validation Errors</h3>
        <p>When creating or editing records, validation errors may appear:</p>
        <ul>
          <li>Required fields must be filled</li>
          <li>Email addresses must be valid and unique</li>
          <li>Passwords must be at least 6 characters</li>
          <li>Dates and times must be in correct format</li>
        </ul>
        <h3>Read-Only Scenarios</h3>
        <p>Some fields are read-only:</p>
        <ul>
          <li>When converting a submission, Source Type and Source are pre-filled and cannot be changed</li>
          <li>Account information (name, email, role) in Settings is read-only</li>
        </ul>
      </Section>

      <Section id="best-practices" title="Best Practices" searchQuery={searchQuery}>
        <h3>Data Accuracy</h3>
        <ul>
          <li>Always verify email addresses when creating leads or users</li>
          <li>Use consistent naming conventions for companies</li>
          <li>Select appropriate source types and sources for accurate reporting</li>
          <li>Keep lead statuses up to date to maintain accurate pipeline views</li>
        </ul>
        <h3>User Management</h3>
        <ul>
          <li>Always assign Sales Executives to a Sales Manager when creating them</li>
          <li>Verify user roles before creating accounts</li>
          <li>Use strong passwords and encourage users to change them regularly</li>
          <li>Review user hierarchy periodically to ensure correct reporting structure</li>
        </ul>
        <h3>Lead Management</h3>
        <ul>
          <li>Assign leads promptly after creation</li>
          <li>Add comments after important interactions</li>
          <li>Log calls immediately after meetings for accurate records</li>
          <li>Set follow-ups at the time of interaction</li>
          <li>Update lead statuses as they progress through the pipeline</li>
        </ul>
        <h3>Security and Access</h3>
        <ul>
          <li>Never share your login credentials</li>
          <li>Log out when finished, especially on shared computers</li>
          <li>Review user permissions regularly</li>
          <li>Monitor activities log for unusual activity</li>
        </ul>
        <h3>Reporting</h3>
        <ul>
          <li>Review organizational reports regularly</li>
          <li>Use reports to identify top-performing managers and teams</li>
          <li>Monitor conversion rates and project values</li>
        </ul>
      </Section>
    </div>
  );
}

// Sales Manager Manual Component
function SalesManagerManual({ searchQuery = '' }) {
  return (
    <div>
      <Section id="overview" title="Role Overview" searchQuery={searchQuery}>
        <p>
          As a <strong>Sales Manager</strong>, you oversee your team of Sales Executives and manage leads assigned to your team. You have access to team performance reports and can assign leads to your Sales Executives.
        </p>
        <h3>Key Responsibilities</h3>
        <ul>
          <li>Manage leads assigned to your Sales Executives</li>
          <li>Assign leads to Sales Executives under your management</li>
          <li>View and convert form submissions to leads</li>
          <li>Monitor team performance through reports</li>
          <li>Create and manage Sales Executives in your team</li>
          <li>Track follow-ups and call logs for your team's leads</li>
        </ul>
        <h3>Access Control Summary</h3>
        <ul>
          <li><strong>View:</strong> All leads (organization-wide), submissions, your team's activities, team reports</li>
          <li><strong>Create:</strong> Leads, Sales Executives (under you), reminders, comments, call logs, tags</li>
          <li><strong>Edit:</strong> All leads (can assign to your Sales Executives), your team's call logs and reminders</li>
          <li><strong>Delete:</strong> Leads, your team's call logs and reminders</li>
          <li><strong>Cannot Access:</strong> Admin-only features (user management beyond your team, role configuration, org-wide reports)</li>
        </ul>
      </Section>

      <Section id="getting-started" title="Getting Started" searchQuery={searchQuery}>
        <h3>Logging In</h3>
        <ol>
          <li>Navigate to the login page</li>
          <li>Enter your email address (e.g., <code>salesmanager@spars.com</code>)</li>
          <li>Enter your password (e.g., <code>manager123</code>)</li>
          <li>Click the "Sign In" button</li>
        </ol>
        <p>After logging in, you will be redirected to your Sales Manager Dashboard.</p>
        <h3>First-Time Navigation</h3>
        <p>Upon first login, familiarize yourself with:</p>
        <ul>
          <li>The Dashboard showing team overview</li>
          <li>The Sidebar navigation menu</li>
          <li>The Topbar with search, help, notifications, and user menu</li>
        </ul>
      </Section>

      <Section id="dashboard" title="Dashboard Overview" searchQuery={searchQuery}>
        <p>Your Sales Manager Dashboard provides a team-focused view of performance and key metrics.</p>
        <h3>Stat Cards</h3>
        <p>The dashboard displays four key statistics:</p>
        <ul>
          <li><strong>Total Leads:</strong> Count of all leads in the system</li>
          <li><strong>Total Submissions:</strong> Count of all form submissions</li>
          <li><strong>Conversion Rate:</strong> Percentage of submissions converted to leads</li>
          <li><strong>New Leads:</strong> Count of leads created in the current period</li>
        </ul>
        <h3>Charts and Widgets</h3>
        <ul>
          <li><strong>Leads Pipeline:</strong> Bar chart showing leads by status</li>
          <li><strong>Leads by Source:</strong> Pie chart showing distribution of leads by source</li>
          <li><strong>Submissions Timeline:</strong> Line or area chart showing submission trends</li>
          <li><strong>Recent Leads:</strong> List of up to 5 most recently created leads</li>
          <li><strong>Top Lead Sources:</strong> List of most productive lead sources</li>
        </ul>
        <h3>Activity Feed</h3>
        <p>At the bottom, you'll see recent activities (up to 10 items) showing system-wide actions.</p>
      </Section>

      <Section id="navigation" title="Header and Navigation" searchQuery={searchQuery}>
        <h3>Topbar Components</h3>
        <h4>Logo and Breadcrumbs</h4>
        <ul>
          <li>Click the "SPARS CRM" logo to return to the Dashboard</li>
          <li>Breadcrumbs show your current location</li>
        </ul>
        <h4>Search Bar</h4>
        <ul>
          <li>Search for leads, users, or submissions</li>
          <li>Press Enter to view results on the Activities page</li>
        </ul>
        <h4>Help Icon</h4>
        <ul>
          <li>Click the Help icon to open this user manual</li>
        </ul>
        <h4>Notifications</h4>
        <ul>
          <li>Bell icon shows recent system activities</li>
          <li>Click to view dropdown of recent activities</li>
        </ul>
        <h4>User Menu</h4>
        <ul>
          <li>Access Settings and Logout</li>
        </ul>
        <h3>Sidebar Navigation</h3>
        <p>Available sections:</p>
        <ul>
          <li><strong>Dashboard:</strong> Team overview</li>
          <li><strong>Form Submissions:</strong> View all form submissions</li>
          <li><strong>Leads:</strong> View and manage all leads</li>
          <li><strong>Calendar:</strong> View reminders and follow-ups</li>
          <li><strong>Activities:</strong> View activity log</li>
          <li><strong>Newsletter:</strong> Manage newsletter subscribers</li>
          <li><strong>Reports:</strong> View team performance reports</li>
          <li><strong>Users:</strong> Manage Sales Executives in your team</li>
          <li><strong>Roles:</strong> View roles and permissions</li>
          <li><strong>Settings:</strong> Change password</li>
        </ul>
      </Section>

      <Section id="leads" title="Leads Management" searchQuery={searchQuery}>
        <h3>Viewing Leads</h3>
        <p>As a Sales Manager, you can view all leads in the system, but you can only assign leads to Sales Executives under your management.</p>
        <h3>Creating a New Lead</h3>
        <ol>
          <li>Click "Add New Lead"</li>
          <li>Fill in all required fields</li>
          <li>In "Assign To", select a Sales Executive from your team</li>
          <li>Click "Create Lead"</li>
        </ol>
        <h3>Assigning Leads</h3>
        <p>When creating or editing a lead:</p>
        <ol>
          <li>You can only assign leads to Sales Executives who report to you</li>
          <li>Select from the "Assign To" dropdown</li>
          <li>If you try to assign to someone outside your team, you'll see an error</li>
        </ol>
        <h3>Lead Details</h3>
        <p>You have full access to lead details including:</p>
        <ul>
          <li>Changing lead status</li>
          <li>Adding comments</li>
          <li>Logging calls</li>
          <li>Managing follow-ups</li>
        </ul>
        <p>Follow the same procedures as described in the Admin manual for these features.</p>
      </Section>

      <Section id="submissions" title="Form Submissions" searchQuery={searchQuery}>
        <p>You can view all form submissions and convert them to leads, following the same process as Admins. When converting, you can only assign the new lead to Sales Executives in your team.</p>
        <h3>Converting Submissions</h3>
        <ol>
          <li>Open submission details</li>
          <li>Click "Convert to Lead"</li>
          <li>In the assignment table, you'll only see Sales Executives from your team</li>
          <li>Select a Sales Executive and click "Convert to Lead"</li>
        </ol>
      </Section>

      <Section id="calendar" title="Calendar" searchQuery={searchQuery}>
        <p>You can view all reminders, follow-ups, and call logs. You can create reminders and manage events for your team's leads. Follow the same procedures as described in the Admin manual.</p>
      </Section>

      <Section id="activities" title="Activities" searchQuery={searchQuery}>
        <p>You can view all activities in the system. Use filters and search to find specific activities. Follow the same procedures as described in the Admin manual.</p>
      </Section>

      <Section id="newsletter" title="Newsletter" searchQuery={searchQuery}>
        <p>You have full access to newsletter management. You can view subscribers, create tags, and manage subscriber status. Follow the same procedures as described in the Admin manual.</p>
      </Section>

      <Section id="reports" title="Reports" searchQuery={searchQuery}>
        <p>As a Sales Manager, you have access to team performance reports.</p>
        <h3>Team Performance Reports</h3>
        <ul>
          <li><strong>Conversion Rates:</strong> Bar chart showing conversion rates</li>
          <li><strong>Project Value:</strong> Bar chart showing project values</li>
        </ul>
        <h3>Team Member Performance</h3>
        <ol>
          <li>Select a team member from the dropdown</li>
          <li>View their individual performance metrics</li>
          <li>See "Leads by Team Member" chart</li>
        </ol>
        <h3>Team Summary Table</h3>
        <p>The table shows for each team member:</p>
        <ul>
          <li>Team Member name</li>
          <li>Total Leads</li>
          <li>Total Calls</li>
          <li>Closed Won count</li>
          <li>Conversion Rate</li>
          <li>Project Value</li>
          <li>Secured Orders count</li>
        </ul>
        <p><strong>Note:</strong> You cannot view organizational reports - those are Admin-only.</p>
      </Section>

      <Section id="users" title="User Management" searchQuery={searchQuery}>
        <p>As a Sales Manager, you can create and manage Sales Executives in your team.</p>
        <h3>Creating a Sales Executive</h3>
        <ol>
          <li>Click "Add User"</li>
          <li>Fill in name, email, and password</li>
          <li>Select "Sales Executive" as the role</li>
          <li>The system automatically assigns them to you as their manager</li>
          <li>Click "Create User"</li>
        </ol>
        <h3>Editing Sales Executives</h3>
        <p>You can edit Sales Executives in your team:</p>
        <ul>
          <li>Change their name or email</li>
          <li>Reset their password</li>
          <li>You cannot change their role or reassign them to another manager</li>
        </ul>
        <h3>User Hierarchy View</h3>
        <p>The users page shows:</p>
        <ul>
          <li>Your team's Sales Executives under your name</li>
          <li>You can expand/collapse your team section</li>
        </ul>
        <p><strong>Note:</strong> You cannot create or manage users outside your team, including other Sales Managers or Marketing users.</p>
      </Section>

      <Section id="roles" title="Roles & Permissions" searchQuery={searchQuery}>
        <p>You can view all roles and their permissions. This page is read-only. Follow the same procedures as described in the Admin manual.</p>
      </Section>

      <Section id="settings" title="Settings" searchQuery={searchQuery}>
        <p>You can change your password and view your account information. Follow the same procedures as described in the Admin manual.</p>
      </Section>

      <Section id="errors" title="Error Handling and Restrictions" searchQuery={searchQuery}>
        <h3>Assignment Restrictions</h3>
        <p>If you try to assign a lead to someone outside your team, you'll see an error: "You can only assign leads to your own Sales Executives"</p>
        <h3>User Management Restrictions</h3>
        <p>You cannot:</p>
        <ul>
          <li>Create users with roles other than Sales Executive</li>
          <li>Edit users outside your team</li>
          <li>Delete users who have leads assigned</li>
        </ul>
        <h3>Report Access</h3>
        <p>If you try to access organizational reports, you'll only see team performance reports. Organizational reports are Admin-only.</p>
      </Section>

      <Section id="best-practices" title="Best Practices" searchQuery={searchQuery}>
        <h3>Team Management</h3>
        <ul>
          <li>Assign leads promptly to your Sales Executives</li>
          <li>Monitor team performance regularly through reports</li>
          <li>Ensure Sales Executives are keeping call logs and comments up to date</li>
          <li>Review team activities to identify training needs</li>
        </ul>
        <h3>Lead Assignment</h3>
        <ul>
          <li>Distribute leads fairly among your team</li>
          <li>Consider each Sales Executive's workload and expertise</li>
          <li>Assign high-priority leads to your top performers</li>
        </ul>
        <h3>Follow-up Management</h3>
        <ul>
          <li>Monitor follow-ups for your team's leads</li>
          <li>Ensure Sales Executives are setting appropriate follow-up dates</li>
          <li>Use the Calendar to track team activities</li>
        </ul>
        <h3>Reporting</h3>
        <ul>
          <li>Review team reports weekly</li>
          <li>Use conversion rates to identify improvement opportunities</li>
          <li>Recognize top performers based on project value and secured orders</li>
        </ul>
      </Section>
    </div>
  );
}

// Sales Executive Manual Component
function SalesExecutiveManual({ searchQuery = '' }) {
  return (
    <div>
      <Section id="overview" title="Role Overview" searchQuery={searchQuery}>
        <p>
          As a <strong>Sales Executive</strong>, you work with leads assigned to you by your Sales Manager. You log calls, add comments, set follow-ups, and track progress through the sales pipeline.
        </p>
        <h3>Key Responsibilities</h3>
        <ul>
          <li>Manage leads assigned to you by your Sales Manager</li>
          <li>Create leads manually when needed</li>
          <li>Log calls and meetings with leads</li>
          <li>Add comments and update lead status</li>
          <li>Set and manage follow-ups</li>
          <li>Track your personal tasks and reminders</li>
        </ul>
        <h3>Access Control Summary</h3>
        <ul>
          <li><strong>View:</strong> Leads assigned to you, leads you created manually, submissions, your own activities, your reminders</li>
          <li><strong>Create:</strong> Leads (manually), comments, call logs, reminders</li>
          <li><strong>Edit:</strong> Leads assigned to you or created by you, your call logs, your reminders</li>
          <li><strong>Delete:</strong> Leads you created manually, your call logs, your reminders</li>
          <li><strong>Cannot Access:</strong> User management, roles, reports, newsletter, leads assigned to other Sales Executives</li>
        </ul>
      </Section>

      <Section id="getting-started" title="Getting Started" searchQuery={searchQuery}>
        <h3>Logging In</h3>
        <ol>
          <li>Navigate to the login page</li>
          <li>Enter your email address (e.g., <code>execa1@spars.com</code>)</li>
          <li>Enter your password (e.g., <code>exec123</code>)</li>
          <li>Click "Sign In"</li>
        </ol>
        <p>After logging in, you'll see your personalized dashboard.</p>
      </Section>

      <Section id="dashboard" title="Dashboard Overview" searchQuery={searchQuery}>
        <p>Your dashboard shows your personal metrics and tasks.</p>
        <h3>Stat Cards</h3>
        <ul>
          <li><strong>My Leads:</strong> Count of leads assigned to you</li>
          <li><strong>My Tasks:</strong> Count of your active tasks and reminders</li>
          <li><strong>My Follow-ups:</strong> Count of follow-ups you need to complete</li>
          <li><strong>New Leads:</strong> Count of new leads assigned to you</li>
        </ul>
        <h3>My Follow-ups Widget</h3>
        <ul>
          <li>Shows up to 5 upcoming follow-ups</li>
          <li>Click "View All" to go to Calendar</li>
          <li>Click any follow-up to view the lead</li>
        </ul>
        <h3>Activity Feed</h3>
        <p>Shows your recent activities (up to 10 items).</p>
      </Section>

      <Section id="navigation" title="Header and Navigation" searchQuery={searchQuery}>
        <h3>Sidebar Navigation</h3>
        <p>Available sections:</p>
        <ul>
          <li><strong>Dashboard:</strong> Your personal dashboard</li>
          <li><strong>Form Submissions:</strong> View all form submissions</li>
          <li><strong>Leads:</strong> View leads you created manually</li>
          <li><strong>My Assigned Leads:</strong> View leads assigned to you (this is your main leads view)</li>
          <li><strong>Calendar:</strong> Your reminders and follow-ups</li>
          <li><strong>Activities:</strong> Your activity log</li>
          <li><strong>Settings:</strong> Change password</li>
        </ul>
        <p><strong>Note:</strong> Newsletter and Reports are hidden from your sidebar as you don't have access to them.</p>
      </Section>

      <Section id="leads" title="Leads Management" searchQuery={searchQuery}>
        <h3>Viewing Your Leads</h3>
        <p>The "Leads" page shows only leads you created manually. For leads assigned to you by your manager, use "My Assigned Leads" instead.</p>
        <h3>Creating a Lead Manually</h3>
        <ol>
          <li>Click "Add New Lead" on the Leads page</li>
          <li>Fill in the form fields</li>
          <li><strong>Assign To:</strong> This field is read-only and shows your name - leads you create are automatically assigned to you</li>
          <li>Click "Create Lead"</li>
        </ol>
        <h3>Lead Details</h3>
        <p>For any lead assigned to you or created by you, you can:</p>
        <ul>
          <li>Change the lead status</li>
          <li>Add comments</li>
          <li>Log calls</li>
          <li>Set follow-ups</li>
        </ul>
        <p>Follow the same procedures as described in the Admin manual for these features.</p>
      </Section>

      <Section id="assigned-leads" title="My Assigned Leads" searchQuery={searchQuery}>
        <p>This is your primary leads view, showing all leads assigned to you by your Sales Manager.</p>
        <h3>Page Features</h3>
        <ul>
          <li><strong>Stats:</strong> Total Assigned and Follow-ups Required counts</li>
          <li><strong>Search:</strong> Search by name, company, email, source type, or source</li>
          <li><strong>Status Filter:</strong> Filter by lead status</li>
          <li><strong>Table Columns:</strong> Lead (name + email), Company, Status, Assigned By, Source Type, Follow-up (date/time or -), Action (View)</li>
        </ul>
        <h3>Viewing a Lead</h3>
        <ol>
          <li>Click "View" for any lead</li>
          <li>You'll see the full lead detail page</li>
          <li>You can manage the lead as described in the Leads Management section</li>
        </ol>
        <h3>View Calendar</h3>
        <p>Click "View Calendar" button to see all your follow-ups and reminders in calendar view.</p>
      </Section>

      <Section id="submissions" title="Form Submissions" searchQuery={searchQuery}>
        <p>You can view all form submissions, but you cannot convert them to leads. Only Sales Managers and Admins can convert submissions.</p>
        <h3>Viewing Submissions</h3>
        <ol>
          <li>Click "Form Submissions" in the sidebar</li>
          <li>Select a form type</li>
          <li>View submission details</li>
        </ol>
        <p><strong>Note:</strong> The "Convert to Lead" button will not appear for you.</p>
      </Section>

      <Section id="calendar" title="Calendar" searchQuery={searchQuery}>
        <p>Your Calendar shows your personal reminders, follow-ups for your leads, and call logs you've created.</p>
        <h3>Creating Reminders</h3>
        <ol>
          <li>Click "Create New Reminder"</li>
          <li>Enter title and due date/time</li>
          <li>Click "Create Reminder"</li>
        </ol>
        <h3>Managing Your Calendar</h3>
        <ul>
          <li>View reminders, follow-ups, and call logs in day, week, or month view</li>
          <li>Mark reminders as complete</li>
          <li>Delete your reminders (you cannot delete follow-ups or call logs)</li>
          <li>Use "Hide Completed" to filter out completed items</li>
        </ul>
      </Section>

      <Section id="activities" title="Activities" searchQuery={searchQuery}>
        <p>You can view your own activities. The Activities page shows actions you've performed, such as:</p>
        <ul>
          <li>Creating leads</li>
          <li>Adding comments</li>
          <li>Logging calls</li>
          <li>Changing lead status</li>
        </ul>
        <p>Use filters and search to find specific activities.</p>
      </Section>

      <Section id="settings" title="Settings" searchQuery={searchQuery}>
        <p>You can change your password and view your account information. Follow the same procedures as described in the Admin manual.</p>
      </Section>

      <Section id="errors" title="Error Handling and Restrictions" searchQuery={searchQuery}>
        <h3>Access Restrictions</h3>
        <p>You cannot:</p>
        <ul>
          <li>View leads assigned to other Sales Executives</li>
          <li>Convert submissions to leads</li>
          <li>Access Reports, Newsletter, Users, or Roles pages</li>
          <li>Delete leads assigned to you (only leads you created manually can be deleted)</li>
        </ul>
        <h3>Assignment Restrictions</h3>
        <p>When creating a lead manually, you cannot assign it to anyone else - it's automatically assigned to you.</p>
      </Section>

      <Section id="best-practices" title="Best Practices" searchQuery={searchQuery}>
        <h3>Lead Management</h3>
        <ul>
          <li>Check "My Assigned Leads" daily for new assignments</li>
          <li>Update lead status promptly as leads progress</li>
          <li>Add comments after every significant interaction</li>
          <li>Log calls immediately after meetings</li>
        </ul>
        <h3>Call Logging</h3>
        <ul>
          <li>Fill in all relevant fields in call logs</li>
          <li>Include planning notes before meetings</li>
          <li>Add post-meeting notes while details are fresh</li>
          <li>Set follow-ups at the time of the call</li>
          <li>Mark meetings as complete when finished</li>
        </ul>
        <h3>Follow-ups</h3>
        <ul>
          <li>Set follow-ups immediately after calls or meetings</li>
          <li>Use the Calendar to track upcoming follow-ups</li>
          <li>Clear follow-ups after completion</li>
          <li>Set realistic follow-up dates</li>
        </ul>
        <h3>Task Management</h3>
        <ul>
          <li>Use reminders for personal tasks</li>
          <li>Review your Calendar daily</li>
          <li>Complete reminders promptly</li>
          <li>Keep your activity log accurate</li>
        </ul>
      </Section>
    </div>
  );
}

// Marketing Manual Component
function MarketingManual({ searchQuery = '' }) {
  return (
    <div>
      <Section id="overview" title="Role Overview" searchQuery={searchQuery}>
        <p>
          As a <strong>Marketing User</strong>, you focus on marketing activities including form submissions, newsletter management, and marketing analytics. You do not have access to lead management.
        </p>
        <h3>Key Responsibilities</h3>
        <ul>
          <li>View and analyze form submissions</li>
          <li>Manage newsletter subscribers and tags</li>
          <li>Monitor submission trends and metrics</li>
          <li>Track marketing campaign effectiveness</li>
        </ul>
        <h3>Access Control Summary</h3>
        <ul>
          <li><strong>View:</strong> Form submissions, newsletter subscribers, your own activities, your reminders</li>
          <li><strong>Create:</strong> Newsletter tags, reminders</li>
          <li><strong>Edit:</strong> Newsletter subscriber status, tags, your reminders</li>
          <li><strong>Delete:</strong> Your reminders</li>
          <li><strong>Cannot Access:</strong> Leads, Reports, Users, Roles, converting submissions to leads</li>
        </ul>
      </Section>

      <Section id="getting-started" title="Getting Started" searchQuery={searchQuery}>
        <h3>Logging In</h3>
        <ol>
          <li>Navigate to the login page</li>
          <li>Enter your email address (e.g., <code>marketing@spars.com</code>)</li>
          <li>Enter your password (e.g., <code>marketing123</code>)</li>
          <li>Click "Sign In"</li>
        </ol>
        <p>After logging in, you'll see your Marketing Dashboard.</p>
      </Section>

      <Section id="dashboard" title="Dashboard Overview" searchQuery={searchQuery}>
        <p>Your Marketing Dashboard focuses on submission metrics and newsletter statistics.</p>
        <h3>Stat Cards</h3>
        <ul>
          <li><strong>Total Submissions:</strong> Count of all form submissions</li>
          <li><strong>Newsletter Subscribers:</strong> Count of active newsletter subscribers</li>
          <li><strong>New This Week:</strong> Count of new submissions this week</li>
          <li><strong>Form Types:</strong> Count of different form types</li>
        </ul>
        <h3>Charts and Widgets</h3>
        <ul>
          <li><strong>Submissions by Form Type:</strong> Pie chart showing distribution</li>
          <li><strong>Submissions Timeline:</strong> Line/Area chart showing trends over time</li>
          <li><strong>Recent Submissions:</strong> List of up to 5 most recent submissions</li>
          <li><strong>Submissions by Type:</strong> Bar chart showing counts by form type</li>
        </ul>
        <p><strong>Note:</strong> You will not see lead-related charts or widgets.</p>
      </Section>

      <Section id="navigation" title="Header and Navigation" searchQuery={searchQuery}>
        <h3>Sidebar Navigation</h3>
        <p>Available sections:</p>
        <ul>
          <li><strong>Dashboard:</strong> Marketing metrics</li>
          <li><strong>Form Submissions:</strong> View all form submissions</li>
          <li><strong>Calendar:</strong> Your reminders</li>
          <li><strong>Activities:</strong> Your activity log</li>
          <li><strong>Newsletter:</strong> Manage subscribers and tags</li>
          <li><strong>Settings:</strong> Change password</li>
        </ul>
        <p><strong>Note:</strong> Leads, Reports, Users, and Roles are hidden from your sidebar.</p>
      </Section>

      <Section id="submissions" title="Form Submissions" searchQuery={searchQuery}>
        <p>As a Marketing User, form submissions are your primary focus.</p>
        <h3>Viewing Submissions</h3>
        <ol>
          <li>Click "Form Submissions" in the sidebar</li>
          <li>Select a form type (Request a Demo, Talk to Sales, General Inquiry, Product Profile Download, Brochure Download)</li>
          <li>View all submissions for that type</li>
        </ol>
        <h3>Submission Details</h3>
        <p>You can view complete submission details including:</p>
        <ul>
          <li>Contact information (name, email, company)</li>
          <li>Submission date and time</li>
          <li>Status (New or Converted to Lead)</li>
          <li>All form-specific fields</li>
        </ul>
        <h3>Submission Analysis</h3>
        <p>Use the submissions data to:</p>
        <ul>
          <li>Analyze which form types generate the most interest</li>
          <li>Track submission trends over time</li>
          <li>Identify peak submission periods</li>
          <li>Monitor conversion rates</li>
        </ul>
        <p><strong>Note:</strong> You cannot convert submissions to leads. That action is restricted to Sales Managers and Admins.</p>
      </Section>

      <Section id="newsletter" title="Newsletter" searchQuery={searchQuery}>
        <p>You have full access to newsletter management.</p>
        <h3>Viewing Subscribers</h3>
        <p>The Newsletter page shows all subscribers with:</p>
        <ul>
          <li>Email address</li>
          <li>Subscription date</li>
          <li>Status (Active/Inactive)</li>
          <li>Associated tags</li>
        </ul>
        <h3>Managing Subscriber Status</h3>
        <ol>
          <li>Find the subscriber in the table</li>
          <li>Click "Toggle" to change between Active and Inactive</li>
        </ol>
        <h3>Tag Management</h3>
        <p>You can create tags and assign them to subscribers:</p>
        <ol>
          <li>Click "Create Tag" to create a new tag</li>
          <li>Enter tag name and select color</li>
          <li>Click "Add Tag" on any subscriber to assign tags</li>
          <li>Remove tags by clicking the "X" on the tag</li>
        </ol>
        <h3>Using Tags</h3>
        <p>Tags help you:</p>
        <ul>
          <li>Segment subscribers by interest or campaign</li>
          <li>Organize subscribers for targeted campaigns</li>
          <li>Track subscriber engagement</li>
        </ul>
      </Section>

      <Section id="calendar" title="Calendar" searchQuery={searchQuery}>
        <p>You can create and manage your personal reminders. Use the Calendar to track your marketing tasks and deadlines.</p>
        <h3>Creating Reminders</h3>
        <ol>
          <li>Click "Create New Reminder"</li>
          <li>Enter title and due date/time</li>
          <li>Click "Create Reminder"</li>
        </ol>
        <p><strong>Note:</strong> You will not see lead follow-ups or call logs in your calendar, as you don't have access to leads.</p>
      </Section>

      <Section id="activities" title="Activities" searchQuery={searchQuery}>
        <p>You can view your own activities, such as creating tags, managing newsletter subscribers, and viewing submissions.</p>
      </Section>

      <Section id="settings" title="Settings" searchQuery={searchQuery}>
        <p>You can change your password and view your account information. Follow the same procedures as described in the Admin manual.</p>
      </Section>

      <Section id="errors" title="Error Handling and Restrictions" searchQuery={searchQuery}>
        <h3>Access Restrictions</h3>
        <p>You cannot:</p>
        <ul>
          <li>Access the Leads page - it's hidden from your sidebar</li>
          <li>Convert submissions to leads - the button won't appear</li>
          <li>View Reports - the page is hidden</li>
          <li>Access Users or Roles pages</li>
          <li>View lead-related activities</li>
        </ul>
        <h3>Why These Restrictions?</h3>
        <p>These restrictions ensure:</p>
        <ul>
          <li>Marketing focuses on submissions and newsletter management</li>
          <li>Lead management remains with Sales teams</li>
          <li>Clear separation of marketing and sales functions</li>
        </ul>
      </Section>

      <Section id="best-practices" title="Best Practices" searchQuery={searchQuery}>
        <h3>Submission Management</h3>
        <ul>
          <li>Review submissions daily</li>
          <li>Monitor submission trends to identify successful campaigns</li>
          <li>Track which form types generate the most interest</li>
          <li>Analyze submission timing patterns</li>
        </ul>
        <h3>Newsletter Management</h3>
        <ul>
          <li>Keep subscriber lists clean and up to date</li>
          <li>Use tags consistently for better organization</li>
          <li>Regularly review Active vs Inactive subscribers</li>
          <li>Segment subscribers effectively using tags</li>
        </ul>
        <h3>Reporting</h3>
        <ul>
          <li>Use dashboard metrics to track marketing performance</li>
          <li>Monitor submission trends over time</li>
          <li>Identify peak submission periods</li>
          <li>Share insights with Sales Managers</li>
        </ul>
        <h3>Collaboration</h3>
        <ul>
          <li>Coordinate with Sales Managers on submission quality</li>
          <li>Share submission trends and insights</li>
          <li>Ensure submissions are being converted to leads promptly</li>
        </ul>
      </Section>
    </div>
  );
}

// Read-Only Manual Component
function ReadOnlyManual({ searchQuery = '' }) {
  return (
    <div>
      <Section id="overview" title="Role Overview" searchQuery={searchQuery}>
        <p>
          As a <strong>Read-Only User</strong>, you have view-only access to leads and submissions. You cannot create, edit, or delete records.
        </p>
        <h3>Key Responsibilities</h3>
        <ul>
          <li>View leads assigned to you</li>
          <li>View form submissions</li>
          <li>Monitor activities</li>
          <li>Track your personal reminders</li>
        </ul>
        <h3>Access Control Summary</h3>
        <ul>
          <li><strong>View:</strong> Leads assigned to you, submissions, your activities, your reminders</li>
          <li><strong>Create:</strong> Reminders only</li>
          <li><strong>Edit:</strong> Your reminders only</li>
          <li><strong>Delete:</strong> Your reminders only</li>
          <li><strong>Cannot Access:</strong> Creating/editing leads, comments, call logs, reports, users, roles, newsletter</li>
        </ul>
      </Section>

      <Section id="getting-started" title="Getting Started" searchQuery={searchQuery}>
        <h3>Logging In</h3>
        <ol>
          <li>Navigate to the login page</li>
          <li>Enter your email address (e.g., <code>readonly@spars.com</code>)</li>
          <li>Enter your password (e.g., <code>readonly123</code>)</li>
          <li>Click "Sign In"</li>
        </ol>
      </Section>

      <Section id="dashboard" title="Dashboard Overview" searchQuery={searchQuery}>
        <p>Your dashboard shows your assigned leads and tasks. It's similar to the Sales Executive dashboard but with read-only access to leads.</p>
      </Section>

      <Section id="navigation" title="Header and Navigation" searchQuery={searchQuery}>
        <p>Your sidebar shows: Dashboard, Form Submissions, Leads, Calendar, Activities, and Settings. Reports, Newsletter, Users, and Roles are hidden.</p>
      </Section>

      <Section id="leads" title="Leads (Read-Only)" searchQuery={searchQuery}>
        <p>You can view leads assigned to you, but you cannot:</p>
        <ul>
          <li>Create new leads</li>
          <li>Change lead status</li>
          <li>Add comments</li>
          <li>Log calls</li>
          <li>Set follow-ups</li>
          <li>Delete leads</li>
        </ul>
        <p>All edit buttons and actions will be hidden or disabled for you.</p>
      </Section>

      <Section id="submissions" title="Form Submissions" searchQuery={searchQuery}>
        <p>You can view all form submissions and their details, but you cannot convert them to leads.</p>
      </Section>

      <Section id="calendar" title="Calendar" searchQuery={searchQuery}>
        <p>You can create and manage your personal reminders. You can view follow-ups for your assigned leads, but you cannot modify them.</p>
      </Section>

      <Section id="activities" title="Activities" searchQuery={searchQuery}>
        <p>You can view your own activities. You'll see view-only actions in the activity log.</p>
      </Section>

      <Section id="settings" title="Settings" searchQuery={searchQuery}>
        <p>You can change your password and view your account information.</p>
      </Section>

      <Section id="errors" title="Error Handling and Restrictions" searchQuery={searchQuery}>
        <p>If you attempt to edit or create records, you'll see error messages indicating you have read-only access. All edit buttons will be disabled or hidden.</p>
      </Section>

      <Section id="best-practices" title="Best Practices" searchQuery={searchQuery}>
        <ul>
          <li>Use your view access to stay informed about assigned leads</li>
          <li>Create reminders for important dates</li>
          <li>Monitor activities to track system changes</li>
          <li>Contact your Sales Manager if you need to make changes to leads</li>
        </ul>
      </Section>
    </div>
  );
}

// Utility function to highlight text in any string
const highlightText = (text, query) => {
  if (!query.trim() || !text) return text;
  
  // Escape special regex characters
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = String(text).split(regex);
  
  return parts.map((part, index) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} style={{ background: '#FFE066', padding: '2px 4px', borderRadius: '3px', fontWeight: 500 }}>
        {part}
      </mark>
    ) : (
      part
    )
  );
};

// Component to recursively highlight text in React children
function HighlightContent({ children, searchQuery }) {
  if (!searchQuery.trim()) {
    return <>{children}</>;
  }

  const processChildren = (children, keyPrefix = '') => {
    // Handle null, undefined, boolean, number
    if (children == null || typeof children === 'boolean') {
      return children;
    }
    
    if (typeof children === 'number') {
      return highlightText(String(children), searchQuery);
    }
    
    if (typeof children === 'string') {
      return highlightText(children, searchQuery);
    }
    
    if (Array.isArray(children)) {
      return children.map((child, index) => {
        const key = `${keyPrefix}-${index}`;
        if (typeof child === 'string') {
          return <span key={key}>{highlightText(child, searchQuery)}</span>;
        }
        if (typeof child === 'number') {
          return <span key={key}>{highlightText(String(child), searchQuery)}</span>;
        }
        if (React.isValidElement(child)) {
          // Preserve original key if it exists
          const elementKey = child.key || key;
          const { children: childChildren, ...props } = child.props;
          
          // Skip highlighting inside code, mark, strong, em, and other formatting tags
          const skipTags = ['code', 'mark', 'strong', 'em', 'b', 'i', 'pre', 'a'];
          if (skipTags.includes(child.type)) {
            return child;
          }
          
          return React.cloneElement(child, { 
            key: elementKey,
            ...props,
            children: processChildren(childChildren, elementKey)
          });
        }
        return <React.Fragment key={key}>{processChildren(child, key)}</React.Fragment>;
      });
    }
    
    if (React.isValidElement(children)) {
      const { children: childChildren, ...props } = children.props;
      
      // Skip highlighting inside code, mark, strong, em, and other formatting tags
      const skipTags = ['code', 'mark', 'strong', 'em', 'b', 'i', 'pre', 'a'];
      if (skipTags.includes(children.type)) {
        return children;
      }
      
      return React.cloneElement(children, {
        ...props,
        children: processChildren(childChildren, children.key || '')
      });
    }
    
    return children;
  };

  return <>{processChildren(children)}</>;
}

// Section Component for consistent formatting
function Section({ id, title, children, searchQuery = '' }) {
  return (
    <section id={id} style={{ marginBottom: '48px', scrollMarginTop: '80px' }}>
      <h2 style={{
        fontSize: '28px',
        fontWeight: 700,
        color: '#0A2342',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '2px solid var(--gray-200)'
      }}>
        {highlightText(title, searchQuery)}
      </h2>
      <div style={{
        fontSize: '16px',
        lineHeight: '1.8',
        color: '#333'
      }}>
        <HighlightContent searchQuery={searchQuery}>
          {children}
        </HighlightContent>
      </div>
    </section>
  );
}
