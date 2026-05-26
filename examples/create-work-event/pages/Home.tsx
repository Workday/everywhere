import { useNavigate } from '@workday/everywhere';
import type { CSSProperties, MouseEvent } from 'react';
import { browseEvents, createEvent, manageEvents, myEvents } from '../routes.js';

export default function HomePage() {
  const navigate = useNavigate();

  const containerStyle: CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '40px 20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  };

  const contentStyle: CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 2,
  };

  const heroStyle: CSSProperties = {
    color: 'white',
    textAlign: 'center',
    marginBottom: '60px',
    paddingTop: '40px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: '0 0 16px 0',
    letterSpacing: '-0.5px',
  };

  const subtitleStyle: CSSProperties = {
    fontSize: '20px',
    fontWeight: '300',
    margin: '0 0 40px 0',
    opacity: 0.95,
  };

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  };

  const benefitStyle: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '24px',
    borderRadius: '12px',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  };

  const benefitIconStyle: CSSProperties = {
    fontSize: '32px',
    marginBottom: '12px',
  };

  const benefitTitleStyle: CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  };

  const benefitTextStyle: CSSProperties = {
    fontSize: '14px',
    opacity: 0.9,
    lineHeight: '1.5',
  };

  const actionGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginTop: '60px',
    position: 'relative',
    zIndex: 3,
    pointerEvents: 'auto',
  };

  const buttonStyle = (primary = false): CSSProperties => ({
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: primary ? 'white' : 'rgba(255, 255, 255, 0.2)',
    color: primary ? '#667eea' : 'white',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minHeight: '48px',
    pointerEvents: 'auto',
  });

  const handleBrowseNav = (type: string) => {
    return (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      navigate(browseEvents, { type });
    };
  };

  const goMyEvents = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(myEvents, {});
  };

  const goCreateEvent = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(createEvent, {});
  };

  const goManageEvents = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(manageEvents, {});
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <div style={heroStyle}>
          <h1 style={titleStyle}>Work Event Registration</h1>
          <p style={subtitleStyle}>Connect with your team through meaningful events</p>
        </div>

        <div style={gridStyle}>
          <div style={benefitStyle}>
            <div style={benefitIconStyle}>🎯</div>
            <div style={benefitTitleStyle}>Reduces Stress</div>
            <div style={benefitTextStyle}>Take a break from work and unwind with colleagues</div>
          </div>
          <div style={benefitStyle}>
            <div style={benefitIconStyle}>🚀</div>
            <div style={benefitTitleStyle}>Increases Engagement</div>
            <div style={benefitTextStyle}>Build stronger connections and team cohesion</div>
          </div>
          <div style={benefitStyle}>
            <div style={benefitIconStyle}>🤝</div>
            <div style={benefitTitleStyle}>Fosters Community</div>
            <div style={benefitTextStyle}>Create a positive workplace culture together</div>
          </div>
        </div>

        <div style={{ ...benefitStyle, marginBottom: '40px' }}>
          <h3 style={{ ...benefitTitleStyle, marginBottom: '16px' }}>Popular Event Types</h3>
          <p style={{ margin: '0 0 14px 0', fontSize: '13px', opacity: 0.9 }}>
            Tip: Click an event type to jump to Browse Events with that type pre-filtered.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              position: 'relative',
              zIndex: 3,
              pointerEvents: 'auto',
            }}
          >
            {[
              { label: '🎉 Potlucks', type: 'potluck' },
              { label: '🍻 Happy Hours', type: 'happy-hour' },
              { label: '🤸 Team Building', type: 'team-building' },
              { label: '🎨 Workshops', type: 'workshop' },
              { label: '⛷️ Outings', type: 'outing' },
              { label: '🎵 Social Mixers', type: 'social' },
            ].map((event) => (
              <button
                type="button"
                key={event.type}
                onClick={handleBrowseNav(event.type)}
                style={{
                  appearance: 'none',
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  pointerEvents: 'auto',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {event.label}
              </button>
            ))}
          </div>
        </div>

        <div style={actionGridStyle}>
          <button type="button" style={buttonStyle(true)} onClick={handleBrowseNav('')}>
            📅 Browse Events
          </button>
          <button type="button" style={buttonStyle(false)} onClick={goMyEvents}>
            ✓ My Events
          </button>
          <button type="button" style={buttonStyle(false)} onClick={goCreateEvent}>
            ➕ Create Event
          </button>
          <button type="button" style={buttonStyle(false)} onClick={goManageEvents}>
            ⚙️ Manage Events
          </button>
        </div>
      </div>
    </div>
  );
}
