import { useNavigate } from '@workday/everywhere';
import { useWorkEvents } from '../everywhere/data/index.js';
import { home, eventDetail } from '../routes.js';
import type React from 'react';

export default function ManageEventsPage() {
  const navigate = useNavigate();
  const { data: events, error } = useWorkEvents();

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f5f5f5',
    padding: '24px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    gap: '16px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  };

  const buttonStyle = (variant: 'primary' | 'secondary' = 'primary'): React.CSSProperties => ({
    padding: '10px 20px',
    background: variant === 'primary' ? '#667eea' : '#e8e8e8',
    color: variant === 'primary' ? 'white' : '#333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  });

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  };

  const theadStyle: React.CSSProperties = {
    background: '#f8f8f8',
    borderBottom: '2px solid #e0e0e0',
  };

  const thStyle: React.CSSProperties = {
    padding: '16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const tdStyle: React.CSSProperties = {
    padding: '16px',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '14px',
    color: '#333',
  };

  const trHoverStyle: React.CSSProperties = {
    background: '#fafafa',
    cursor: 'pointer',
  };

  const linkStyle: React.CSSProperties = {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '500',
    cursor: 'pointer',
  };

  const statusBadgeStyle = (status: string): React.CSSProperties => {
    const colors: Record<string, { bg: string; color: string }> = {
      active: { bg: '#e8f5e9', color: '#2e7d32' },
      inactive: { bg: '#f3e5f5', color: '#7b1fa2' },
      draft: { bg: '#fff3e0', color: '#f57c00' },
    };
    const theme = colors[status] || colors.inactive;
    return {
      display: 'inline-block',
      padding: '4px 12px',
      background: theme.bg,
      color: theme.color,
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
    };
  };

  const errorStyle: React.CSSProperties = {
    background: '#fee',
    color: '#c33',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '16px',
  };

  const emptyStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
  };

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={headerStyle}>
            <h1 style={titleStyle}>Manage Events</h1>
            <button style={buttonStyle('secondary')} onClick={() => navigate(home, {})}>
              ← Home
            </button>
          </div>
          <div style={errorStyle}>Error loading events: {error.message}</div>
        </div>
      </div>
    );
  }

  const myEvents = Array.isArray(events) ? events : [];

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Manage Events</h1>
            <p style={{ color: '#999', margin: '8px 0 0 0' }}>
              {myEvents.length === 0
                ? 'No events'
                : `${myEvents.length} event${myEvents.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button style={buttonStyle('secondary')} onClick={() => navigate(home, {})}>
            ← Home
          </button>
        </div>

        {!Array.isArray(events) ? (
          <div style={emptyStyle}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>Loading events...</p>
          </div>
        ) : myEvents.length === 0 ? (
          <div style={emptyStyle}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>
              You haven't created any events yet
            </p>
          </div>
        ) : (
          <table style={tableStyle}>
            <thead style={theadStyle}>
              <tr>
                <th style={thStyle}>Event Name</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Start Date</th>
                <th style={thStyle}>Registrants</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myEvents
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                .map((event) => {
                  const registrantCount = event.registrants?.length || 0;
                  const isUpcoming = new Date(event.startDate) > new Date();
                  const status = isUpcoming ? 'active' : 'inactive';

                  return (
                    <tr key={event.id} style={trHoverStyle}>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          style={{
                            ...linkStyle,
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                          }}
                          onClick={() => navigate(eventDetail, { id: event.id })}
                        >
                          {event.name}
                        </button>
                      </td>
                      <td style={tdStyle}>{event.location}</td>
                      <td style={tdStyle}>
                        {new Date(event.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={tdStyle}>{registrantCount}</td>
                      <td style={tdStyle}>
                        <div style={statusBadgeStyle(status)}>
                          {status === 'active' ? 'Active' : 'Past'}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <button
                          style={{
                            ...buttonStyle('secondary'),
                            padding: '6px 12px',
                            fontSize: '12px',
                          }}
                          onClick={() => navigate(eventDetail, { id: event.id })}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
