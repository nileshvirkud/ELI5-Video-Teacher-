import OpenAI from 'openai';
import logger from '../../config/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ScriptScene {
  id: string;
  narration: string;
  visualDescription: string;
  duration: number; // in seconds
  keywords: string[];
}

export interface ELI5Script {
  title: string;
  totalDuration: number;
  scenes: ScriptScene[];
  tone: string;
  educationalValue: string;
}

class ContentGenerator {
  async generateELI5Script(topic: string, tone: string, customTone?: string): Promise<ELI5Script> {
    try {
      const toneInstruction = this.getToneInstruction(tone, customTone);
      
      const prompt = `Create an "Explain Like I'm 5" educational script about "${topic}". 

${toneInstruction}

Requirements:
- Make it simple and engaging for 5-year-olds
- Use analogies and comparisons they can understand
- Include 3-5 distinct scenes/segments
- Each scene should be 15-30 seconds long
- Provide visual descriptions for each scene that are child-appropriate
- Avoid scary, violent, or inappropriate content
- Make it educational but fun
- Total video should be 2-4 minutes long

Return your response as a JSON object with this structure:
{
  "title": "Kid-friendly title",
  "totalDuration": 180,
  "scenes": [
    {
      "id": "scene_1",
      "narration": "What the narrator will say",
      "visualDescription": "Description of what should be shown visually",
      "duration": 30,
      "keywords": ["keyword1", "keyword2"]
    }
  ],
  "tone": "${tone}",
  "educationalValue": "What the child will learn"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert children's educator who creates engaging, age-appropriate educational content. Always ensure content is safe, educational, and fun for 5-year-olds."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated from OpenAI');
      }

      // Parse the JSON response
      const script = JSON.parse(content) as ELI5Script;
      
      // Validate and sanitize the script
      this.validateAndSanitizeScript(script);
      
      logger.info(`Generated ELI5 script for topic: ${topic}`);
      return script;
      
    } catch (error) {
      logger.error('Error generating ELI5 script:', error);
      throw new Error(`Failed to generate script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getToneInstruction(tone: string, customTone?: string): string {
    switch (tone.toLowerCase()) {
      case 'funny':
        return 'Make it funny and entertaining with jokes, silly comparisons, and playful language that will make kids laugh while learning.';
      case 'serious':
        return 'Keep it educational and straightforward, but still engaging for children. Use clear explanations and interesting facts.';
      case 'poetic':
        return 'Use rhymes, rhythm, and poetic language to make the explanation musical and memorable for children.';
      case 'custom':
        return customTone ? `Follow this tone: ${customTone}` : 'Use an engaging and child-friendly tone.';
      default:
        return 'Use an engaging and child-friendly tone that makes learning fun.';
    }
  }

  private validateAndSanitizeScript(script: ELI5Script): void {
    // Content safety checks
    const inappropriateWords = ['scary', 'dangerous', 'death', 'kill', 'hurt', 'violence', 'weapon'];
    const scriptText = JSON.stringify(script).toLowerCase();
    
    for (const word of inappropriateWords) {
      if (scriptText.includes(word)) {
        logger.warn(`Potentially inappropriate content detected: ${word}`);
        // In a production environment, you might want to regenerate or filter the content
      }
    }

    // Validate structure
    if (!script.scenes || script.scenes.length === 0) {
      throw new Error('Script must have at least one scene');
    }

    if (script.totalDuration > 300) { // Max 5 minutes
      throw new Error('Script duration too long for target audience');
    }

    // Ensure each scene has required fields
    script.scenes.forEach((scene, index) => {
      if (!scene.narration || !scene.visualDescription) {
        throw new Error(`Scene ${index + 1} missing required fields`);
      }
      if (scene.duration < 10 || scene.duration > 60) {
        throw new Error(`Scene ${index + 1} duration should be between 10-60 seconds`);
      }
    });
  }

  async improveScript(originalScript: ELI5Script, feedback: string): Promise<ELI5Script> {
    try {
      const prompt = `Improve this ELI5 educational script based on the feedback provided.

Original Script:
${JSON.stringify(originalScript, null, 2)}

Feedback:
${feedback}

Please maintain the same JSON structure while incorporating the improvements. Keep it appropriate for 5-year-olds.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system", 
            content: "You are an expert children's educator improving educational content based on feedback."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No improved content generated');
      }

      const improvedScript = JSON.parse(content) as ELI5Script;
      this.validateAndSanitizeScript(improvedScript);
      
      return improvedScript;
    } catch (error) {
      logger.error('Error improving script:', error);
      throw error;
    }
  }
}

export default new ContentGenerator();