import { useNavigate } from '@workday/everywhere';
import { useWorkEvents } from '../everywhere/data/index.js';
import { home, eventDetail } from '../routes.js';
import type React from 'react';

export default function MyEventsPage() {
  const navigate = useNavigate();
  const { data: events, error } = useWorkEvents();

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f5f5f5',
    padding: '24px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1000px',
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

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const eventRowStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '8px',
    padding: '20px',
    display: 'grid',
    gridTemplateColumns: '1fr auto auto',
    gap: '20px',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.2s',
  };

  const eventNameStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px 0',
  };

  const eventMetaStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#999',
    margin: '4px 0',
  };

  const statusBadgeStyle = (status: string): React.CSSProperties => {
    const colors: Record<string, { bg: string; color: string }> = {
      upcoming: { bg: '#e3f2fd', color: '#1976d2' },
      today: { bg: '#fff3e0', color: '#f57c00' },
      past: { bg: '#f3e5f5', color: '#7b1fa2' },
    };
    const theme = colors[status] || colors.upcoming;
    return {
      padding: '6px 12px',
      background: theme.bg,
      color: theme.color,
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
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

  const getEventStatus = (startDate: string): string => {
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);

    if (start.getTime() === today.getTime()) return 'today';
    if (start.getTime() > today.getTime()) return 'upcoming';
    return 'past';
  };

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={headerStyle}>
            <h1 style={titleStyle}>My Events</h1>
            <button style={buttonStyle('secondary')} onClick={() => navigate(home, {})}>
              ← Home
            </button>
          </div>
          <div style={errorStyle}>Error loading events: {error.message}</div>
        </div>
      </div>
    );
  }

  const registeredEvents = Array.isArray(events)
    ? events.filter((e) => e.registrants?.length > 0)
    : [];

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>My Events</h1>
            <p style={{ color: '#999', margin: '8px 0 0 0' }}>
              {registeredEvents.length === 0
                ? 'No events registered'
                : `${registeredEvents.length} event${registeredEvents.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button style={buttonStyle('secondary')} onClick={() => navigate(home, {})}>
            ← Home
          </button>
        </div>

        {!Array.isArray(events) ? (
          <div style={emptyStyle}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>Loading your events...</p>
          </div>
        ) : registeredEvents.length === 0 ? (
          <div style={emptyStyle}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>
              You haven't registered for any events yet
            </p>
            <button style={buttonStyle('primary')} onClick={() => navigate(home, {})}>
              Browse Events
            </button>
          </div>
        ) : (
          <div style={listStyle}>
            {registeredEvents
              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
              .map((event) => {
                const status = getEventStatus(event.startDate);
                return (
                  <div key={event.id} style={eventRowStyle}>
                    <div>
                      <button
                        type="button"
                        style={{
                          ...eventNameStyle,
                          color: '#667eea',
                          cursor: 'pointer',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left',
                        }}
                        onClick={() => navigate(eventDetail, { id: event.id })}
                      >
                        {event.name}
                      </button>
                      <div style={eventMetaStyle}>📍 {event.location}</div>
                      <div style={eventMetaStyle}>
                        📅{' '}
                        {new Date(event.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div style={statusBadgeStyle(status)}>
                      {status === 'today' && '🔔 Today'}
                      {status === 'upcoming' && '📅 Upcoming'}
                      {status === 'past' && '✓ Past'}
                    </div>
                    <button
                      style={buttonStyle('secondary')}
                      onClick={() => navigate(eventDetail, { id: event.id })}
                    >
                      View
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
