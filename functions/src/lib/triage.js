const { VertexAI } = require('@google-cloud/vertexai');
const { CONFIG } = require('./config');
const { DEFAULT_TRIAGE } = require('./constants');
const { sanitizeTriage } = require('./validators');

const TRIAGE_PROMPT = `
You are an emergency triage assistant for a hospitality crisis workflow.
Analyze the attached emergency audio and respond with JSON only.
Use this exact schema:
{
  "type": "cardiac|respiratory|fall|bleeding|stroke|allergic|unknown",
  "severity": "low|medium|high|critical",
  "summary": "one sentence under 180 characters"
}
`;

function extractJsonBlock(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch (error) {
    console.error('Gemini JSON parse failed:', error);
    return null;
  }
}

async function analyzeEmergencyAudio(audioUrl) {
  if (!audioUrl || !CONFIG.vertexProjectId) {
    return { ...DEFAULT_TRIAGE };
  }

  try {
    const vertex = new VertexAI({
      project: CONFIG.vertexProjectId,
      location: CONFIG.vertexLocation,
    });

    const model = vertex.preview.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: TRIAGE_PROMPT },
            {
              fileData: {
                mimeType: 'audio/aac',
                fileUri: audioUrl,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 256,
      },
    });

    const text = result?.response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('\n');

    const parsed = extractJsonBlock(text || '');
    return sanitizeTriage(parsed);
  } catch (error) {
    console.error('Gemini triage failed, using fallback:', error);
    return { ...DEFAULT_TRIAGE };
  }
}

module.exports = {
  analyzeEmergencyAudio,
};
