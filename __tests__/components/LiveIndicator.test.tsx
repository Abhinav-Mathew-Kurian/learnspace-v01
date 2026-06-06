'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import LiveIndicator from '@/components/shared/LiveIndicator';

describe('LiveIndicator', () => {
  it('renders the label text (defaults to "LIVE NOW")', () => {
    render(<LiveIndicator />);
    expect(screen.getByText('LIVE NOW')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(<LiveIndicator label="Streaming" />);
    expect(screen.getByText('Streaming')).toBeInTheDocument();
  });

  it('renders the animated ping dot (red indicator)', () => {
    const { container } = render(<LiveIndicator />);
    // The component renders a blinking red dot using animate-ping
    const ping = container.querySelector('.animate-ping');
    expect(ping).toBeInTheDocument();
  });

  it('renders a solid red dot', () => {
    const { container } = render(<LiveIndicator />);
    const solidDot = container.querySelector('.bg-red-500');
    expect(solidDot).toBeInTheDocument();
  });

  it('label text has red color class', () => {
    const { container } = render(<LiveIndicator />);
    const label = container.querySelector('.text-red-600');
    expect(label).toBeInTheDocument();
    expect(label?.textContent).toBe('LIVE NOW');
  });

  it('applies sm size classes with size="sm"', () => {
    const { container } = render(<LiveIndicator size="sm" />);
    const dot = container.querySelector('.w-2.h-2');
    expect(dot).toBeInTheDocument();
  });

  it('applies lg size classes with size="lg"', () => {
    const { container } = render(<LiveIndicator size="lg" />);
    const dot = container.querySelector('.w-3.h-3');
    expect(dot).toBeInTheDocument();
  });

  it('uppercase label is visually rendered as uppercase', () => {
    render(<LiveIndicator label="live now" />);
    const span = screen.getByText('live now');
    expect(span.className).toContain('uppercase');
  });
});
