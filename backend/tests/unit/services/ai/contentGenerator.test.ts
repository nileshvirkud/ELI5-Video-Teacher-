import contentGenerator from '../../../../src/services/ai/contentGenerator';

// Mock OpenAI
jest.mock('openai');

describe('ContentGenerator Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateELI5Script', () => {
    const mockScript = {
      title: 'How Airplanes Fly - The Fun Way!',
      totalDuration: 180,
      scenes: [
        {
          id: 'scene_1',
          narration: 'Imagine you\'re a bird flying high in the sky...',
          visualDescription: 'A colorful cartoon airplane soaring through fluffy clouds',
          duration: 60,
          keywords: ['airplane', 'flying', 'wings']
        },
        {
          id: 'scene_2',
          narration: 'Just like how you can blow air to make a paper airplane fly...',
          visualDescription: 'Children playing with paper airplanes in a sunny park',
          duration: 60,
          keywords: ['air', 'lift', 'physics']
        },
        {
          id: 'scene_3',
          narration: 'And that\'s how real airplanes stay up in the sky!',
          visualDescription: 'A happy family looking out airplane window at clouds below',
          duration: 60,
          keywords: ['family', 'travel', 'sky']
        }
      ],
      tone: 'funny',
      educationalValue: 'Understanding basic principles of flight and aerodynamics'
    };

    it('should generate ELI5 script with funny tone', async () => {
      // Mock OpenAI response
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(mockScript)
                }
              }]
            })
          }
        }
      }));

      const script = await contentGenerator.generateELI5Script(
        'How do airplanes fly?',
        'funny'
      );

      expect(script).toBeDefined();
      expect(script.title).toBe(mockScript.title);
      expect(script.scenes).toHaveLength(3);
      expect(script.tone).toBe('funny');
      expect(script.totalDuration).toBe(180);
    });

    it('should generate script with custom tone', async () => {
      const customScript = { ...mockScript, tone: 'like a friendly robot' };
      
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(customScript)
                }
              }]
            })
          }
        }
      }));

      const script = await contentGenerator.generateELI5Script(
        'How do airplanes fly?',
        'custom',
        'like a friendly robot'
      );

      expect(script.tone).toBe('like a friendly robot');
    });

    it('should validate script structure', async () => {
      const invalidScript = {
        title: 'Test',
        totalDuration: 180,
        scenes: [], // Empty scenes should fail validation
        tone: 'funny',
        educationalValue: 'Test'
      };

      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(invalidScript)
                }
              }]
            })
          }
        }
      }));

      await expect(
        contentGenerator.generateELI5Script('Test topic', 'funny')
      ).rejects.toThrow('Script must have at least one scene');
    });

    it('should handle API errors gracefully', async () => {
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      }));

      await expect(
        contentGenerator.generateELI5Script('Test topic', 'funny')
      ).rejects.toThrow('Failed to generate script');
    });

    it('should reject overly long scripts', async () => {
      const longScript = {
        ...mockScript,
        totalDuration: 400 // Over 5 minutes
      };

      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(longScript)
                }
              }]
            })
          }
        }
      }));

      await expect(
        contentGenerator.generateELI5Script('Long topic', 'funny')
      ).rejects.toThrow('Script duration too long for target audience');
    });

    it('should validate scene durations', async () => {
      const invalidDurationScript = {
        ...mockScript,
        scenes: [{
          id: 'scene_1',
          narration: 'Test',
          visualDescription: 'Test',
          duration: 5, // Too short
          keywords: ['test']
        }]
      };

      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(invalidDurationScript)
                }
              }]
            })
          }
        }
      }));

      await expect(
        contentGenerator.generateELI5Script('Test topic', 'funny')
      ).rejects.toThrow('Scene 1 duration should be between 10-60 seconds');
    });
  });

  describe('improveScript', () => {
    const originalScript = {
      title: 'Test Title',
      totalDuration: 120,
      scenes: [{
        id: 'scene_1',
        narration: 'Original narration',
        visualDescription: 'Original description',
        duration: 60,
        keywords: ['test']
      }],
      tone: 'funny',
      educationalValue: 'Test value'
    };

    it('should improve script based on feedback', async () => {
      const improvedScript = {
        ...originalScript,
        narration: 'Improved narration with more details'
      };

      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(improvedScript)
                }
              }]
            })
          }
        }
      }));

      const result = await contentGenerator.improveScript(
        originalScript,
        'Add more details about the topic'
      );

      expect(result).toBeDefined();
      expect(result.narration).toBe('Improved narration with more details');
    });
  });
});