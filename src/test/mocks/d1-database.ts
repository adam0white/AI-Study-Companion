/**
 * Mock D1 Database for Testing
 * Simulates Cloudflare D1 database behavior in tests
 */

export class MockD1PreparedStatement {
  private query: string;
  private bindings: any[] = [];
  private database: MockD1Database;

  constructor(query: string, database: MockD1Database) {
    this.query = query;
    this.database = database;
  }

  bind(...values: any[]): MockD1PreparedStatement {
    this.bindings = values;
    return this;
  }

  async run(): Promise<{ success: boolean; meta: any }> {
    const result = await this.database.exec(this.query, this.bindings);
    return {
      success: true,
      meta: result.meta,
    };
  }

  async first<T = any>(): Promise<T | null> {
    const result = await this.all<T>();
    return result.results?.[0] || null;
  }

  async all<T = any>(): Promise<{ results: T[]; success: boolean }> {
    const result = await this.database.exec(this.query, this.bindings);
    return {
      results: result.results as T[],
      success: true,
    };
  }
}

export class MockD1Database {
  private tables: Map<string, any[]> = new Map();
  private schemas: Set<string> = new Set();

  prepare(query: string): MockD1PreparedStatement {
    return new MockD1PreparedStatement(query, this);
  }

  async batch(statements: MockD1PreparedStatement[]): Promise<any[]> {
    const results = [];
    for (const stmt of statements) {
      const result = await stmt.run();
      results.push(result);
    }
    return results;
  }

  async exec(query: string, bindings: any[] = []): Promise<{ results: any[]; meta: any }> {
    const normalizedQuery = query.trim().toLowerCase();

    // Handle CREATE TABLE
    if (normalizedQuery.includes('create table')) {
      const tableMatch = query.match(/create table (?:if not exists )?(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        // Add to both schemas and tables for proper tracking
        this.schemas.add(tableName);
        this.tables.set(tableName, []);
      }
      return { results: [], meta: { changes: 0 } };
    }

    // Handle CREATE INDEX
    if (normalizedQuery.includes('create index')) {
      return { results: [], meta: { changes: 0 } };
    }

    // Handle INSERT
    if (normalizedQuery.includes('insert into')) {
      const tableMatch = query.match(/insert into (\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const table = this.tables.get(tableName) || [];
        
        // Extract column names from INSERT statement
        const columnsMatch = query.match(/\(([^)]+)\)\s*values/i);
        const columns = columnsMatch
          ? columnsMatch[1].split(',').map(c => c.trim())
          : [];
        
        // Create row object from bindings
        const row: any = {};
        columns.forEach((col, idx) => {
          row[col] = bindings[idx];
        });
        
        table.push(row);
        this.tables.set(tableName, table);
        
        return { results: [], meta: { changes: 1 } };
      }
    }

    // Handle SELECT
    if (normalizedQuery.includes('select')) {
      const tableMatch = query.match(/from (\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        let table = this.tables.get(tableName) || [];
        
        // Handle WHERE clause
        if (normalizedQuery.includes('where')) {
          const whereMatch = query.match(/where\s+(\w+)\s*=\s*\?/i);
          if (whereMatch && bindings.length > 0) {
            const column = whereMatch[1];
            const value = bindings[0];
            table = table.filter((row: any) => row[column] === value);
          }
          
          // Handle additional AND conditions
          const andMatch = query.match(/and\s+(\w+)\s*=\s*\?/i);
          if (andMatch && bindings.length > 1) {
            const column = andMatch[1];
            const value = bindings[1];
            table = table.filter((row: any) => row[column] === value);
          }
        }
        
        // Handle ORDER BY
        if (normalizedQuery.includes('order by')) {
          const orderMatch = query.match(/order by\s+(\w+)(?:\s+(desc|asc))?/i);
          if (orderMatch) {
            const column = orderMatch[1];
            const direction = orderMatch[2]?.toLowerCase() === 'desc' ? -1 : 1;
            table = [...table].sort((a: any, b: any) => {
              if (a[column] < b[column]) return -1 * direction;
              if (a[column] > b[column]) return 1 * direction;
              return 0;
            });
          }
        }
        
        // Handle LIMIT
        if (normalizedQuery.includes('limit')) {
          const limitMatch = query.match(/limit\s+\?/i);
          if (limitMatch) {
            const limitValue = bindings[bindings.length - 1];
            table = table.slice(0, limitValue);
          } else {
            const limitMatch2 = query.match(/limit\s+(\d+)/i);
            if (limitMatch2) {
              table = table.slice(0, parseInt(limitMatch2[1]));
            }
          }
        }
        
        return { results: table, meta: { changes: 0 } };
      }
    }

    // Handle UPDATE
    if (normalizedQuery.includes('update')) {
      const tableMatch = query.match(/update (\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const table = this.tables.get(tableName) || [];
        
        // Extract SET column
        const setMatch = query.match(/set\s+(\w+)\s*=\s*\?/i);
        const whereMatch = query.match(/where\s+(\w+)\s*=\s*\?/i);
        
        if (setMatch && whereMatch && bindings.length >= 2) {
          const setColumn = setMatch[1];
          const setValue = bindings[0];
          const whereColumn = whereMatch[1];
          const whereValue = bindings[1];
          
          let changes = 0;
          table.forEach((row: any) => {
            if (row[whereColumn] === whereValue) {
              row[setColumn] = setValue;
              changes++;
            }
          });
          
          return { results: [], meta: { changes } };
        }
      }
    }

    // Handle DELETE
    if (normalizedQuery.includes('delete')) {
      const tableMatch = query.match(/delete from (\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const table = this.tables.get(tableName) || [];
        
        if (normalizedQuery.includes('where')) {
          const whereMatch = query.match(/where\s+(\w+)\s*=\s*\?/i);
          if (whereMatch && bindings.length > 0) {
            const column = whereMatch[1];
            const value = bindings[0];
            const before = table.length;
            const filtered = table.filter((row: any) => row[column] !== value);
            this.tables.set(tableName, filtered);
            return { results: [], meta: { changes: before - filtered.length } };
          }
        }
      }
    }

    return { results: [], meta: { changes: 0 } };
  }

  // Helper methods for testing
  getTable(tableName: string): any[] {
    return this.tables.get(tableName) || [];
  }

  hasTable(tableName: string): boolean {
    return this.schemas.has(tableName) || this.tables.has(tableName);
  }

  clear(): void {
    this.tables.clear();
    this.schemas.clear();
  }

  reset(): void {
    this.clear();
  }
}

