'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import EnquiryForm from '@/components/home/EnquiryForm';

jest.mock('lucide-react', () => ({
  Send: () => <span data-testid="send-icon" />,
  CheckCircle: () => <span data-testid="check-icon" />,
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('EnquiryForm', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders all required form fields', () => {
    render(<EnquiryForm />);
    expect(screen.getByPlaceholderText(/your full name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument(); // subject dropdown
    expect(screen.getByPlaceholderText(/describe your question/i)).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    render(<EnquiryForm />);
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('shows API error when submission fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Message must be at least 10 characters' }),
    } as never);

    render(<EnquiryForm />);
    fireEvent.change(screen.getByPlaceholderText(/your full name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/describe your question/i), { target: { value: 'Short' } });

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /send message/i })); });
    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('shows success message after successful submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    } as never);

    render(<EnquiryForm />);
    fireEvent.change(screen.getByPlaceholderText(/your full name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: 'jane@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/describe your question/i), {
      target: { value: 'I would like to know more about your courses.' },
    });

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /send message/i })); });
    await waitFor(() => {
      expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument();
    });
  });

  it('success message shows the submitted email', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    } as never);

    render(<EnquiryForm />);
    fireEvent.change(screen.getByPlaceholderText(/your full name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/describe your question/i), {
      target: { value: 'Detailed enquiry message goes here.' },
    });

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /send message/i })); });
    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });
  });

  it('shows "Sending..." on submit button while request is in-flight', async () => {
    let resolveFetch: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolveFetch = r; }));

    render(<EnquiryForm />);
    fireEvent.change(screen.getByPlaceholderText(/your full name/i), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: 'bob@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/describe your question/i), {
      target: { value: 'What courses do you offer here?' },
    });

    act(() => { fireEvent.click(screen.getByRole('button', { name: /send message/i })); });
    await waitFor(() => {
      expect(screen.getByText(/sending/i)).toBeInTheDocument();
    });

    act(() => {
      resolveFetch!({ ok: true, json: jest.fn().mockResolvedValue({ success: true }) });
    });
  });

  it('calls fetch with correct URL and method', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    } as never);

    render(<EnquiryForm />);
    fireEvent.change(screen.getByPlaceholderText(/your full name/i), { target: { value: 'Carol' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: 'carol@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/describe your question/i), {
      target: { value: 'Please provide information about enrollment.' },
    });

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /send message/i })); });
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/enquiries');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toMatchObject({ 'Content-Type': 'application/json' });
    const body = JSON.parse(opts.body as string) as { name: string; email: string };
    expect(body.name).toBe('Carol');
    expect(body.email).toBe('carol@test.com');
  });
});
