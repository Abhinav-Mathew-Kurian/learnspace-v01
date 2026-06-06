'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeNavbar from '@/components/home/HomeNavbar';

// Mock lucide-react icons to plain spans
jest.mock('lucide-react', () => ({
  BookOpen: () => <span data-testid="book-icon" />,
  Menu: () => <span data-testid="menu-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('HomeNavbar', () => {
  it('renders the LearnSpace brand name', () => {
    render(<HomeNavbar />);
    expect(screen.getByText('LearnSpace')).toBeInTheDocument();
  });

  it('renders Sign In link pointing to /login', () => {
    render(<HomeNavbar />);
    const signIns = screen.getAllByText('Sign In');
    // May appear in both desktop and mobile drawer
    expect(signIns.length).toBeGreaterThan(0);
    expect(signIns[0].closest('a')).toHaveAttribute('href', '/login');
  });

  it('renders Browse Courses nav link', () => {
    render(<HomeNavbar />);
    const links = screen.getAllByText('Browse Courses');
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders Free Webinars anchor', () => {
    render(<HomeNavbar />);
    const webinarLinks = screen.getAllByText('Free Webinars');
    expect(webinarLinks.length).toBeGreaterThan(0);
  });

  it('renders About link', () => {
    render(<HomeNavbar />);
    const aboutLinks = screen.getAllByText('About');
    expect(aboutLinks.length).toBeGreaterThan(0);
  });

  it('renders hamburger button with aria-label="Menu"', () => {
    render(<HomeNavbar />);
    expect(screen.getByLabelText('Menu')).toBeInTheDocument();
  });

  it('mobile drawer is hidden by default (menu-icon visible, x-icon not)', () => {
    render(<HomeNavbar />);
    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
  });

  it('clicking hamburger shows mobile drawer and switches to X icon', () => {
    render(<HomeNavbar />);
    const hamburger = screen.getByLabelText('Menu');
    fireEvent.click(hamburger);
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('menu-icon')).not.toBeInTheDocument();
  });

  it('clicking hamburger twice closes the drawer', () => {
    render(<HomeNavbar />);
    const hamburger = screen.getByLabelText('Menu');
    fireEvent.click(hamburger); // open
    fireEvent.click(hamburger); // close
    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
  });
});
