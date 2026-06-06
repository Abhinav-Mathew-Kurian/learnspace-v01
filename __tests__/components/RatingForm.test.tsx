'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RatingForm from '@/components/home/RatingForm';

jest.mock('lucide-react', () => ({
  Star: ({ className }: { className?: string }) => <span data-testid="star" className={className ?? ''} />,
  Send: () => <span data-testid="send-icon" />,
  CheckCircle: () => <span data-testid="check-icon" />,
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helpers
function getNameInput() { return screen.getByPlaceholderText(/Priya Sharma/i); }
function getCommentArea() { return screen.getByPlaceholderText(/share your experience/i); }
function getStarButtons() {
  // Star buttons have type="button"; submit has type="submit"
  return screen.getAllByRole('button').filter((b) => b.getAttribute('type') === 'button');
}
function getSubmitButton() { return screen.getByRole('button', { name: /submit rating/i }); }

describe('RatingForm', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('renders name input, role selector, 5 star buttons, comment textarea, submit button', () => {
    render(<RatingForm />);
    expect(getNameInput()).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument(); // "I am a" selector
    expect(getStarButtons()).toHaveLength(5);
    expect(getCommentArea()).toBeInTheDocument();
    expect(getSubmitButton()).toBeInTheDocument();
  });

  it('shows validation error when submitting with no star selected', async () => {
    render(<RatingForm />);
    // Use fireEvent.submit on the form — more reliable than clicking submit button in jsdom
    const form = screen.getByRole('button', { name: /submit rating/i }).closest('form')!;
    await act(async () => { fireEvent.submit(form); });
    expect(screen.getByText(/please select a star rating/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('clicking star 3 fills the first 3 stars with amber color', () => {
    render(<RatingForm />);
    const starButtons = getStarButtons();
    fireEvent.click(starButtons[2]); // 0-indexed → star 3
    const allStars = screen.getAllByTestId('star');
    const filledCount = allStars.filter((s) => s.className.includes('fill-amber-400')).length;
    expect(filledCount).toBe(3);
  });

  it('clicking star 5 fills all 5 stars', () => {
    render(<RatingForm />);
    const starButtons = getStarButtons();
    fireEvent.click(starButtons[4]); // star 5
    const allStars = screen.getAllByTestId('star');
    const filledCount = allStars.filter((s) => s.className.includes('fill-amber-400')).length;
    expect(filledCount).toBe(5);
  });

  it('shows server error from API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Comment must be at least 10 characters' }),
    } as never);

    render(<RatingForm />);
    fireEvent.click(getStarButtons()[4]); // star 5
    fireEvent.change(getNameInput(), { target: { value: 'Alice' } });
    fireEvent.change(getCommentArea(), { target: { value: 'Short' } });

    await act(async () => { fireEvent.click(getSubmitButton()); });
    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('shows success confirmation after successful submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    } as never);

    render(<RatingForm />);
    fireEvent.click(getStarButtons()[4]); // star 5
    fireEvent.change(getNameInput(), { target: { value: 'Happy Student' } });
    fireEvent.change(getCommentArea(), { target: { value: 'Excellent course! Really worth it.' } });

    await act(async () => { fireEvent.click(getSubmitButton()); });
    await waitFor(() => {
      expect(screen.getByText(/thank you for your feedback/i)).toBeInTheDocument();
    });
  });

  it('submit button shows "Submitting..." while request is in-flight', async () => {
    let resolveFetch: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolveFetch = r; }));

    render(<RatingForm />);
    fireEvent.click(getStarButtons()[0]); // star 1
    fireEvent.change(getNameInput(), { target: { value: 'Tester' } });
    fireEvent.change(getCommentArea(), { target: { value: 'Long enough comment here' } });

    act(() => { fireEvent.click(getSubmitButton()); });
    await waitFor(() => { expect(screen.getByText(/submitting/i)).toBeInTheDocument(); });

    act(() => { resolveFetch!({ ok: true, json: jest.fn().mockResolvedValue({ success: true }) }); });
  });
});
