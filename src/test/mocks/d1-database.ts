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
  private callCounts: Map<string, number> = new Map();

  prepare(query: string): MockD1PreparedStatement {
    this.incrementCallCount('prepare');
    return new MockD1PreparedStatement(query, this);
  }

  private incrementCallCount(method: string): void {
    const currentCount = this.callCounts.get(method) || 0;
    this.callCounts.set(method, currentCount + 1);
  }

  getCallCount(method: string): number {
    return this.callCounts.get(method) || 0;
  }

  resetCallCounts(): void {
    this.callCounts.clear();
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
        // Only initialize table if it doesn't already exist (to preserve data)
        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, []);
        }
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

        // Handle ON CONFLICT (UPSERT pattern)
        if (normalizedQuery.includes('on conflict')) {
          // Extract conflict columns from: ON CONFLICT(col1, col2, col3)
          const conflictMatch = query.match(/on conflict\s*\(([^)]+)\)/i);
          if (conflictMatch) {
            const conflictColumns = conflictMatch[1].split(',').map(c => c.trim());

            // Find existing row with matching conflict columns
            const existingIndex = table.findIndex((existingRow: any) => {
              return conflictColumns.every(col => existingRow[col] === row[col]);
            });

            if (existingIndex !== -1) {
              // Update existing row
              if (normalizedQuery.includes('do update set')) {
                // Update with excluded values (new values from INSERT)
                Object.keys(row).forEach(key => {
                  table[existingIndex][key] = row[key];
                });
                this.tables.set(tableName, table);
                return { results: [], meta: { changes: 1 } };
              } else {
                // DO NOTHING
                return { results: [], meta: { changes: 0 } };
              }
            }
          }
        }

        // Normal insert (no conflict or no existing row found)
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
          // Handle complex OR condition for expires_at (short-term memory active filtering)
          // Pattern: WHERE student_id = ? AND (expires_at IS NULL OR expires_at > ?)
          if (normalizedQuery.includes('expires_at is null') && normalizedQuery.includes('or')) {
            const studentIdMatch = query.match(/where\s+(\w+)\s*=\s*\?/i);
            if (studentIdMatch && bindings.length >= 2) {
              const studentIdColumn = studentIdMatch[1];
              const studentIdValue = bindings[0];
              const expiresAtValue = bindings[1];

              table = table.filter((row: any) => {
                const matchesStudentId = row[studentIdColumn] === studentIdValue;

                // Check if this is a consolidation query (expires_at <= ?) or active memory query (expires_at > ?)
                // Consolidation: expires_at <= ? OR expires_at IS NULL (expired or no expiration)
                // Active: expires_at IS NULL OR expires_at > ? (no expiration or not yet expired)
                let expiresCondition = false;
                if (normalizedQuery.includes('expires_at <= ?') || normalizedQuery.includes('expires_at<=?')) {
                  // Consolidation query: get expired memories
                  expiresCondition = row.expires_at === null ||
                                     row.expires_at === undefined ||
                                     (row.expires_at && row.expires_at <= expiresAtValue);
                } else {
                  // Active memory query: get non-expired memories
                  expiresCondition = row.expires_at === null ||
                                     row.expires_at === undefined ||
                                     (row.expires_at && row.expires_at > expiresAtValue);
                }

                return matchesStudentId && expiresCondition;
              });
            }
          } else {
            // Handle simple WHERE conditions with multiple AND clauses
            // Extract all WHERE conditions (column = ?)
            const whereRegex = /(\w+)\s*=\s*\?/g;
            const conditions: Array<{ column: string; bindingIndex: number }> = [];
            let match;
            let bindingIndex = 0;

            // Extract all column = ? patterns
            while ((match = whereRegex.exec(query)) !== null) {
              conditions.push({
                column: match[1],
                bindingIndex: bindingIndex++
              });
            }

            // Handle WHERE col = 'literal' (for tests that don't use bindings)
            const literalRegex = /(\w+)\s*=\s*'([^']+)'/g;
            let literalMatch;
            while ((literalMatch = literalRegex.exec(query)) !== null) {
              const column = literalMatch[1];
              const value = literalMatch[2];
              table = table.filter((row: any) => row[column] === value);
            }

            // Apply all binding-based conditions
            if (conditions.length > 0 && bindings.length >= conditions.length) {
              table = table.filter((row: any) => {
                return conditions.every(({ column, bindingIndex }) => {
                  const value = bindings[bindingIndex];
                  return row[column] === value;
                });
              });
            }
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
    this.resetCallCounts();
  }
}

