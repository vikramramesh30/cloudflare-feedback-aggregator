/**
 * AI Sentiment Analyzer using Workers AI
 * Analyzes feedback sentiment and urgency using Llama 3
 */

export interface AnalysisResult {
	sentiment: 'positive' | 'negative' | 'neutral';
	urgency: number; // 1-5 scale
	confidence: number; // 0-1 scale
	reasoning?: string;
}

/**
 * Analyze feedback content for sentiment and urgency using Workers AI
 */
export async function analyzeFeedback(content: string, ai: Ai): Promise<AnalysisResult> {
	const prompt = `You are a sentiment analyzer for product feedback. Analyze the following feedback and respond ONLY with a JSON object (no markdown, no extra text) in this exact format:
{
  "sentiment": "positive|negative|neutral",
  "urgency": 1-5,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Urgency scale:
1 = Nice to have, feature request
2 = Minor issue or suggestion
3 = Moderate issue
4 = Important bug or blocker
5 = Critical/production issue, immediate action needed

Feedback to analyze: "${content}"

JSON response:`;

	try {
		const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
			prompt,
			max_tokens: 150,
		});

		// Parse AI response
		const result = (response as any).response;

		// Try to extract JSON from the response
		let jsonStr = result.trim();

		// Remove markdown code blocks if present
		jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');

		// Find JSON object in the response
		const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('No JSON found in AI response');
		}

		const analysis = JSON.parse(jsonMatch[0]);

		return {
			sentiment: normalizeSentiment(analysis.sentiment),
			urgency: Math.min(5, Math.max(1, parseInt(analysis.urgency) || 3)),
			confidence: parseFloat(analysis.confidence) || 0.7,
			reasoning: analysis.reasoning,
		};
	} catch (error: any) {
		console.error('AI analysis error:', error.message);
		// Fallback to rule-based analysis
		return fallbackAnalysis(content);
	}
}

/**
 * Normalize sentiment values from AI response
 */
function normalizeSentiment(sentiment: string): 'positive' | 'negative' | 'neutral' {
	const s = sentiment.toLowerCase();
	if (s.includes('positive')) return 'positive';
	if (s.includes('negative')) return 'negative';
	return 'neutral';
}

/**
 * Fallback rule-based sentiment analysis if AI fails
 */
function fallbackAnalysis(content: string): AnalysisResult {
	const lowerContent = content.toLowerCase();

	// Simple keyword-based sentiment
	const positiveWords = ['great', 'love', 'excellent', 'amazing', 'wonderful', 'fantastic', 'good', 'helpful', 'easy', 'smooth'];
	const negativeWords = ['bug', 'broken', 'crash', 'error', 'fail', 'slow', 'bad', 'terrible', 'worst', 'issue'];
	const urgentWords = ['urgent', 'critical', 'production', 'down', 'blocker', 'immediately'];

	const positiveCount = positiveWords.filter((word) => lowerContent.includes(word)).length;
	const negativeCount = negativeWords.filter((word) => lowerContent.includes(word)).length;
	const urgentCount = urgentWords.filter((word) => lowerContent.includes(word)).length;

	let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
	if (positiveCount > negativeCount) sentiment = 'positive';
	else if (negativeCount > positiveCount) sentiment = 'negative';

	let urgency = 3; // Default moderate
	if (urgentCount > 0) urgency = 5;
	else if (negativeCount > 2) urgency = 4;
	else if (negativeCount > 0) urgency = 3;
	else if (positiveCount > 0) urgency = 1;

	return {
		sentiment,
		urgency,
		confidence: 0.5, // Lower confidence for fallback
		reasoning: 'Fallback rule-based analysis',
	};
}

/**
 * Batch analyze multiple feedback entries
 */
export async function batchAnalyzeFeedback(
	feedbackList: Array<{ id: number; content: string }>,
	ai: Ai,
	onProgress?: (completed: number, total: number) => void
): Promise<Map<number, AnalysisResult>> {
	const results = new Map<number, AnalysisResult>();

	for (let i = 0; i < feedbackList.length; i++) {
		const feedback = feedbackList[i];
		const analysis = await analyzeFeedback(feedback.content, ai);
		results.set(feedback.id, analysis);

		if (onProgress) {
			onProgress(i + 1, feedbackList.length);
		}
	}

	return results;
}
