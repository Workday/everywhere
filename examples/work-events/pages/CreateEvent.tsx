import { useNavigate } from '@workday/everywhere';
import { useWorkEventMutation } from '../everywhere/data/index.js';
import { home, browseEvents } from '../routes.js';
import { useState } from 'react';
import type React from 'react';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const mutation = useWorkEventMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    sponsor: '',
    contactInfo: '',
    startDate: '',
    endDate: '',
    internalOnly: false,
  });

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f5f5f5',
    padding: '24px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '700px',
    margin: '0 auto',
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '32px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#999',
  };

  const formStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '8px',
    padding: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  };

  const fieldGroupStyle: React.CSSProperties = {
    marginBottom: '24px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  };

  const inputStyle = (hasError = false): React.CSSProperties => ({
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: hasError ? '2px solid #f44336' : '1px solid #ddd',
    borderRadius: '6px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    color: '#000',
  });

  const errorTextStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#f44336',
    marginTop: '4px',
  };

  const twoColumnStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  };

  const checkboxWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const checkboxStyle: React.CSSProperties = {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    marginTop: '32px',
  };

  const buttonStyle = (variant: 'primary' | 'secondary' = 'primary'): React.CSSProperties => ({
    flex: 1,
    padding: '12px 24px',
    background: variant === 'primary' ? '#667eea' : '#e8e8e8',
    color: variant === 'primary' ? 'white' : '#333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Event name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await mutation.create({
        ...formData,
      });

      if (result?.id) {
        navigate(browseEvents, { type: '' });
      }
    } catch {
      setErrors({ submit: 'Failed to create event. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Create New Event</h1>
          <p style={subtitleStyle}>Fill in the details to create a new work event</p>
        </div>

        <form style={formStyle} onSubmit={handleSubmit}>
          {errors.submit && (
            <div
              style={{
                background: '#fee',
                color: '#c33',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              {errors.submit}
            </div>
          )}

          <div style={fieldGroupStyle}>
            <label htmlFor="event-name" style={labelStyle}>
              Event Name *
            </label>
            <input
              id="event-name"
              type="text"
              style={inputStyle(!!errors.name)}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Team Building Picnic"
            />
            {errors.name && <div style={errorTextStyle}>{errors.name}</div>}
          </div>

          <div style={fieldGroupStyle}>
            <label htmlFor="event-description" style={labelStyle}>
              Description *
            </label>
            <textarea
              id="event-description"
              style={{
                ...inputStyle(!!errors.description),
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the event..."
            />
            {errors.description && <div style={errorTextStyle}>{errors.description}</div>}
          </div>

          <div style={fieldGroupStyle}>
            <label htmlFor="event-location" style={labelStyle}>
              Location *
            </label>
            <input
              id="event-location"
              type="text"
              style={inputStyle(!!errors.location)}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Central Park"
            />
            {errors.location && <div style={errorTextStyle}>{errors.location}</div>}
          </div>

          <div style={twoColumnStyle}>
            <div style={fieldGroupStyle}>
              <label htmlFor="event-sponsor" style={labelStyle}>
                Sponsor
              </label>
              <input
                id="event-sponsor"
                type="text"
                style={inputStyle()}
                value={formData.sponsor}
                onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
                placeholder="e.g., HR Department"
              />
            </div>
            <div style={fieldGroupStyle}>
              <label htmlFor="event-contact-info" style={labelStyle}>
                Contact Info
              </label>
              <input
                id="event-contact-info"
                type="text"
                style={inputStyle()}
                value={formData.contactInfo}
                onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                placeholder="e.g., contact@example.com"
              />
            </div>
          </div>

          <div style={twoColumnStyle}>
            <div style={fieldGroupStyle}>
              <label htmlFor="event-start-date" style={labelStyle}>
                Start Date *
              </label>
              <input
                id="event-start-date"
                type="date"
                style={inputStyle(!!errors.startDate)}
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
              {errors.startDate && <div style={errorTextStyle}>{errors.startDate}</div>}
            </div>
            <div style={fieldGroupStyle}>
              <label htmlFor="event-end-date" style={labelStyle}>
                End Date
              </label>
              <input
                id="event-end-date"
                type="date"
                style={inputStyle(!!errors.endDate)}
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
              {errors.endDate && <div style={errorTextStyle}>{errors.endDate}</div>}
            </div>
          </div>

          <div style={fieldGroupStyle}>
            <div style={checkboxWrapperStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                id="internal"
                checked={formData.internalOnly}
                onChange={(e) => setFormData({ ...formData, internalOnly: e.target.checked })}
              />
              <label
                htmlFor="internal"
                style={{
                  cursor: 'pointer',
                  margin: 0,
                  fontWeight: '500',
                  fontSize: '14px',
                  color: '#000',
                }}
              >
                Internal Only Event
              </label>
            </div>
          </div>

          <div style={buttonGroupStyle}>
            <button type="button" style={buttonStyle('secondary')} onClick={() => navigate(home)}>
              Cancel
            </button>
            <button type="submit" style={buttonStyle('primary')} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
