/**
 * Memory CRUD Operations Tests
 * Story 1.7: Core Memory System Structure
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createShortTermMemory,
  getShortTermMemories,
  getShortTermMemoryById,
  createLongTermMemory,
  getLongTermMemories,
  getLongTermMemoryById,
} from './memory';
import type { CreateShortTermMemoryInput, CreateLongTermMemoryInput } from '../rpc/types';

// Mock D1Database implementation for testing
const createMockDb = () => {
  const data: Map<string, any[]> = new Map();

  return {
    prepare: (sql: string) => {
      let boundValues: any[] = [];

      return {
        bind: (...values: any[]) => {
          boundValues = values;
          return {
            run: async () => {
              // INSERT operations
              if (sql.includes('INSERT INTO short_term_memory')) {
                const [id, studentId, content, sessionId, importanceScore, createdAt, expiresAt] = boundValues;
                if (!data.has('short_term_memory')) {
                  data.set('short_term_memory', []);
                }
                data.get('short_term_memory')!.push({
                  id, student_id: studentId, content, session_id: sessionId,
                  importance_score: importanceScore, created_at: createdAt, expires_at: expiresAt
                });
                return { success: true };
              }

              if (sql.includes('INSERT INTO long_term_memory')) {
                const [id, studentId, content, category, tags, createdAt, lastAccessedAt] = boundValues;
                if (!data.has('long_term_memory')) {
                  data.set('long_term_memory', []);
                }
                data.get('long_term_memory')!.push({
                  id, student_id: studentId, content, category, tags,
                  created_at: createdAt, last_accessed_at: lastAccessedAt
                });
                return { success: true };
              }

              // UPDATE operations
              if (sql.includes('UPDATE long_term_memory')) {
                const [newAccessTime, memoryId] = boundValues;
                const memories = data.get('long_term_memory') || [];
                const memory = memories.find(m => m.id === memoryId);
                if (memory) {
                  memory.last_accessed_at = newAccessTime;
                }
                return { success: true };
              }

              return { success: true };
            },
            all: async () => {
              // SELECT operations
              if (sql.includes('FROM short_term_memory')) {
                const memories = data.get('short_term_memory') || [];
                const [studentId, ...rest] = boundValues;

                let filtered = memories.filter(m => m.student_id === studentId);

                // Apply filters based on query parameters
                if (rest.length > 0 && sql.includes('importance_score >=')) {
                  const minImportance = rest[0];
                  filtered = filtered.filter(m => m.importance_score >= minImportance);
                }

                return { results: filtered };
              }

              if (sql.includes('FROM long_term_memory')) {
                const memories = data.get('long_term_memory') || [];
                const [studentId, ...rest] = boundValues;

                let filtered = memories.filter(m => m.student_id === studentId);

                // Apply category filter
                if (sql.includes('category =') && rest.length > 0) {
                  const category = rest[0];
                  filtered = filtered.filter(m => m.category === category);
                }

                // Apply tag filter
                if (sql.includes('tags LIKE') && rest.length > 0) {
                  const tagPattern = rest[rest.length - 1];
                  if (typeof tagPattern === 'string') {
                    const tag = tagPattern.replace(/%"/g, '').replace(/"%.*/g, '');
                    filtered = filtered.filter(m => m.tags.includes(tag));
                  }
                }

                return { results: filtered };
              }

              return { results: [] };
            },
            first: async () => {
              // SELECT single record
              if (sql.includes('FROM short_term_memory')) {
                const [memoryId, studentId] = boundValues;
                const memories = data.get('short_term_memory') || [];
                return memories.find(m => m.id === memoryId && m.student_id === studentId) || null;
              }

              if (sql.includes('FROM long_term_memory')) {
                const [memoryId, studentId] = boundValues;
                const memories = data.get('long_term_memory') || [];
                return memories.find(m => m.id === memoryId && m.student_id === studentId) || null;
              }

              return null;
            },
          };
        },
      };
    },
  } as unknown as D1Database;
};

describe('Short-Term Memory Operations', () => {
  let db: D1Database;
  const studentId = 'student_test123';

  beforeEach(() => {
    db = createMockDb();
  });

  it('should create short-term memory with all fields', async () => {
    const input: CreateShortTermMemoryInput = {
      content: JSON.stringify({ text: 'Test session note' }),
      sessionId: 'session_123',
      importanceScore: 0.8,
      expiresAt: '2025-12-31T23:59:59Z',
    };

    const memory = await createShortTermMemory(db, studentId, input);

    expect(memory.id).toBeDefined();
    expect(memory.studentId).toBe(studentId);
    expect(memory.content).toBe(input.content);
    expect(memory.sessionId).toBe(input.sessionId);
    expect(memory.importanceScore).toBe(0.8);
    expect(memory.createdAt).toBeDefined();
    expect(memory.expiresAt).toBe(input.expiresAt);
  });

  it('should create short-term memory with default importance score', async () => {
    const input: CreateShortTermMemoryInput = {
      content: JSON.stringify({ text: 'Test note' }),
    };

    const memory = await createShortTermMemory(db, studentId, input);

    expect(memory.importanceScore).toBe(0.5);
  });

  it('should retrieve short-term memories for a student', async () => {
    // Create multiple memories
    await createShortTermMemory(db, studentId, {
      content: 'Memory 1',
      importanceScore: 0.7,
    });
    await createShortTermMemory(db, studentId, {
      content: 'Memory 2',
      importanceScore: 0.9,
    });

    const memories = await getShortTermMemories(db, studentId);

    expect(memories).toHaveLength(2);
    expect(memories[0].content).toBe('Memory 1');
    expect(memories[1].content).toBe('Memory 2');
  });

  it('should filter memories by minimum importance', async () => {
    await createShortTermMemory(db, studentId, {
      content: 'Low importance',
      importanceScore: 0.3,
    });
    await createShortTermMemory(db, studentId, {
      content: 'High importance',
      importanceScore: 0.9,
    });

    const memories = await getShortTermMemories(db, studentId, {
      minImportance: 0.5,
    });

    expect(memories).toHaveLength(1);
    expect(memories[0].content).toBe('High importance');
  });

  it('should retrieve single memory by ID with student isolation', async () => {
    const created = await createShortTermMemory(db, studentId, {
      content: 'Test memory',
    });

    const retrieved = await getShortTermMemoryById(db, studentId, created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.content).toBe('Test memory');
  });

  it('should return null for non-existent memory ID', async () => {
    const retrieved = await getShortTermMemoryById(db, studentId, 'nonexistent-id');

    expect(retrieved).toBeNull();
  });

  it('should isolate memories by student ID', async () => {
    const student1 = 'student_1';
    const student2 = 'student_2';

    await createShortTermMemory(db, student1, { content: 'Student 1 memory' });
    await createShortTermMemory(db, student2, { content: 'Student 2 memory' });

    const student1Memories = await getShortTermMemories(db, student1);
    const student2Memories = await getShortTermMemories(db, student2);

    expect(student1Memories).toHaveLength(1);
    expect(student2Memories).toHaveLength(1);
    expect(student1Memories[0].content).toBe('Student 1 memory');
    expect(student2Memories[0].content).toBe('Student 2 memory');
  });
});

describe('Long-Term Memory Operations', () => {
  let db: D1Database;
  const studentId = 'student_test456';

  beforeEach(() => {
    db = createMockDb();
  });

  it('should create long-term memory with all fields', async () => {
    const input: CreateLongTermMemoryInput = {
      content: JSON.stringify({ fact: 'Student prefers visual learning' }),
      category: 'preferences',
      tags: ['learning-style', 'visual'],
    };

    const memory = await createLongTermMemory(db, studentId, input);

    expect(memory.id).toBeDefined();
    expect(memory.studentId).toBe(studentId);
    expect(memory.content).toBe(input.content);
    expect(memory.category).toBe('preferences');
    expect(memory.tags).toBe(JSON.stringify(['learning-style', 'visual']));
    expect(memory.createdAt).toBeDefined();
    expect(memory.lastAccessedAt).toBeDefined();
  });

  it('should create long-term memory with empty tags array by default', async () => {
    const input: CreateLongTermMemoryInput = {
      content: 'Knowledge item',
      category: 'knowledge',
    };

    const memory = await createLongTermMemory(db, studentId, input);

    expect(memory.tags).toBe('[]');
  });

  it('should retrieve long-term memories for a student', async () => {
    await createLongTermMemory(db, studentId, {
      content: 'Fact 1',
      category: 'knowledge',
    });
    await createLongTermMemory(db, studentId, {
      content: 'Fact 2',
      category: 'knowledge',
    });

    const memories = await getLongTermMemories(db, studentId);

    expect(memories).toHaveLength(2);
  });

  it('should filter memories by category', async () => {
    await createLongTermMemory(db, studentId, {
      content: 'Knowledge item',
      category: 'knowledge',
    });
    await createLongTermMemory(db, studentId, {
      content: 'Preference item',
      category: 'preferences',
    });

    const memories = await getLongTermMemories(db, studentId, {
      category: 'knowledge',
    });

    expect(memories).toHaveLength(1);
    expect(memories[0].category).toBe('knowledge');
  });

  it('should filter memories by tag', async () => {
    await createLongTermMemory(db, studentId, {
      content: 'Math knowledge',
      category: 'knowledge',
      tags: ['math', 'algebra'],
    });
    await createLongTermMemory(db, studentId, {
      content: 'Science knowledge',
      category: 'knowledge',
      tags: ['science', 'physics'],
    });

    const memories = await getLongTermMemories(db, studentId, {
      tag: 'math',
    });

    expect(memories).toHaveLength(1);
    expect(memories[0].content).toBe('Math knowledge');
  });

  it('should update last_accessed_at when retrieving by ID', async () => {
    const created = await createLongTermMemory(db, studentId, {
      content: 'Test memory',
      category: 'knowledge',
    });

    const originalAccessTime = created.lastAccessedAt;

    // Wait a tiny bit to ensure timestamp changes
    await new Promise(resolve => setTimeout(resolve, 10));

    const retrieved = await getLongTermMemoryById(db, studentId, created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.lastAccessedAt).not.toBe(originalAccessTime);
  });

  it('should isolate memories by student ID', async () => {
    const student1 = 'student_1';
    const student2 = 'student_2';

    await createLongTermMemory(db, student1, {
      content: 'Student 1 knowledge',
      category: 'knowledge',
    });
    await createLongTermMemory(db, student2, {
      content: 'Student 2 knowledge',
      category: 'knowledge',
    });

    const student1Memories = await getLongTermMemories(db, student1);
    const student2Memories = await getLongTermMemories(db, student2);

    expect(student1Memories).toHaveLength(1);
    expect(student2Memories).toHaveLength(1);
    expect(student1Memories[0].content).toBe('Student 1 knowledge');
    expect(student2Memories[0].content).toBe('Student 2 knowledge');
  });
});
