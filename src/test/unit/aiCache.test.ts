import { expect } from 'chai';
import { AICache } from '../../utils/aiCache';

describe('AICache', () => {
    let cache: AICache<string>;

    beforeEach(() => {
        cache = new AICache<string>({
            maxSize: 1024 * 1024, // 1MB
            ttl: 1000, // 1 second for testing
            enabled: true
        });
    });

    afterEach(() => {
        cache.clear();
    });

    describe('Basic operations', () => {
        it('should store and retrieve data', () => {
            cache.set('test content', 'operation1', 'result1');
            const result = cache.get('test content', 'operation1');
            expect(result).to.equal('result1');
        });

        it('should return null for non-existent keys', () => {
            const result = cache.get('non-existent', 'operation1');
            expect(result).to.be.null;
        });

        it('should return null when disabled', () => {
            cache.setEnabled(false);
            cache.set('test', 'op', 'data');
            const result = cache.get('test', 'op');
            expect(result).to.be.null;
        });

        it('should clear all data', () => {
            cache.set('test1', 'op1', 'data1');
            cache.set('test2', 'op2', 'data2');
            cache.clear();
            
            expect(cache.get('test1', 'op1')).to.be.null;
            expect(cache.get('test2', 'op2')).to.be.null;
        });
    });

    describe('TTL (Time-To-Live)', () => {
        it('should expire entries after TTL', async () => {
            cache.set('test', 'op', 'data');
            
            // Should be available immediately
            expect(cache.get('test', 'op')).to.equal('data');
            
            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            // Should be expired
            expect(cache.get('test', 'op')).to.be.null;
        });

        it('should clean expired entries', async () => {
            cache.set('test1', 'op', 'data1');
            cache.set('test2', 'op', 'data2');
            
            // Wait for TTL
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            const cleaned = cache.cleanExpired();
            expect(cleaned).to.equal(2);
            
            const stats = cache.getStats();
            expect(stats.entries).to.equal(0);
        });
    });

    describe('LRU eviction', () => {
        it('should evict least recently used entries when size limit exceeded', () => {
            const smallCache = new AICache<string>({
                maxSize: 200, // Small cache - each entry is ~50-60 bytes
                ttl: 60000,
                enabled: true
            });

            // Add entries that will exceed size limit
            // Each entry with key hash + data is approximately 50-60 bytes
            smallCache.set('a', 'op', 'data1');
            smallCache.set('b', 'op', 'data2');
            smallCache.set('c', 'op', 'data3');
            smallCache.set('d', 'op', 'data4');
            smallCache.set('e', 'op', 'data5'); // This should trigger eviction

            const stats = smallCache.getStats();

            // Cache should have evicted some entries to stay under limit
            expect(stats.size).to.be.lessThan(201);

            // Later entries should still exist
            expect(smallCache.get('e', 'op')).to.equal('data5');
        });

        it('should update access order on get', () => {
            const smallCache = new AICache<string>({
                maxSize: 200,
                ttl: 60000,
                enabled: true
            });

            smallCache.set('a', 'op', 'data1');
            smallCache.set('b', 'op', 'data2');

            // Access 'a' to make it recently used
            const accessed = smallCache.get('a', 'op');
            expect(accessed).to.equal('data1');

            // Add more entries to trigger eviction
            smallCache.set('c', 'op', 'data3');
            smallCache.set('d', 'op', 'data4');
            smallCache.set('e', 'op', 'data5');

            // 'a' should still exist because we accessed it recently
            expect(smallCache.get('a', 'op')).to.equal('data1');
        });
    });

    describe('Statistics', () => {
        it('should track cache hits and misses', () => {
            cache.set('test', 'op', 'data');
            
            cache.get('test', 'op'); // hit
            cache.get('missing', 'op'); // miss
            cache.get('test', 'op'); // hit
            
            const stats = cache.getStats();
            expect(stats.hits).to.equal(2);
            expect(stats.misses).to.equal(1);
            expect(stats.hitRate).to.be.closeTo(0.667, 0.01);
        });

        it('should track cache size', () => {
            cache.set('test', 'op', 'data');
            
            const stats = cache.getStats();
            expect(stats.entries).to.equal(1);
            expect(stats.size).to.be.greaterThan(0);
        });

        it('should reset stats on clear', () => {
            cache.set('test', 'op', 'data');
            cache.get('test', 'op');
            cache.clear();
            
            const stats = cache.getStats();
            expect(stats.hits).to.equal(0);
            expect(stats.misses).to.equal(0);
            expect(stats.entries).to.equal(0);
        });
    });
});

