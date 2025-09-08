import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { VideoGenerationRequest } from '../types';

interface TopicFormProps {
  onSubmit: (data: VideoGenerationRequest) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

interface FormData {
  topic: string;
  tone: 'FUNNY' | 'SERIOUS' | 'POETIC' | 'CUSTOM';
  customTone?: string;
}

const TopicForm: React.FC<TopicFormProps> = ({ onSubmit, loading = false, disabled = false }) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid }
  } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      tone: 'FUNNY'
    }
  });

  const selectedTone = watch('tone');
  const topicValue = watch('topic') || '';

  const onFormSubmit = async (data: FormData) => {
    try {
      await onSubmit({
        topic: data.topic.trim(),
        tone: data.tone,
        customTone: data.tone === 'CUSTOM' ? data.customTone?.trim() : undefined
      });
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const toneOptions = [
    { value: 'FUNNY', label: 'Funny & Entertaining', description: 'Make it fun with jokes and silly comparisons!' },
    { value: 'SERIOUS', label: 'Educational & Clear', description: 'Straightforward explanations with interesting facts' },
    { value: 'POETIC', label: 'Musical & Rhythmic', description: 'Use rhymes and rhythm to make it memorable' },
    { value: 'CUSTOM', label: 'Custom Tone', description: 'Describe your own unique style' }
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          What would you like to learn about? 🎓
        </h2>
        <p className="text-gray-600">
          Tell me any topic and I'll create a fun, easy-to-understand video just for you!
        </p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Topic Input */}
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
            What topic would you like me to explain?
          </label>
          <textarea
            {...register('topic', {
              required: 'Please enter a topic to learn about',
              minLength: { value: 5, message: 'Topic should be at least 5 characters long' },
              maxLength: { value: 500, message: 'Topic should be less than 500 characters' },
              pattern: {
                value: /^[a-zA-Z0-9\s.,!?'-]+$/,
                message: 'Topic can only contain letters, numbers, and basic punctuation'
              }
            })}
            className={`w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.topic ? 'border-red-300' : 'border-gray-300'
            }`}
            rows={3}
            placeholder="e.g., How do airplanes fly? Why is the sky blue? What are dinosaurs?"
            disabled={loading || disabled}
          />
          <div className="flex justify-between items-center mt-1">
            <div>
              {errors.topic && (
                <p className="text-red-500 text-sm">{errors.topic.message}</p>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {topicValue.length}/500
            </p>
          </div>
        </div>

        {/* Tone Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How would you like me to explain it?
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {toneOptions.map((option) => (
              <label
                key={option.value}
                className={`relative p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                  selectedTone === option.value
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-300'
                }`}
              >
                <input
                  {...register('tone', { required: true })}
                  type="radio"
                  value={option.value}
                  className="sr-only"
                  disabled={loading || disabled}
                />
                <div>
                  <div className="font-medium text-gray-900 mb-1">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    {option.description}
                  </div>
                </div>
                {selectedTone === option.value && (
                  <div className="absolute top-2 right-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                        <path d="m6.564.75-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                      </svg>
                    </div>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Custom Tone Input */}
        {selectedTone === 'CUSTOM' && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <label htmlFor="customTone" className="block text-sm font-medium text-gray-700 mb-2">
              Describe your preferred style
            </label>
            <textarea
              {...register('customTone', {
                required: selectedTone === 'CUSTOM' ? 'Please describe your preferred tone' : false,
                maxLength: { value: 200, message: 'Custom tone should be less than 200 characters' }
              })}
              className={`w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.customTone ? 'border-red-300' : 'border-gray-300'
              }`}
              rows={3}
              placeholder="e.g., Like a friendly robot, like a pirate, with lots of examples, etc."
              disabled={loading || disabled}
            />
            {errors.customTone && (
              <p className="text-red-500 text-sm mt-1">{errors.customTone.message}</p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={!isValid || loading || disabled}
            className={`w-full py-4 px-6 rounded-lg font-medium text-white transition-all ${
              !isValid || loading || disabled
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-[1.02] shadow-lg'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating your video...
              </div>
            ) : (
              <>
                🎬 Create My Learning Video
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 text-center text-xs text-gray-500">
        🌟 Free users can create 3 videos per hour • Premium users get 10 per hour
      </div>
    </div>
  );
};

export default TopicForm;