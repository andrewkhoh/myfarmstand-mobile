-- Kiosk Database Functions
-- Following atomic operation patterns

-- Function to update kiosk session statistics
CREATE OR REPLACE FUNCTION update_kiosk_session_stats(
  session_id UUID,
  sale_amount DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update session statistics atomically
  UPDATE kiosk_sessions 
  SET 
    total_sales = COALESCE(total_sales, 0) + sale_amount,
    transaction_count = COALESCE(transaction_count, 0) + 1,
    updated_at = NOW()
  WHERE 
    id = session_id 
    AND is_active = true;
    
  -- Return true if session was found and updated
  RETURN FOUND;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_kiosk_session_stats(UUID, DECIMAL) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_kiosk_session_stats IS 'Atomically updates kiosk session total sales and transaction count';