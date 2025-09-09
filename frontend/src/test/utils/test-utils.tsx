import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { User } from '../../types';

// Mock user for testing
export const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  subscriptionTier: 'FREE',
  isEmailVerified: true,
  createdAt: new Date().toISOString()
};

// Custom render function with providers
interface CustomRenderOptions extends RenderOptions {
  user?: User | null;
  route?: string;
}

const AllTheProviders: React.FC<{ 
  children: React.ReactNode;
  user?: User | null;
  route?: string;
}> = ({ children, user = null, route = '/' }) => {
  // Mock AuthContext value
  const mockAuthValue = {
    user,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    isAuthenticated: !!user
  };

  // Set initial route if provided
  if (route !== '/') {
    window.history.pushState({}, 'Test page', route);
  }

  return (
    <BrowserRouter>
      <AuthProvider value={mockAuthValue}>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { user, route, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders user={user} route={route}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Helper function to render with authenticated user
export const renderWithAuth = (ui: ReactElement, options: RenderOptions = {}) => {
  return customRender(ui, { user: mockUser, ...options });
};

// Helper function to render without authentication
export const renderWithoutAuth = (ui: ReactElement, options: RenderOptions = {}) => {
  return customRender(ui, { user: null, ...options });
};

// Mock video data for tests
export const mockVideo = {
  id: 'video-123',
  topic: 'How do airplanes fly?',
  tone: 'FUNNY' as const,
  status: 'COMPLETED' as const,
  videoUrl: 'https://example.com/video.mp4',
  audioUrl: 'https://example.com/audio.mp3',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  duration: 120,
  fileSize: 1024000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const mockVideoStats = {
  totalVideos: 10,
  completedVideos: 7,
  totalDuration: 840,
  recentActivity: 3,
  statusBreakdown: {
    COMPLETED: 7,
    PROCESSING: 2,
    PENDING: 1
  }
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };