/**
 * Stripe Webhook Handler Edge Function
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Implements secure webhook processing for payment events with signature verification,
 * database updates, and comprehensive error handling.
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

// Webhook endpoint secret for signature verification
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

// Enhanced error handling following established patterns
const createWebhookError = (
  code: string,
  message: string,
  statusCode: number = 400
) => ({
  error: {
    code,
    message,
    timestamp: new Date().toISOString(),
  },
  statusCode,
})

// Webhook signature verification
const verifyWebhookSignature = (body: string, signature: string): Stripe.Event => {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    return event
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error)
    throw createWebhookError(
      'INVALID_SIGNATURE',
      'Invalid webhook signature',
      400
    )
  }
}

// Update payment record in database following established patterns
const updatePaymentRecord = async (paymentIntentId: string, updates: any) => {
  try {
    const { error } = await supabase
      .from('payments')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', paymentIntentId)

    if (error) {
      console.error('❌ Failed to update payment record:', error)
      throw new Error(`Payment record update failed: ${error.message}`)
    }

    console.log(`✅ Updated payment record for ${paymentIntentId}:`, updates)
  } catch (error) {
    console.error('Payment record update error:', error)
    throw error
  }
}

// Update order status following atomic operations pattern
const updateOrderStatus = async (orderId: string, paymentStatus: string, paymentIntentId: string) => {
  try {
    const { error } = await supabase.rpc('update_order_payment_status', {
      input_order_id: orderId,
      input_payment_status: paymentStatus,
      input_payment_intent_id: paymentIntentId
    })

    if (error) {
      console.error('❌ Failed to update order status:', error)
      throw new Error(`Order status update failed: ${error.message}`)
    }

    console.log(`✅ Updated order ${orderId} payment status to ${paymentStatus}`)
  } catch (error) {
    console.error('Order update error:', error)
    throw error
  }
}

// Handle payment intent succeeded event
const handlePaymentIntentSucceeded = async (paymentIntent: Stripe.PaymentIntent) => {
  console.log('💰 Processing payment_intent.succeeded:', paymentIntent.id)

  try {
    // Update payment record
    await updatePaymentRecord(paymentIntent.id, {
      status: 'succeeded',
      payment_method_id: paymentIntent.payment_method,
      metadata: JSON.stringify(paymentIntent.metadata || {}),
    })

    // Update order status if orderId is in metadata
    if (paymentIntent.metadata?.orderId) {
      await updateOrderStatus(paymentIntent.metadata.orderId, 'paid', paymentIntent.id)
    }

    console.log('✅ Successfully processed payment_intent.succeeded')
  } catch (error) {
    console.error('❌ Failed to process payment_intent.succeeded:', error)
    throw error
  }
}

// Handle payment intent payment failed event
const handlePaymentIntentPaymentFailed = async (paymentIntent: Stripe.PaymentIntent) => {
  console.log('❌ Processing payment_intent.payment_failed:', paymentIntent.id)

  try {
    // Update payment record
    await updatePaymentRecord(paymentIntent.id, {
      status: 'failed',
      metadata: JSON.stringify(paymentIntent.metadata || {}),
    })

    // Update order status if orderId is in metadata
    if (paymentIntent.metadata?.orderId) {
      await updateOrderStatus(paymentIntent.metadata.orderId, 'failed', paymentIntent.id)
    }

    console.log('✅ Successfully processed payment_intent.payment_failed')
  } catch (error) {
    console.error('❌ Failed to process payment_intent.payment_failed:', error)
    throw error
  }
}

// Handle payment intent canceled event
const handlePaymentIntentCanceled = async (paymentIntent: Stripe.PaymentIntent) => {
  console.log('🚫 Processing payment_intent.canceled:', paymentIntent.id)

  try {
    // Update payment record
    await updatePaymentRecord(paymentIntent.id, {
      status: 'canceled',
      metadata: JSON.stringify(paymentIntent.metadata || {}),
    })

    // Update order status if orderId is in metadata
    if (paymentIntent.metadata?.orderId) {
      await updateOrderStatus(paymentIntent.metadata.orderId, 'canceled', paymentIntent.id)
    }

    console.log('✅ Successfully processed payment_intent.canceled')
  } catch (error) {
    console.error('❌ Failed to process payment_intent.canceled:', error)
    throw error
  }
}

// Handle payment intent processing event
const handlePaymentIntentProcessing = async (paymentIntent: Stripe.PaymentIntent) => {
  console.log('⏳ Processing payment_intent.processing:', paymentIntent.id)

  try {
    // Update payment record
    await updatePaymentRecord(paymentIntent.id, {
      status: 'processing',
      payment_method_id: paymentIntent.payment_method,
      metadata: JSON.stringify(paymentIntent.metadata || {}),
    })

    // Don't update order status to processing - keep it as pending until succeeded

    console.log('✅ Successfully processed payment_intent.processing')
  } catch (error) {
    console.error('❌ Failed to process payment_intent.processing:', error)
    throw error
  }
}

// Handle payment method attached event
const handlePaymentMethodAttached = async (paymentMethod: Stripe.PaymentMethod) => {
  console.log('💳 Processing payment_method.attached:', paymentMethod.id)

  try {
    // Record the payment method in our database if customer metadata has userId
    if (paymentMethod.customer && typeof paymentMethod.customer === 'string') {
      // Get customer to find userId from metadata
      const customer = await stripe.customers.retrieve(paymentMethod.customer)
      
      if (typeof customer !== 'string' && customer.metadata?.userId) {
        const userId = customer.metadata.userId

        // Insert or update payment method record
        const { error } = await supabase
          .from('payment_methods')
          .upsert({
            id: `pm_${paymentMethod.id}`,
            user_id: userId,
            type: paymentMethod.type,
            customer_id: paymentMethod.customer,
            card_brand: paymentMethod.card?.brand || null,
            card_last4: paymentMethod.card?.last4 || null,
            card_exp_month: paymentMethod.card?.exp_month || null,
            card_exp_year: paymentMethod.card?.exp_year || null,
            is_default: false, // Will be set separately
            created_at: new Date().toISOString(),
          })

        if (error) {
          console.error('❌ Failed to save payment method:', error)
        } else {
          console.log('✅ Successfully saved payment method')
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to process payment_method.attached:', error)
    // Don't throw - this is not critical
  }
}

// Handle charge dispute created (chargeback)
const handleChargeDisputeCreated = async (dispute: Stripe.Dispute) => {
  console.log('⚠️ Processing charge.dispute.created:', dispute.id)

  try {
    // Find the payment intent associated with this charge
    const charge = await stripe.charges.retrieve(dispute.charge as string)
    const paymentIntentId = charge.payment_intent as string

    if (paymentIntentId) {
      // Update payment record with dispute information
      await updatePaymentRecord(paymentIntentId, {
        status: 'disputed',
        metadata: JSON.stringify({
          dispute_id: dispute.id,
          dispute_reason: dispute.reason,
          dispute_amount: dispute.amount,
          dispute_status: dispute.status,
        }),
      })

      // Get payment record to find associated order
      const { data: paymentData } = await supabase
        .from('payments')
        .select('order_id')
        .eq('payment_intent_id', paymentIntentId)
        .single()

      // Update order status if order exists
      if (paymentData?.order_id) {
        await updateOrderStatus(paymentData.order_id, 'disputed', paymentIntentId)
      }
    }

    console.log('✅ Successfully processed charge.dispute.created')
  } catch (error) {
    console.error('❌ Failed to process charge.dispute.created:', error)
    throw error
  }
}

// Log webhook event for monitoring
const logWebhookEvent = async (event: Stripe.Event, processed: boolean, error?: string) => {
  try {
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString(),
        processed_successfully: processed,
        error_message: error || null,
        event_data: JSON.stringify(event.data),
      })

    if (logError) {
      console.error('❌ Failed to log webhook event:', logError)
    }
  } catch (error) {
    console.error('Webhook logging error:', error)
    // Don't throw - logging failure shouldn't fail webhook processing
  }
}

// Main webhook event handler
const handleWebhookEvent = async (event: Stripe.Event) => {
  console.log(`🎯 Processing webhook event: ${event.type}`)

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentPaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.processing':
        await handlePaymentIntentProcessing(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod)
        break

      case 'charge.dispute.created':
        await handleChargeDisputeCreated(event.data.object as Stripe.Dispute)
        break

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // Log but don't process - not implemented yet
        console.log(`📝 Received ${event.type} event - logging but not processing`)
        break

      default:
        console.log(`🔄 Unhandled webhook event type: ${event.type}`)
        break
    }

    // Log successful processing
    await logWebhookEvent(event, true)

    return { success: true, eventType: event.type }
  } catch (error) {
    console.error(`❌ Failed to handle webhook event ${event.type}:`, error)
    
    // Log failed processing
    await logWebhookEvent(event, false, error.message)

    throw error
  }
}

// Main request handler
serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify(createWebhookError(
        'METHOD_NOT_ALLOWED',
        'Only POST requests are allowed'
      )),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Get raw body and signature header
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      throw createWebhookError(
        'MISSING_SIGNATURE',
        'Missing stripe-signature header'
      )
    }

    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET environment variable not set')
      throw createWebhookError(
        'CONFIGURATION_ERROR',
        'Webhook secret not configured',
        500
      )
    }

    console.log('🎯 Received webhook with signature')

    // Step 1: Verify webhook signature
    const event = verifyWebhookSignature(body, signature)
    
    console.log(`✅ Webhook signature verified for event: ${event.type} (${event.id})`)

    // Step 2: Handle the webhook event
    const result = await handleWebhookEvent(event)

    // Step 3: Return success response
    return new Response(JSON.stringify({
      received: true,
      eventId: event.id,
      eventType: event.type,
      processed: result.success,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('❌ Webhook processing failed:', error)

    // Handle known error format
    if (error.statusCode && error.error) {
      return new Response(JSON.stringify(error), {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Handle unknown errors
    const genericError = createWebhookError(
      'INTERNAL_ERROR',
      'Webhook processing failed',
      500
    )

    return new Response(JSON.stringify(genericError), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})