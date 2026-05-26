import { useNavigate, useParams } from '@workday/everywhere';
import { useWorkEvent } from '../everywhere/data/index.js';
import type { Registrant } from '../everywhere/data/models.js';
import { browseEvents, eventDetail, home } from '../routes.js';
import { useState } from 'react';
import type React from 'react';

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams(eventDetail);
  const { data: event, error } = useWorkEvent(id);
  const [isRegistering, setIsRegistering] = useState(false);

  const formatCost = (cost: { amount: number; currency: string }) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cost.currency,
    }).format(cost.amount);

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f5f5f5',
    padding: '24px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '900px',
    margin: '0 auto',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
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

  const heroStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '40px',
    borderRadius: '8px',
    marginBottom: '24px',
  };

  const heroTitleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 16px 0',
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px',
    marginTop: '24px',
    paddingBottom: '8px',
    borderBottom: '2px solid #667eea',
  };

  const infoRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '150px 1fr',
    gap: '16px',
    marginBottom: '12px',
    alignItems: 'start',
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: '600',
    color: '#666',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const valueStyle: React.CSSProperties = {
    color: '#333',
    fontSize: '14px',
    lineHeight: '1.6',
  };

  const registrantListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const registrantItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#f9f9f9',
    borderRadius: '6px',
    fontSize: '14px',
  };

  const avatarStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '12px',
  };

  const errorStyle: React.CSSProperties = {
    background: '#fee',
    color: '#c33',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '16px',
  };

  const loadingStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
  };

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={headerStyle}>
            <h1>Event Details</h1>
            <button style={buttonStyle('secondary')} onClick={() => navigate(home, {})}>
              ← Home
            </button>
          </div>
          <div style={errorStyle}>Error loading event: {error.message}</div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={loadingStyle}>
            <p style={{ fontSize: '18px' }}>Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Event Details</h1>
          <button style={buttonStyle('secondary')} onClick={() => navigate(browseEvents, { type: '' })}>
            ← Back
          </button>
        </div>

        <div style={heroStyle}>
          <div style={heroTitleStyle}>{event.name}</div>
          <div style={{ opacity: 0.95, fontSize: '16px' }}>{event.description}</div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Event Information</h2>

          <div style={infoRowStyle}>
            <div style={labelStyle}>📍 Location</div>
            <div style={valueStyle}>{event.location}</div>
          </div>

          <div style={infoRowStyle}>
            <div style={labelStyle}>📅 Start Date</div>
            <div style={valueStyle}>
              {new Date(event.startDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          {event.endDate && (
            <div style={infoRowStyle}>
              <div style={labelStyle}>📅 End Date</div>
              <div style={valueStyle}>
                {new Date(event.endDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          )}

          <div style={infoRowStyle}>
            <div style={labelStyle}>👤 Sponsor</div>
            <div style={valueStyle}>{event.sponsor}</div>
          </div>

          {event.cost && (
            <div style={infoRowStyle}>
              <div style={labelStyle}>💰 Cost</div>
              <div style={valueStyle}>{formatCost(event.cost)}</div>
            </div>
          )}

          {event.contactInfo && (
            <div style={infoRowStyle}>
              <div style={labelStyle}>📞 Contact</div>
              <div style={valueStyle}>{event.contactInfo}</div>
            </div>
          )}

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button
              style={{
                ...buttonStyle('primary'),
                flex: 1,
              }}
              onClick={() => {
                setIsRegistering(true);
                // Registration logic would go here
                setTimeout(() => setIsRegistering(false), 1000);
              }}
              disabled={isRegistering}
            >
              {isRegistering ? 'Registering...' : '✓ Register for Event (demo)'}
            </button>
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
            Registration is currently a UI demo in this example.
          </div>
        </div>

        {event.registrants && event.registrants.length > 0 && (
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Registrants ({event.registrants.length})</h2>
            <div style={registrantListStyle}>
              {event.registrants.slice(0, 10).map((registrant: Registrant, idx: number) => (
                <div key={registrant.id || idx} style={registrantItemStyle}>
                  <div style={avatarStyle}>👤</div>
                  <div style={{ flex: 1 }}>Registrant {idx + 1}</div>
                </div>
              ))}
              {event.registrants.length > 10 && (
                <div
                  style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '13px' }}
                >
                  +{event.registrants.length - 10} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
