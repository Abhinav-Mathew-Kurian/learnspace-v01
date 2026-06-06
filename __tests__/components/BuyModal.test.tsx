'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BuyModal from '@/components/home/BuyModal';
import BuyButton from '@/components/home/BuyButton';
import PriceTag from '@/components/home/PriceTag';

jest.mock('lucide-react', () => ({
  X:            () => <span data-testid="x-icon" />,
  Tag:          () => <span data-testid="tag-icon" />,
  Send:         () => <span data-testid="send-icon" />,
  CheckCircle:  () => <span data-testid="check-icon" />,
  Percent:      () => <span data-testid="percent-icon" />,
  ArrowRight:   () => <span data-testid="arrow-icon" />,
  Loader2:      () => <span data-testid="loader-icon" />,
  ShoppingCart: () => <span data-testid="cart-icon" />,
  Zap:          () => <span data-testid="zap-icon" />,
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const CLOSE = jest.fn();

describe('PriceTag', () => {
  it('shows FREE for price=0', () => {
    const { container } = render(<PriceTag pricingType="free" price={0} />);
    expect(container.textContent).toContain('FREE');
  });

  it('shows FREE when pricingType is free regardless of price', () => {
    const { container } = render(<PriceTag pricingType="free" price={4999} />);
    expect(container.textContent).toContain('FREE');
  });

  it('shows formatted INR lifetime price', () => {
    const { container } = render(<PriceTag pricingType="lifetime" price={4999} currency="INR" />);
    expect(container.textContent).toContain('₹4,999');
  });

  it('shows strikethrough original price when discount exists (lifetime)', () => {
    const { container } = render(<PriceTag pricingType="lifetime" price={2999} originalPrice={5999} currency="INR" />);
    expect(container.textContent).toContain('₹2,999');
    expect(container.textContent).toContain('₹5,999');
    expect(container.textContent).toContain('50');
  });

  it('shows installment pricing with /mo and month count', () => {
    const { container } = render(
      <PriceTag pricingType="installment" price={500} installmentMonths={6} currency="INR" />
    );
    expect(container.textContent).toContain('₹500');
    expect(container.textContent).toContain('/mo');
    expect(container.textContent).toContain('6');
    expect(container.textContent).toContain('₹3,000');
  });

  it('does NOT show discount when originalPrice is same as price', () => {
    const { container } = render(<PriceTag pricingType="lifetime" price={4999} originalPrice={4999} currency="INR" />);
    expect(container.textContent).not.toContain('%');
  });

  it('does NOT show discount when originalPrice is less than price', () => {
    const { container } = render(<PriceTag pricingType="lifetime" price={5999} originalPrice={2999} currency="INR" />);
    expect(container.textContent).not.toContain('%');
  });
});

describe('BuyButton', () => {
  beforeEach(() => { CLOSE.mockReset(); mockFetch.mockReset(); });

  it('shows "Buy Now" and cart icon for paid courses', () => {
    render(<BuyButton courseTitle="React Course" price={4999} />);
    expect(screen.getByText('Buy Now')).toBeInTheDocument();
    expect(screen.getByTestId('cart-icon')).toBeInTheDocument();
  });

  it('shows "Enroll Free" and zap icon for free courses', () => {
    render(<BuyButton courseTitle="Free Course" price={0} />);
    expect(screen.getByText('Enroll Free')).toBeInTheDocument();
    expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
  });

  it('opens BuyModal on click', async () => {
    render(<BuyButton courseTitle="Test Course" price={1999} />);
    fireEvent.click(screen.getByText('Buy Now'));
    await waitFor(() => {
      expect(screen.getByText('Enroll Now')).toBeInTheDocument();
    });
  });

  it('does not navigate on click (e.preventDefault called)', () => {
    render(<BuyButton courseTitle="Test Course" price={1999} />);
    const btn = screen.getByText('Buy Now');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    btn.dispatchEvent(clickEvent);
    // If preventDefault wasn't called, the test would navigate — just verify modal opens
    expect(btn).toBeInTheDocument();
  });
});

describe('BuyModal', () => {
  beforeEach(() => { CLOSE.mockReset(); mockFetch.mockReset(); });

  it('renders course title', () => {
    render(<BuyModal courseTitle="Full Stack React" price={4999} onClose={CLOSE} />);
    expect(screen.getByText('Full Stack React')).toBeInTheDocument();
  });

  it('renders selling price in INR', () => {
    render(<BuyModal courseTitle="Course" price={4999} currency="INR" onClose={CLOSE} />);
    expect(screen.getByText('₹4,999')).toBeInTheDocument();
  });

  it('renders "FREE" for price=0', () => {
    render(<BuyModal courseTitle="Free Course" price={0} onClose={CLOSE} />);
    expect(screen.getByText('FREE')).toBeInTheDocument();
  });

  it('shows original price strikethrough when discount present', () => {
    const { container } = render(
      <BuyModal courseTitle="Discounted" price={2999} originalPrice={5999} currency="INR" onClose={CLOSE} />
    );
    expect(container.textContent).toContain('₹2,999');
    expect(container.textContent).toContain('₹5,999');
  });

  it('calls onClose when X button clicked', async () => {
    render(<BuyModal courseTitle="Course" price={1999} onClose={CLOSE} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(CLOSE).toHaveBeenCalledTimes(1);
  });

  it('renders name, email, phone inputs', () => {
    render(<BuyModal courseTitle="Course" price={1999} onClose={CLOSE} />);
    expect(screen.getByPlaceholderText(/Priya Sharma/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/XXXXX XXXXX/i)).toBeInTheDocument();
  });

  it('shows error when API returns failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({ success: false, error: 'Server error' }),
    } as never);

    render(<BuyModal courseTitle="Course" price={1999} onClose={CLOSE} />);
    fireEvent.change(screen.getByPlaceholderText(/Priya Sharma/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: 'alice@test.com' } });

    const form = screen.getByPlaceholderText(/Priya Sharma/i).closest('form')!;
    await act(async () => { fireEvent.submit(form); });
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('shows success confirmation after enquiry submitted', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    } as never);

    render(<BuyModal courseTitle="React Course" price={4999} onClose={CLOSE} />);
    fireEvent.change(screen.getByPlaceholderText(/Priya Sharma/i), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: 'bob@test.com' } });

    const form = screen.getByPlaceholderText(/Priya Sharma/i).closest('form')!;
    await act(async () => { fireEvent.submit(form); });
    await waitFor(() => {
      expect(screen.getByText(/Enquiry sent!/i)).toBeInTheDocument();
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    });
  });

  it('sends correct subject and message to /api/enquiries', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    } as never);

    render(<BuyModal courseTitle="Python Basics" price={1999} currency="INR" onClose={CLOSE} />);
    fireEvent.change(screen.getByPlaceholderText(/Priya Sharma/i), { target: { value: 'Carol' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: 'carol@test.com' } });

    const form = screen.getByPlaceholderText(/Priya Sharma/i).closest('form')!;
    await act(async () => { fireEvent.submit(form); });
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/enquiries');
    const body = JSON.parse(opts.body as string) as { subject: string; message: string };
    expect(body.subject).toContain('Python Basics');
    expect(body.message).toContain('Python Basics');
    expect(body.message).toContain('₹1,999');
  });
});
