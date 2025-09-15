// RACI Recommendation API Endpoint
// Provides AI-powered RACI assignment recommendations for initiatives

import { NextRequest, NextResponse } from 'next/server';
import { aiRACIRecommendationService, RACIRecommendationRequest } from '@/core/ai/raci-recommendation.service';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json() as RACIRecommendationRequest;
    
    // Validate required fields
    if (!body.initiativeName || !body.description) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: initiativeName and description are required',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    console.log('RACI recommendation request:', {
      name: body.initiativeName,
      type: body.initiativeType,
      priority: body.priority
    });

    // Generate RACI recommendation using AI service
    const recommendation = await aiRACIRecommendationService.generateRACIRecommendation(body);

    // Log the recommendation for debugging
    console.log('Generated RACI recommendation:', {
      responsible: recommendation.responsible,
      accountable: recommendation.accountable,
      confidence: recommendation.confidence
    });

    return NextResponse.json({
      success: true,
      recommendation,
      metadata: {
        timestamp: new Date().toISOString(),
        model: 'gpt-3.5-turbo',
        version: '1.0'
      }
    });

  } catch (error) {
    console.error('RACI recommendation error:', error);
    
    // Return a fallback recommendation on error
    const fallbackRecommendation = {
      responsible: ['PRODUCT'],
      accountable: 'PRODUCT',
      consulted: ['STRATEGY'],
      informed: ['MARKETING', 'SALES'],
      reasoning: {
        responsible: 'Default product-led assignment',
        accountable: 'Product suite takes ownership by default',
        consulted: 'Strategy provides high-level guidance',
        informed: 'Marketing and Sales stay informed of product changes'
      },
      confidence: 50
    };

    return NextResponse.json({
      success: true,
      recommendation: fallbackRecommendation,
      fallback: true,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
      metadata: {
        timestamp: new Date().toISOString(),
        model: 'fallback',
        version: '1.0'
      }
    });
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  try {
    const isConfigured = await aiRACIRecommendationService.validateConfiguration();
    
    return NextResponse.json({
      status: 'healthy',
      aiConfigured: isConfigured,
      capabilities: [
        'RACI recommendations',
        'Initiative analysis',
        'Suite assignment logic',
        'Fallback recommendations'
      ],
      supportedSuites: [
        'PRODUCT',
        'MARKETING', 
        'DEVELOPMENT',
        'OPERATIONS',
        'STRATEGY',
        'SALES'
      ]
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Health check failed'
    }, { status: 500 });
  }
}