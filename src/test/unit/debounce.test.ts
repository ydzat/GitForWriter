import { expect } from 'chai';
import { debounce, PerformanceMonitor } from '../../utils/debounce';

describe('Debounce', () => {
    it('should delay function execution', async () => {
        let callCount = 0;
        const fn = () => { callCount++; };
        const debounced = debounce(fn, 100);

        debounced();
        debounced();
        debounced();

        // Should not be called immediately
        expect(callCount).to.equal(0);

        // Wait for debounce delay
        await new Promise(resolve => setTimeout(resolve, 150));

        // Should be called once
        expect(callCount).to.equal(1);
    });

    it('should pass arguments correctly', async () => {
        let receivedArgs: any[] = [];
        const fn = (...args: any[]) => { receivedArgs = args; };
        const debounced = debounce(fn, 50);

        debounced('a', 'b', 'c');

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(receivedArgs).to.deep.equal(['a', 'b', 'c']);
    });

    it('should cancel pending execution', async () => {
        let callCount = 0;
        const fn = () => { callCount++; };
        const debounced = debounce(fn, 100);

        debounced();
        debounced.cancel();

        await new Promise(resolve => setTimeout(resolve, 150));

        expect(callCount).to.equal(0);
    });

    it('should flush immediately', () => {
        let callCount = 0;
        const fn = () => { callCount++; };
        const debounced = debounce(fn, 1000);

        debounced();
        debounced.flush();

        // Should be called immediately
        expect(callCount).to.equal(1);
    });

    it('should use last arguments when flushed', () => {
        let receivedValue = '';
        const fn = (value: string) => { receivedValue = value; };
        const debounced = debounce(fn, 1000);

        debounced('first');
        debounced('second');
        debounced('third');
        debounced.flush();

        expect(receivedValue).to.equal('third');
    });
});

describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        monitor = new PerformanceMonitor(100); // 100ms threshold
    });

    afterEach(() => {
        monitor.clear();
    });

    it('should track operation duration', async () => {
        const endTiming = monitor.start('test-operation');
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        endTiming();

        const stats = monitor.getStats('test-operation');
        expect(stats).to.not.be.null;
        expect(stats!.count).to.equal(1);
        expect(stats!.avg).to.be.greaterThan(40);
        expect(stats!.avg).to.be.lessThan(100);
    });

    it('should track multiple operations', async () => {
        const end1 = monitor.start('op1');
        await new Promise(resolve => setTimeout(resolve, 10));
        end1();

        const end2 = monitor.start('op1');
        await new Promise(resolve => setTimeout(resolve, 20));
        end2();

        const stats = monitor.getStats('op1');
        expect(stats!.count).to.equal(2);
        expect(stats!.min).to.be.greaterThan(5);
        expect(stats!.max).to.be.greaterThan(15);
    });

    it('should calculate statistics correctly', async () => {
        // Simulate operations with known durations
        const end1 = monitor.start('test');
        await new Promise(resolve => setTimeout(resolve, 10));
        end1();

        const end2 = monitor.start('test');
        await new Promise(resolve => setTimeout(resolve, 30));
        end2();

        const stats = monitor.getStats('test');
        expect(stats!.count).to.equal(2);
        expect(stats!.avg).to.be.greaterThan(15);
        // Allow more tolerance for CI environments where timing may be less precise
        expect(stats!.avg).to.be.lessThan(35);
    });

    it('should return null for non-existent operation', () => {
        const stats = monitor.getStats('non-existent');
        expect(stats).to.be.null;
    });

    it('should get all statistics', async () => {
        const end1 = monitor.start('op1');
        end1();

        const end2 = monitor.start('op2');
        end2();

        const allStats = monitor.getAllStats();
        expect(allStats.size).to.equal(2);
        expect(allStats.has('op1')).to.be.true;
        expect(allStats.has('op2')).to.be.true;
    });

    it('should clear all statistics', async () => {
        const end = monitor.start('test');
        end();

        monitor.clear();

        const stats = monitor.getStats('test');
        expect(stats).to.be.null;
    });
});

