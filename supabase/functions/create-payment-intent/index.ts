/**
 * Stripe Payment Intent Creation Edge Function
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Implements secure server-side payment intent creation with user validation,
 * calculation verification, and comprehensive error handling.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@12.9.0'

// Initialize Stripe with secret key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

// Initialize Supabase client for database operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Request validation schema
interface CreatePaymentIntentRequest {
  amount: number; // Amount in cents
  currency: string;
  userId: string;
  orderId?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
  setupFutureUsage?: 'on_session' | 'off_session';
}

// Enhanced error handling following established patterns
const createPaymentError = (
  code: string,
  message: string,
  userMessage: string,
  statusCode: number = 400
) => ({
  error: {
    code,
    message,
    userMessage,
    timestamp: new Date().toISOString(),
  },
  statusCode,
})

// Input validation following established patterns
const validateRequest = (body: any): CreatePaymentIntentRequest => {
  const { amount, currency, userId, orderId, metadata, paymentMethodTypes, setupFutureUsage } = body

  // Required field validation
  if (!amount || typeof amount !== 'number' || amount < 50) {
    throw createPaymentError(
      'INVALID_AMOUNT',
      'Amount must be a number and at least 50 cents',
      'Invalid payment amount. Minimum amount is $0.50'
    )
  }

  if (!currency || typeof currency !== 'string') {
    throw createPaymentError(
      'INVALID_CURRENCY',
      'Currency must be a valid string',
      'Invalid currency specified'
    )
  }

  if (!userId || typeof userId !== 'string') {
    throw createPaymentError(
      'INVALID_USER',
      'User ID must be provided',
      'Authentication required'
    )
  }

  // Amount limit validation (prevent excessive charges)
  if (amount > 100000) { // $1000 limit
    throw createPaymentError(
      'AMOUNT_TOO_LARGE',
      'Amount exceeds maximum allowed',
      'Payment amount exceeds maximum limit'
    )
  }

  return {
    amount,
    currency: currency.toLowerCase(),
    userId,
    orderId,
    metadata: metadata || {},
    paymentMethodTypes: paymentMethodTypes || ['card'],
    setupFutureUsage,
  }
}

// User authentication and authorization following established patterns
const validateUser = async (userId: string) => {
  try {
    // Verify user exists and is active
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      throw createPaymentError(
        'USER_NOT_FOUND',
        'User not found in database',
        'Authentication failed',
        401
      )
    }

    return userData
  } catch (error) {
    console.error('User validation failed:', error)
    throw createPaymentError(
      'AUTHENTICATION_FAILED',
      'User authentication failed',
      'Please sign in and try again',
      401
    )
  }
}

// Order validation (if orderId is provided)
const validateOrder = async (orderId: string, userId: string) => {
  try {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, total_amount, payment_status')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single()

    if (orderError || !orderData) {
      throw createPaymentError(
        'ORDER_NOT_FOUND',
        'Order not found or unauthorized',
        'Order not found'
      )
    }

    if (orderData.payment_status === 'paid') {
      throw createPaymentError(
        'ORDER_ALREADY_PAID',
        'Order has already been paid',
        'This order has already been paid'
      )
    }

    return orderData
  } catch (error) {
    console.error('Order validation failed:', error)
    throw error
  }
}

// Main request handler
serve(async (req) => {
  // CORS headers for development
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify(createPaymentError(
        'METHOD_NOT_ALLOWED',
        'Only POST requests are allowed',
        'Invalid request method'
      )),
      { 
        status: 405, 
        headers: corsHeaders 
      }
    )
  }

  try {
    // Parse and validate request body
    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      throw createPaymentError(
        'INVALID_JSON',
        'Request body must be valid JSON',
        'Invalid request format'
      )
    }

    console.log('🎯 Creating payment intent:', { 
      amount: requestBody.amount, 
      userId: requestBody.userId?.substring(0, 8) + '...',
      orderId: requestBody.orderId 
    })

    // Step 1: Validate request data
    const validatedRequest = validateRequest(requestBody)

    // Step 2: Validate user authentication
    const user = await validateUser(validatedRequest.userId)

    // Step 3: Validate order if provided
    let orderData = null
    if (validatedRequest.orderId) {
      orderData = await validateOrder(validatedRequest.orderId, validatedRequest.userId)
      
      // Verify amount matches order total (with small tolerance for rounding)
      const tolerance = 5 // 5 cents tolerance
      const difference = Math.abs(validatedRequest.amount - (orderData.total_amount * 100))
      
      if (difference > tolerance) {
        console.warn(`⚠️ Payment amount mismatch: requested ${validatedRequest.amount}, order total ${orderData.total_amount * 100}`)
        
        // Auto-correct to order amount for security
        validatedRequest.amount = Math.round(orderData.total_amount * 100)
        validatedRequest.metadata.corrected_amount = 'true'
        validatedRequest.metadata.original_amount = requestBody.amount.toString()
      }
    }

    // Step 4: Create Stripe payment intent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: validatedRequest.amount,
      currency: validatedRequest.currency,
      payment_method_types: validatedRequest.paymentMethodTypes,
      metadata: {
        userId: validatedRequest.userId,
        orderId: validatedRequest.orderId || '',
        environment: Deno.env.get('ENVIRONMENT') || 'development',
        ...validatedRequest.metadata,
      },
      setup_future_usage: validatedRequest.setupFutureUsage,
    }

    console.log('💳 Creating Stripe payment intent with params:', {
      amount: paymentIntentParams.amount,
      currency: paymentIntentParams.currency,
      metadata: paymentIntentParams.metadata,
    })

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    // Step 5: Record payment intent in database
    try {
      const { error: dbError } = await supabase
        .from('payments')
        .insert({
          id: `payment_${paymentIntent.id}`,
          payment_intent_id: paymentIntent.id,
          user_id: validatedRequest.userId,
          order_id: validatedRequest.orderId,
          amount: validatedRequest.amount,
          currency: validatedRequest.currency,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret,
          metadata: JSON.stringify(paymentIntent.metadata || {}),
          created_at: new Date().toISOString(),
        })

      if (dbError) {
        console.error('Failed to record payment intent in database:', dbError)
        // Don't fail the request - Stripe payment intent was created successfully
        // This will be handled by webhook recovery if needed
      }
    } catch (dbError) {
      console.error('Database recording failed:', dbError)
      // Continue - webhook will handle this
    }

    // Step 6: Return success response
    const response = {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created: paymentIntent.created,
      },
      metadata: {
        userId: validatedRequest.userId,
        orderId: validatedRequest.orderId,
        corrected: !!validatedRequest.metadata.corrected_amount,
      }
    }

    console.log('✅ Payment intent created successfully:', paymentIntent.id)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders,
    })

  } catch (error: any) {
    console.error('❌ Payment intent creation failed:', error)

    // Handle known error format
    if (error.statusCode && error.error) {
      return new Response(JSON.stringify(error), {
        status: error.statusCode,
        headers: corsHeaders,
      })
    }

    // Handle Stripe errors
    if (error.type) {
      const stripeErrorResponse = createPaymentError(
        'STRIPE_ERROR',
        error.message || 'Stripe API error',
        'Payment processing error. Please try again.'
      )

      return new Response(JSON.stringify(stripeErrorResponse), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Handle unknown errors
    const genericError = createPaymentError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      'Something went wrong. Please try again.'
    )

    return new Response(JSON.stringify(genericError), {
      status: 500,
      headers: corsHeaders,
    })
  }
})