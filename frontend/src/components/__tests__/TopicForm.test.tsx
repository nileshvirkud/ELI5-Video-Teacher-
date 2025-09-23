import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils/test-utils';
import TopicForm from '../TopicForm';
import { VideoGenerationRequest } from '../../types';

describe('TopicForm Component', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders the form correctly', () => {
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('What would you like to learn about? 🎓')).toBeInTheDocument();
    expect(screen.getByLabelText(/what topic would you like me to explain/i)).toBeInTheDocument();
    expect(screen.getByText('How would you like me to explain it?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create my learning video/i })).toBeInTheDocument();
  });

  it('shows all tone options', () => {
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('Funny & Entertaining')).toBeInTheDocument();
    expect(screen.getByText('Educational & Clear')).toBeInTheDocument();
    expect(screen.getByText('Musical & Rhythmic')).toBeInTheDocument();
    expect(screen.getByText('Custom Tone')).toBeInTheDocument();
  });

  it('validates topic input', async () => {
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    const topicInput = screen.getByLabelText(/what topic would you like me to explain/i);
    const submitButton = screen.getByRole('button', { name: /create my learning video/i });

    // Test minimum length validation
    fireEvent.change(topicInput, { target: { value: 'Hi' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/topic should be at least 5 characters long/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates topic maximum length', async () => {
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    const topicInput = screen.getByLabelText(/what topic would you like me to explain/i);
    const longTopic = 'a'.repeat(501); // Over 500 characters

    fireEvent.change(topicInput, { target: { value: longTopic } });

    await waitFor(() => {
      expect(screen.getByText(/topic should be less than 500 characters/i)).toBeInTheDocument();
    });
  });

  it('shows character count', () => {
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    const topicInput = screen.getByLabelText(/what topic would you like me to explain/i);
    
    fireEvent.change(topicInput, { target: { value: 'How do airplanes fly?' } });
    
    expect(screen.getByText('21/500')).toBeInTheDocument();
  });

  it('validates custom tone when selected', async () => {
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    const topicInput = screen.getByLabelText(/what topic would you like me to explain/i);
    const customToneRadio = screen.getByDisplayValue('CUSTOM');
    const submitButton = screen.getByRole('button', { name: /create my learning video/i });

    fireEvent.change(topicInput, { target: { value: 'How do plants grow?' } });
    fireEvent.click(customToneRadio);

    await waitFor(() => {
      expect(screen.getByLabelText(/describe your preferred style/i)).toBeInTheDocument();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please describe your preferred tone/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    const topicInput = screen.getByLabelText(/what topic would you like me to explain/i);
    const funnyToneRadio = screen.getByDisplayValue('FUNNY');
    const submitButton = screen.getByRole('button', { name: /create my learning video/i });

    fireEvent.change(topicInput, { target: { value: 'How do airplanes fly?' } });
    fireEvent.click(funnyToneRadio);
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        topic: 'How do airplanes fly?',
        tone: 'FUNNY',
        customTone: undefined
      });
    });
  });

  it('submits form with custom tone', async () => {
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    const topicInput = screen.getByLabelText(/what topic would you like me to explain/i);
    const customToneRadio = screen.getByDisplayValue('CUSTOM');
    const submitButton = screen.getByRole('button', { name: /create my learning video/i });

    fireEvent.change(topicInput, { target: { value: 'How do plants grow?' } });
    fireEvent.click(customToneRadio);

    await waitFor(() => {
      const customToneInput = screen.getByLabelText(/describe your preferred style/i);
      expect(customToneInput).toBeInTheDocument();
      
      fireEvent.change(customToneInput, { target: { value: 'Like a friendly robot' } });
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        topic: 'How do plants grow?',
        tone: 'CUSTOM',
        customTone: 'Like a friendly robot'
      });
    });
  });

  it('disables form when loading', () => {
    render(<TopicForm onSubmit={mockOnSubmit} loading={true} />);
    
    const topicInput = screen.getByLabelText(/what topic would you like me to explain/i);
    const submitButton = screen.getByRole('button', { name: /creating your video/i });

    expect(topicInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Creating your video...')).toBeInTheDocument();
  });

  it('resets form after successful submission', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    const topicInput = screen.getByLabelText(/what topic would you like me to explain/i);
    const submitButton = screen.getByRole('button', { name: /create my learning video/i });

    fireEvent.change(topicInput, { target: { value: 'How do computers work?' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Form should reset after successful submission
    await waitFor(() => {
      expect(topicInput).toHaveValue('');
    });
  });

  it('shows subscription tier information', () => {
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText(/free users can create 3 videos per hour/i)).toBeInTheDocument();
    expect(screen.getByText(/premium users get 10 per hour/i)).toBeInTheDocument();
  });

  it('validates against special characters in topic', async () => {
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    const topicInput = screen.getByLabelText(/what topic would you like me to explain/i);
    
    fireEvent.change(topicInput, { target: { value: 'How do <script>alert("test")</script> work?' } });

    await waitFor(() => {
      expect(screen.getByText(/topic can only contain letters, numbers, and basic punctuation/i)).toBeInTheDocument();
    });
  });

  it('handles form submission errors', async () => {
    const mockError = new Error('Network error');
    mockOnSubmit.mockRejectedValue(mockError);
    
    render(<TopicForm onSubmit={mockOnSubmit} />);
    
    const topicInput = screen.getByLabelText(/what topic would you like me to explain/i);
    const submitButton = screen.getByRole('button', { name: /create my learning video/i });

    fireEvent.change(topicInput, { target: { value: 'How do airplanes fly?' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Form should handle error gracefully (not crash)
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});