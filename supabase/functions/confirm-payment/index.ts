/**
 * Stripe Payment Confirmation Edge Function
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Implements secure server-side payment confirmation with user validation,
 * order updates, and comprehensive error handling.
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
interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId?: string;
  userId: string;
  orderId?: string;
  returnUrl?: string;
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
const validateRequest = (body: any): ConfirmPaymentRequest => {
  const { paymentIntentId, paymentMethodId, userId, orderId, returnUrl } = body

  // Required field validation
  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    throw createPaymentError(
      'INVALID_PAYMENT_INTENT_ID',
      'Payment intent ID must be provided',
      'Invalid payment request'
    )
  }

  if (!userId || typeof userId !== 'string') {
    throw createPaymentError(
      'INVALID_USER',
      'User ID must be provided',
      'Authentication required'
    )
  }

  // Validate payment intent ID format (Stripe format: pi_...)
  if (!paymentIntentId.startsWith('pi_')) {
    throw createPaymentError(
      'INVALID_PAYMENT_INTENT_FORMAT',
      'Payment intent ID format is invalid',
      'Invalid payment request format'
    )
  }

  return {
    paymentIntentId,
    paymentMethodId,
    userId,
    orderId,
    returnUrl,
  }
}

// User authentication and authorization following established patterns
const validateUser = async (userId: string) => {
  try {
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

// Payment intent ownership validation
const validatePaymentIntentOwnership = async (paymentIntentId: string, userId: string) => {
  try {
    // First check our database record
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('id, user_id, payment_intent_id, status, order_id')
      .eq('payment_intent_id', paymentIntentId)
      .eq('user_id', userId)
      .single()

    if (paymentError || !paymentData) {
      throw createPaymentError(
        'PAYMENT_NOT_FOUND',
        'Payment intent not found or unauthorized',
        'Payment not found',
        404
      )
    }

    // Also retrieve from Stripe to get current status
    const stripePaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    // Verify metadata matches our user
    if (stripePaymentIntent.metadata?.userId !== userId) {
      throw createPaymentError(
        'UNAUTHORIZED_ACCESS',
        'User does not own this payment intent',
        'Unauthorized access',
        403
      )
    }

    return { paymentData, stripePaymentIntent }
  } catch (error) {
    console.error('Payment intent validation failed:', error)
    if (error.statusCode) throw error
    
    throw createPaymentError(
      'PAYMENT_VALIDATION_FAILED',
      'Payment validation failed',
      'Unable to validate payment'
    )
  }
}

// Update order status following atomic operations pattern
const updateOrderStatus = async (orderId: string, paymentStatus: string, paymentIntentId: string) => {
  try {
    // Use atomic RPC function for order status update
    const { error: updateError } = await supabase.rpc('update_order_payment_status', {
      input_order_id: orderId,
      input_payment_status: paymentStatus,
      input_payment_intent_id: paymentIntentId
    })

    if (updateError) {
      console.error('Failed to update order status:', updateError)
      throw new Error('Order status update failed')
    }

    console.log(`✅ Updated order ${orderId} payment status to ${paymentStatus}`)
  } catch (error) {
    console.error('Order update error:', error)
    // Don't fail the entire confirmation if order update fails
    // This will be handled by webhook recovery
  }
}

// Update payment record in database
const updatePaymentRecord = async (
  paymentIntentId: string, 
  status: string, 
  stripePaymentIntent: Stripe.PaymentIntent
) => {
  try {
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: status,
        payment_method_id: stripePaymentIntent.payment_method as string || null,
        updated_at: new Date().toISOString(),
        metadata: JSON.stringify(stripePaymentIntent.metadata || {}),
      })
      .eq('payment_intent_id', paymentIntentId)

    if (updateError) {
      console.error('Failed to update payment record:', updateError)
      throw new Error('Payment record update failed')
    }

    console.log(`✅ Updated payment record for ${paymentIntentId} status to ${status}`)
  } catch (error) {
    console.error('Payment record update error:', error)
    // Don't fail confirmation - webhook will handle this
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

    console.log('🔒 Confirming payment:', { 
      paymentIntentId: requestBody.paymentIntentId,
      userId: requestBody.userId?.substring(0, 8) + '...',
      orderId: requestBody.orderId 
    })

    // Step 1: Validate request data
    const validatedRequest = validateRequest(requestBody)

    // Step 2: Validate user authentication
    const user = await validateUser(validatedRequest.userId)

    // Step 3: Validate payment intent ownership
    const { paymentData, stripePaymentIntent } = await validatePaymentIntentOwnership(
      validatedRequest.paymentIntentId,
      validatedRequest.userId
    )

    // Step 4: Check if payment intent is in confirmable state
    if (stripePaymentIntent.status === 'succeeded') {
      // Payment already succeeded - return success
      return new Response(JSON.stringify({
        success: true,
        paymentIntent: {
          id: stripePaymentIntent.id,
          status: stripePaymentIntent.status,
          amount: stripePaymentIntent.amount,
          currency: stripePaymentIntent.currency,
        },
        message: 'Payment was already completed successfully'
      }), {
        status: 200,
        headers: corsHeaders,
      })
    }

    if (!['requires_confirmation', 'requires_action'].includes(stripePaymentIntent.status)) {
      throw createPaymentError(
        'PAYMENT_NOT_CONFIRMABLE',
        `Payment intent status is ${stripePaymentIntent.status}, cannot confirm`,
        'This payment cannot be confirmed in its current state'
      )
    }

    // Step 5: Confirm the payment intent with Stripe
    const confirmParams: Stripe.PaymentIntentConfirmParams = {
      return_url: validatedRequest.returnUrl,
    }

    // Add payment method if provided and not already attached
    if (validatedRequest.paymentMethodId && !stripePaymentIntent.payment_method) {
      confirmParams.payment_method = validatedRequest.paymentMethodId
    }

    console.log('💳 Confirming Stripe payment intent:', {
      id: validatedRequest.paymentIntentId,
      params: confirmParams,
    })

    const confirmedPaymentIntent = await stripe.paymentIntents.confirm(
      validatedRequest.paymentIntentId,
      confirmParams
    )

    // Step 6: Update payment record in database
    await updatePaymentRecord(
      validatedRequest.paymentIntentId,
      confirmedPaymentIntent.status,
      confirmedPaymentIntent
    )

    // Step 7: Update order status if orderId provided
    if (validatedRequest.orderId || paymentData.order_id) {
      const orderId = validatedRequest.orderId || paymentData.order_id
      
      if (orderId) {
        const orderPaymentStatus = confirmedPaymentIntent.status === 'succeeded' ? 'paid' : 'pending'
        await updateOrderStatus(orderId, orderPaymentStatus, validatedRequest.paymentIntentId)
      }
    }

    // Step 8: Handle different confirmation outcomes
    let responseData: any = {
      success: true,
      paymentIntent: {
        id: confirmedPaymentIntent.id,
        status: confirmedPaymentIntent.status,
        amount: confirmedPaymentIntent.amount,
        currency: confirmedPaymentIntent.currency,
        client_secret: confirmedPaymentIntent.client_secret,
      }
    }

    // Handle 3D Secure or other authentication requirements
    if (confirmedPaymentIntent.status === 'requires_action') {
      responseData.requiresAction = true
      responseData.nextAction = confirmedPaymentIntent.next_action
      responseData.message = 'Additional authentication required'
    } else if (confirmedPaymentIntent.status === 'succeeded') {
      responseData.message = 'Payment completed successfully'
    } else if (confirmedPaymentIntent.status === 'processing') {
      responseData.message = 'Payment is being processed'
    }

    console.log('✅ Payment confirmation result:', {
      paymentIntentId: confirmedPaymentIntent.id,
      status: confirmedPaymentIntent.status,
      requiresAction: !!responseData.requiresAction
    })

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: corsHeaders,
    })

  } catch (error: any) {
    console.error('❌ Payment confirmation failed:', error)

    // Handle known error format
    if (error.statusCode && error.error) {
      return new Response(JSON.stringify(error), {
        status: error.statusCode,
        headers: corsHeaders,
      })
    }

    // Handle Stripe errors
    if (error.type) {
      let userMessage = 'Payment confirmation failed. Please try again.'
      
      // Provide specific error messages for common cases
      if (error.code === 'card_declined') {
        userMessage = 'Your card was declined. Please try a different payment method.'
      } else if (error.code === 'insufficient_funds') {
        userMessage = 'Your card has insufficient funds. Please try a different payment method.'
      } else if (error.code === 'expired_card') {
        userMessage = 'Your card has expired. Please use a different card.'
      }

      const stripeErrorResponse = createPaymentError(
        'STRIPE_ERROR',
        error.message || 'Stripe API error',
        userMessage
      )

      return new Response(JSON.stringify(stripeErrorResponse), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Handle unknown errors
    const genericError = createPaymentError(
      'INTERNAL_ERROR',
      'An unexpected error occurred during payment confirmation',
      'Something went wrong. Please try again.'
    )

    return new Response(JSON.stringify(genericError), {
      status: 500,
      headers: corsHeaders,
    })
  }
})