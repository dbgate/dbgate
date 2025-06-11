// Cache manager for DB2 plugin to improve performance and reliability
// This manages schema and structure data caching

class CacheManager {
  constructor() {
    this.schemaCache = new Map(); // Map of connectionId -> schemas
    this.structureCache = new Map(); // Map of connectionId_schemaName -> structure
    this.maxCacheAgeMs = 5 * 60 * 1000; // 5 minutes default TTL
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheEnabled = true;
    
    console.log('[DB2] Cache manager initialized');
  }

  getSchemaCache(connectionId) {
    const key = `${connectionId}`;
    const cacheEntry = this.schemaCache.get(key);
    
    if (!cacheEntry) {
      this.cacheMisses++;
      return null;
    }
    
    const { timestamp, data } = cacheEntry;
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - timestamp > this.maxCacheAgeMs) {
      console.log(`[DB2] Schema cache for connection ${connectionId} expired`);
      this.schemaCache.delete(key);
      this.cacheMisses++;
      return null;
    }
    
    this.cacheHits++;
    console.log(`[DB2] Schema cache hit for connection ${connectionId}`);
    return data;
  }

  setSchemaCache(connectionId, schemas) {
    if (!this.cacheEnabled) return;
    
    const key = `${connectionId}`;
    this.schemaCache.set(key, {
      timestamp: Date.now(),
      data: schemas
    });
    console.log(`[DB2] Schema cache set for connection ${connectionId}`);
  }

  getStructureCache(connectionId, schemaName) {
    const key = `${connectionId}_${schemaName}`;
    const cacheEntry = this.structureCache.get(key);
    
    if (!cacheEntry) {
      this.cacheMisses++;
      return null;
    }
    
    const { timestamp, data } = cacheEntry;
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - timestamp > this.maxCacheAgeMs) {
      console.log(`[DB2] Structure cache for schema ${schemaName} expired`);
      this.structureCache.delete(key);
      this.cacheMisses++;
      return null;
    }
    
    this.cacheHits++;
    console.log(`[DB2] Structure cache hit for schema ${schemaName}`);
    return data;
  }

  setStructureCache(connectionId, schemaName, structure) {
    if (!this.cacheEnabled) return;
    
    const key = `${connectionId}_${schemaName}`;
    this.structureCache.set(key, {
      timestamp: Date.now(),
      data: structure
    });
    console.log(`[DB2] Structure cache set for schema ${schemaName}`);
  }

  invalidateCache(connectionId, schemaName = null) {
    if (schemaName) {
      // Invalidate specific schema's structure
      const key = `${connectionId}_${schemaName}`;
      this.structureCache.delete(key);
      console.log(`[DB2] Invalidated structure cache for ${schemaName}`);
    } else {
      // Invalidate all caches for this connection
      this.schemaCache.delete(`${connectionId}`);
      
      // Delete all structure caches that match the connection ID
      for (const key of this.structureCache.keys()) {
        if (key.startsWith(`${connectionId}_`)) {
          this.structureCache.delete(key);
        }
      }
      
      console.log(`[DB2] Invalidated all caches for connection ${connectionId}`);
    }
  }

  getCacheStats() {
    return {
      enabled: this.cacheEnabled,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRatio: this.cacheHits + this.cacheMisses > 0 ? 
        (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(2) + '%' : '0%',
      schemaCacheSize: this.schemaCache.size,
      structureCacheSize: this.structureCache.size
    };
  }

  resetStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  enableCache(enabled = true) {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearAllCaches();
    }
    return this.cacheEnabled;
  }

  clearAllCaches() {
    this.schemaCache.clear();
    this.structureCache.clear();
    console.log('[DB2] All caches cleared');
  }
  
  // For partial updates of structure
  updateStructureCache(connectionId, schemaName, updateFunction) {
    const key = `${connectionId}_${schemaName}`;
    const cacheEntry = this.structureCache.get(key);
    
    if (cacheEntry) {
      const updatedData = updateFunction(cacheEntry.data);
      this.structureCache.set(key, {
        timestamp: Date.now(),
        data: updatedData
      });
      return true;
    }
    
    return false;
  }
}

// Export a singleton instance
const cacheManager = new CacheManager();
module.exports = cacheManager;
