import { useNavigate, useParams } from '@workday/everywhere';
import { useWorkEvents } from '../everywhere/data/index.js';
import type { WorkEvent } from '../everywhere/data/models.js';
import { browseEvents, eventDetail, home } from '../routes.js';
import { useMemo } from 'react';

export default function BrowseEventsPage() {
  const navigate = useNavigate();
  const params = (useParams(browseEvents) ?? {}) as { type?: string };
  const { data: events, error } = useWorkEvents();

  // Filter events by type based on description or sponsor
  const filteredEvents = useMemo(() => {
    if (!Array.isArray(events) || !params.type) return events;

    const typeKeywords: Record<string, string[]> = {
      potluck: ['potluck', 'food', 'lunch', 'dinner', 'meal'],
      'happy-hour': ['happy hour', 'drinks', 'bar', 'social'],
      'team-building': ['team building', 'team', 'building', 'activity'],
      workshop: ['workshop', 'training', 'learning', 'seminar'],
      outing: ['outing', 'trip', 'adventure', 'hiking', 'skiing'],
      social: ['social', 'mixer', 'networking', 'meet'],
    };

    const keywords = typeKeywords[params.type] || [];
    const searchText = (event: WorkEvent) =>
      `${event.name} ${event.description} ${event.sponsor}`.toLowerCase();

    return events.filter((event) => keywords.some((kw) => searchText(event).includes(kw)));
  }, [events, params.type]);

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
    flexWrap: 'wrap',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.2s',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  };

  const cardImageStyle: React.CSSProperties = {
    width: '100%',
    height: '200px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    color: 'white',
  };

  const cardContentStyle: React.CSSProperties = {
    padding: '16px',
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px 0',
    display: 'block',
  };

  const cardMetaStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#666',
    margin: '8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const cardDescStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#555',
    margin: '12px 0',
    lineHeight: '1.5',
    maxHeight: '60px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  };

  const cardFooterStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  };

  const actionButtonStyle = (
    variant: 'primary' | 'secondary' = 'primary'
  ): React.CSSProperties => ({
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
    background: variant === 'primary' ? '#667eea' : '#e8e8e8',
    color: variant === 'primary' ? 'white' : '#333',
  });

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
          <div style={errorStyle}>Error loading events: {error.message}</div>
          <button style={buttonStyle} onClick={() => navigate(home)}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Browse Events</h1>
            {params.type && (
              <p style={{ color: '#999', margin: '8px 0 0 0', fontSize: '14px' }}>
                Filtered by: <strong>{params.type.replace(/-/g, ' ')}</strong>
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {params.type && (
              <button type="button" style={buttonStyle} onClick={() => navigate(browseEvents, {})}>
                Clear Filter
              </button>
            )}
            <button type="button" style={buttonStyle} onClick={() => navigate(home)}>
              ← Home
            </button>
          </div>
        </div>

        {!Array.isArray(events) ? (
          <div style={emptyStyle}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div style={emptyStyle}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>No events available</p>
            <button style={buttonStyle} onClick={() => navigate(home)}>
              Back to Home
            </button>
          </div>
        ) : filteredEvents && filteredEvents.length === 0 ? (
          <div style={emptyStyle}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>No events match this type</p>
            <button type="button" style={buttonStyle} onClick={() => navigate(browseEvents, {})}>
              View All Events
            </button>
          </div>
        ) : (
          <div style={gridStyle}>
            {filteredEvents.map((event) => (
              <div key={event.id} style={cardStyle}>
                <div style={cardImageStyle}>📅</div>
                <div style={cardContentStyle}>
                  <a
                    style={{
                      ...cardTitleStyle,
                      color: '#667eea',
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(eventDetail, { id: event.id })}
                  >
                    {event.name}
                  </a>
                  <div style={cardMetaStyle}>📍 {event.location}</div>
                  <div style={cardMetaStyle}>
                    📅 {new Date(event.startDate).toLocaleDateString()}
                  </div>
                  {event.cost && <div style={cardMetaStyle}>💰 ${event.cost}</div>}
                  <div style={cardDescStyle}>{event.description}</div>
                  <div style={cardFooterStyle}>
                    <button
                      style={actionButtonStyle('primary')}
                      onClick={() => navigate(eventDetail, { id: event.id })}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
