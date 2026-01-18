/**
 * Feedback Aggregator - Cloudflare Workers Application
 * Aggregates and analyzes product feedback from multiple sources
 */

import { analyzeFeedback, batchAnalyzeFeedback } from './ai/analyzer';

interface Feedback {
	id?: number;
	source: string;
	content: string;
	author?: string;
	created_at?: string;
	sentiment?: string;
	urgency?: number;
	themes?: string;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// CORS headers for all responses
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle OPTIONS requests for CORS
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// API Routes
			if (path === '/api/feedback' && request.method === 'GET') {
				return await listFeedback(env, url, corsHeaders);
			}

			if (path === '/api/feedback' && request.method === 'POST') {
				return await addFeedback(request, env, corsHeaders);
			}

			if (path === '/api/stats' && request.method === 'GET') {
				return await getStats(env, corsHeaders);
			}

			if (path === '/api/seed' && request.method === 'POST') {
				return await seedData(env, corsHeaders);
			}

			if (path === '/api/analyze' && request.method === 'POST') {
				return await analyzeEndpoint(request, env, corsHeaders);
			}

			if (path === '/api/analyze-all' && request.method === 'POST') {
				return await analyzeAllFeedback(env, corsHeaders);
			}

			// Health check
			if (path === '/api/health') {
				return new Response(JSON.stringify({ status: 'ok' }), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			// Fallback to static assets (index.html)
			return new Response('Not Found', { status: 404 });
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
} satisfies ExportedHandler<Env>;

/**
 * List feedback with optional filtering
 */
async function listFeedback(env: Env, url: URL, corsHeaders: Record<string, string>): Promise<Response> {
	const source = url.searchParams.get('source');
	const sentiment = url.searchParams.get('sentiment');
	const limit = parseInt(url.searchParams.get('limit') || '50');

	let query = 'SELECT * FROM feedback WHERE 1=1';
	const params: string[] = [];

	if (source) {
		query += ' AND source = ?';
		params.push(source);
	}

	if (sentiment) {
		query += ' AND sentiment = ?';
		params.push(sentiment);
	}

	query += ' ORDER BY created_at DESC LIMIT ?';
	params.push(limit.toString());

	const { results } = await env.DB.prepare(query).bind(...params).all();

	return new Response(JSON.stringify({ feedback: results, count: results.length }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

/**
 * Add new feedback entry
 */
async function addFeedback(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const feedback: Feedback = await request.json();

	if (!feedback.source || !feedback.content) {
		return new Response(JSON.stringify({ error: 'source and content are required' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	const result = await env.DB.prepare(
		'INSERT INTO feedback (source, content, author, sentiment, urgency, themes) VALUES (?, ?, ?, ?, ?, ?)'
	)
		.bind(
			feedback.source,
			feedback.content,
			feedback.author || null,
			feedback.sentiment || null,
			feedback.urgency || 3,
			feedback.themes || null
		)
		.run();

	return new Response(
		JSON.stringify({
			success: true,
			id: result.meta.last_row_id,
		}),
		{
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		}
	);
}

/**
 * Get aggregated statistics
 */
async function getStats(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	// Count by source
	const { results: bySource } = await env.DB.prepare(
		'SELECT source, COUNT(*) as count FROM feedback GROUP BY source'
	).all();

	// Count by sentiment
	const { results: bySentiment } = await env.DB.prepare(
		'SELECT sentiment, COUNT(*) as count FROM feedback WHERE sentiment IS NOT NULL GROUP BY sentiment'
	).all();

	// Average urgency
	const { results: urgencyResults } = await env.DB.prepare(
		'SELECT AVG(urgency) as avg_urgency, MIN(urgency) as min_urgency, MAX(urgency) as max_urgency FROM feedback WHERE urgency IS NOT NULL'
	).all();

	// Total count
	const { results: totalResults } = await env.DB.prepare('SELECT COUNT(*) as total FROM feedback').all();

	return new Response(
		JSON.stringify({
			total: (totalResults[0] as any)?.total || 0,
			by_source: bySource,
			by_sentiment: bySentiment,
			urgency: urgencyResults[0] || {},
		}),
		{
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		}
	);
}

/**
 * Seed database with mock feedback data
 */
async function seedData(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const mockFeedback: Feedback[] = [
		// Discord feedback
		{
			source: 'discord',
			content: 'Would love to see dark mode in the dashboard!',
			author: 'user#1234',
			sentiment: 'positive',
			urgency: 2,
		},
		{
			source: 'discord',
			content: 'The new D1 database is incredibly fast. Great work team!',
			author: 'developer#5678',
			sentiment: 'positive',
			urgency: 1,
		},
		{
			source: 'discord',
			content: 'Getting timeout errors when deploying Workers. Anyone else seeing this?',
			author: 'frustrated_dev#9999',
			sentiment: 'negative',
			urgency: 4,
		},
		// GitHub issues
		{
			source: 'github',
			content: 'Worker crashes when payload exceeds 1MB. Steps to reproduce: 1) Send large request 2) Check logs',
			author: 'developer42',
			sentiment: 'negative',
			urgency: 5,
		},
		{
			source: 'github',
			content: 'Feature request: Add TypeScript autocomplete for D1 query results',
			author: 'typescript_lover',
			sentiment: 'neutral',
			urgency: 2,
		},
		{
			source: 'github',
			content: 'Documentation for Workers AI is excellent. Found what I needed quickly.',
			author: 'happy_builder',
			sentiment: 'positive',
			urgency: 1,
		},
		// Support tickets
		{
			source: 'support',
			content: 'URGENT: Our production site is down after deploying worker! Need immediate help.',
			author: 'enterprise_customer',
			sentiment: 'negative',
			urgency: 5,
		},
		{
			source: 'support',
			content: 'Question about billing: How are Workers AI requests charged?',
			author: 'finance_team',
			sentiment: 'neutral',
			urgency: 3,
		},
		{
			source: 'support',
			content: 'Your support team was incredibly helpful in debugging our D1 migration issue.',
			author: 'grateful_customer',
			sentiment: 'positive',
			urgency: 1,
		},
		// Twitter/X feedback
		{
			source: 'twitter',
			content: '@Cloudflare Workers AI is incredible! Built sentiment analysis in 10 mins. Mind blown 🤯',
			author: '@happy_dev',
			sentiment: 'positive',
			urgency: 1,
		},
		{
			source: 'twitter',
			content: 'Why is the Cloudflare dashboard so slow today? Taking forever to load.',
			author: '@impatient_user',
			sentiment: 'negative',
			urgency: 3,
		},
		{
			source: 'twitter',
			content: 'Just deployed my first Worker. The DX is really smooth!',
			author: '@first_timer',
			sentiment: 'positive',
			urgency: 1,
		},
		// More diverse feedback
		{
			source: 'discord',
			content: 'The D1 console UI could use some improvements. Hard to navigate large tables.',
			author: 'ux_focused#4444',
			sentiment: 'neutral',
			urgency: 2,
		},
		{
			source: 'github',
			content: 'Bug: Wrangler tail not showing real-time logs as expected',
			author: 'debugger_dan',
			sentiment: 'negative',
			urgency: 4,
		},
		{
			source: 'support',
			content: 'Loving the new AI bindings! Makes integrating ML so easy.',
			author: 'ml_enthusiast',
			sentiment: 'positive',
			urgency: 1,
		},
	];

	// Insert all mock feedback
	for (const feedback of mockFeedback) {
		await env.DB.prepare(
			'INSERT INTO feedback (source, content, author, sentiment, urgency) VALUES (?, ?, ?, ?, ?)'
		)
			.bind(feedback.source, feedback.content, feedback.author, feedback.sentiment, feedback.urgency)
			.run();
	}

	return new Response(
		JSON.stringify({
			success: true,
			count: mockFeedback.length,
			message: `Seeded ${mockFeedback.length} feedback entries`,
		}),
		{
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		}
	);
}

/**
 * Analyze a single feedback entry using AI
 */
async function analyzeEndpoint(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const body: { content?: string; id?: number } = await request.json();

	if (!body.content && !body.id) {
		return new Response(JSON.stringify({ error: 'content or id is required' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	let content = body.content;

	// If ID is provided, fetch the feedback content
	if (body.id && !content) {
		const { results } = await env.DB.prepare('SELECT content FROM feedback WHERE id = ?').bind(body.id).all();
		if (results.length === 0) {
			return new Response(JSON.stringify({ error: 'Feedback not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		content = (results[0] as any).content;
	}

	// Analyze with AI
	const analysis = await analyzeFeedback(content!, env.AI);

	// If ID provided, update the database
	if (body.id) {
		await env.DB.prepare('UPDATE feedback SET sentiment = ?, urgency = ? WHERE id = ?')
			.bind(analysis.sentiment, analysis.urgency, body.id)
			.run();
	}

	return new Response(JSON.stringify({ success: true, analysis }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

/**
 * Analyze all feedback entries that don't have sentiment yet
 */
async function analyzeAllFeedback(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	// Get all feedback without sentiment
	const { results } = await env.DB.prepare('SELECT id, content FROM feedback WHERE sentiment IS NULL LIMIT 50').all();

	if (results.length === 0) {
		return new Response(
			JSON.stringify({
				success: true,
				message: 'No feedback to analyze',
				count: 0,
			}),
			{
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}

	// Batch analyze
	const feedbackList = results.map((r: any) => ({ id: r.id, content: r.content }));
	const analysisResults = await batchAnalyzeFeedback(feedbackList, env.AI);

	// Update database with results
	for (const [id, analysis] of analysisResults.entries()) {
		await env.DB.prepare('UPDATE feedback SET sentiment = ?, urgency = ? WHERE id = ?')
			.bind(analysis.sentiment, analysis.urgency, id)
			.run();
	}

	return new Response(
		JSON.stringify({
			success: true,
			count: analysisResults.size,
			message: `Analyzed ${analysisResults.size} feedback entries`,
		}),
		{
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		}
	);
}
