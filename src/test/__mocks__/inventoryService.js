// Mock for inventory service that matches hook expectations
export class InventoryService {
  constructor(supabase) {
    this.supabase = supabase;
  }
  
  async getInventoryItems(userId, filters) {
    return [];
  }
  
  async getInventoryItem(itemId) {
    return null;
  }
  
  async getLowStockItems(userId) {
    return [];
  }
  
  async getRecentMovements(userId, limit = 10) {
    return [];
  }
  
  async getAlerts(userId) {
    return [];
  }
  
  async updateStock(update) {
    return {};
  }
  
  async batchUpdateStock(updates) {
    return [];
  }
  
  async createInventoryItem(item) {
    return { ...item, id: 'new-id' };
  }
  
  async deleteInventoryItem(itemId) {
    return;
  }
  
  async acknowledgeAlert(alertId) {
    return;
  }
}