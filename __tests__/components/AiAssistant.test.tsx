'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiAssistant from '@/components/shared/AiAssistant';

// Mock lucide-react icons to avoid SVG rendering complexity
jest.mock('lucide-react', () => ({
  Sparkles: () => <span data-testid="sparkles-icon" />,
  X: () => <span data-testid="x-icon" />,
  Send: () => <span data-testid="send-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  Bot: () => <span data-testid="bot-icon" />,
  Copy: () => <span data-testid="copy-icon" />,
  Check: () => <span data-testid="check-icon" />,
}));

// Mock react-markdown to avoid rendering issues
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
jest.mock('remark-gfm', () => ({ __esModule: true, default: jest.fn() }));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
});

function createFakeSSEStream(chunks: string[]) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(enc.encode(chunk));
      }
      controller.close();
    },
  });
  return stream;
}

describe('AiAssistant', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders the floating toggle button', () => {
    render(<AiAssistant courseId="course123" />);
    expect(screen.getByTitle('AI Course Assistant')).toBeInTheDocument();
  });

  it('panel is hidden initially', () => {
    render(<AiAssistant courseId="course123" />);
    expect(screen.queryByText('AI Course Assistant')).not.toBeInTheDocument();
  });

  it('opens panel on button click', async () => {
    render(<AiAssistant courseId="course123" />);
    const button = screen.getByTitle('AI Course Assistant');
    await act(async () => { fireEvent.click(button); });
    expect(screen.getByText('AI Course Assistant')).toBeInTheDocument();
  });

  it('closes panel on X button click', async () => {
    render(<AiAssistant courseId="course123" />);
    await act(async () => { fireEvent.click(screen.getByTitle('AI Course Assistant')); });
    expect(screen.getByText('AI Course Assistant')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close');
    await act(async () => { fireEvent.click(closeBtn); });
    expect(screen.queryByText('AI Course Assistant')).not.toBeInTheDocument();
  });

  it('reopens panel after closing (tests the open toggle bug)', async () => {
    render(<AiAssistant courseId="course123" />);
    const toggleBtn = screen.getByTitle('AI Course Assistant');

    // Open
    await act(async () => { fireEvent.click(toggleBtn); });
    expect(screen.getByText('AI Course Assistant')).toBeInTheDocument();

    // Close via X
    const closeBtn = screen.getByLabelText('Close');
    await act(async () => { fireEvent.click(closeBtn); });
    expect(screen.queryByText('AI Course Assistant')).not.toBeInTheDocument();

    // Reopen — this tests the toggle bug
    await act(async () => { fireEvent.click(toggleBtn); });
    expect(screen.getByText('AI Course Assistant')).toBeInTheDocument();
  });

  it('does not call API on empty input submit', async () => {
    render(<AiAssistant courseId="course123" />);
    await act(async () => { fireEvent.click(screen.getByTitle('AI Course Assistant')); });

    const sendBtn = screen.getByTitle('AI Course Assistant').parentElement
      ? screen.getAllByRole('button').find(b => b.getAttribute('disabled') !== null)
      : null;

    // Try pressing Enter with empty input
    const input = screen.getByPlaceholderText(/ask a course question/i);
    await act(async () => { fireEvent.keyDown(input, { key: 'Enter' }); });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows loading state while streaming', async () => {
    // fetch() itself never resolves — streaming=true is set synchronously before
    // the first await inside send(), so the loader will appear even if fetch hangs.
    // This avoids any reader.read() pending promise that could stall act().
    mockFetch.mockReturnValueOnce(new Promise<never>(() => { /* never resolves */ }));

    render(<AiAssistant courseId="course123" />);
    fireEvent.click(screen.getByTitle('AI Course Assistant'));

    const input = screen.getByPlaceholderText(/ask a course question/i);
    fireEvent.change(input, { target: { value: 'What is React?' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // setStreaming(true) runs synchronously before `await fetch(...)` in send()
    // Two Loader2 icons appear (send button + thinking state), so use queryAll
    await waitFor(() => {
      expect(screen.queryAllByTestId('loader-icon').length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('displays rate limit count in header', async () => {
    render(<AiAssistant courseId="course123" />);
    await act(async () => { fireEvent.click(screen.getByTitle('AI Course Assistant')); });
    expect(screen.getByText(/15\/15 left/i)).toBeInTheDocument();
  });

  it('shows video mode label when videoId provided', async () => {
    render(<AiAssistant courseId="course123" videoId="vid456" />);
    await act(async () => { fireEvent.click(screen.getByTitle('AI Course Assistant')); });
    expect(screen.getByText(/video mode/i)).toBeInTheDocument();
  });

  it('copy button appears on AI messages after streaming completes', async () => {
    // Use Buffer (Node global) to encode — TextEncoder not available in jsdom
    const sseData = Buffer.from('data: "Hello"\n\ndata: " World"\n\ndata: [DONE]\n\n');
    let idx = 0;
    const chunks = [sseData];
    const fakeReader = {
      read: jest.fn().mockImplementation(() => {
        if (idx < chunks.length) {
          return Promise.resolve({ done: false, value: chunks[idx++] });
        }
        return Promise.resolve({ done: true, value: new Uint8Array() });
      }),
      cancel: jest.fn(),
      releaseLock: jest.fn(),
    };
    const fakeBody = { getReader: jest.fn().mockReturnValue(fakeReader) };
    mockFetch.mockResolvedValueOnce({ ok: true, body: fakeBody } as never);

    render(<AiAssistant courseId="course123" />);
    fireEvent.click(screen.getByTitle('AI Course Assistant'));

    const input = screen.getByPlaceholderText(/ask a course question/i);
    fireEvent.change(input, { target: { value: 'Test question' } });

    act(() => { fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }); });

    await waitFor(() => {
      expect(screen.getByTitle('Copy response')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
