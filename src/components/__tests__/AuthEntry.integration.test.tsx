import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import TypeMorphMainApp from '@/app/page';

const session = vi.hoisted(() => ({ user: null as null | { id: string } }));
vi.mock('@/hooks/useUser', () => ({ useUser: () => session }));
vi.mock('@/lib/supabase', () => ({ supabase: null }));
vi.mock('@/lib/analytics', () => ({ trackWorkbenchOpen: vi.fn(), trackProClick: vi.fn() }));
vi.mock('@/components/LandingView', () => ({ LandingView: () => <div>Landing</div> }));
vi.mock('@/components/Sidebar', () => ({ Sidebar: () => null }));
vi.mock('@/components/FeedbackModal', () => ({ FeedbackModal: () => null }));
vi.mock('next/dynamic', () => ({ default: () => () => <div>Workbench</div> }));

afterEach(() => {
  cleanup();
  session.user = null;
});

describe('Sign-in entry', () => {
  test.each(['landing', 'app'])('opens the real login dialog from %s and allows continuing locally', async (defaultView) => {
    render(<TypeMorphMainApp defaultView={defaultView} />);
    expect(screen.queryByText('Welcome Back')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Welcome Back')).toBeTruthy();
    expect(screen.getByText(/Signing in automatically saves your workbench input/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue without signing in' }));
    await waitFor(() => expect(screen.queryByText('Welcome Back')).toBeNull());
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  test('does not offer sign-in to an authenticated user', () => {
    session.user = { id: 'test-user' };
    render(<TypeMorphMainApp />);
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });
});
