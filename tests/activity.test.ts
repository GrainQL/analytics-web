/**
 * Tests for Activity Detection
 */

import { ActivityDetector } from '../src/activity';

describe('ActivityDetector', () => {
  let detector: ActivityDetector;

  beforeEach(() => {
    detector = new ActivityDetector();
  });

  afterEach(() => {
    detector.destroy();
  });

  it('should initialize with current timestamp', () => {
    const now = Date.now();
    const lastActivity = detector.getLastActivityTime();
    expect(lastActivity).toBeGreaterThanOrEqual(now - 100);
    expect(lastActivity).toBeLessThanOrEqual(now + 100);
  });

  it('should detect user activity with debounce', (done) => {
    const initialTime = detector.getLastActivityTime();
    
    // Simulate user activity
    const event = new Event('click');
    window.dispatchEvent(event);
    
    // Wait for debounce (500ms)
    setTimeout(() => {
      const newTime = detector.getLastActivityTime();
      expect(newTime).toBeGreaterThan(initialTime);
      done();
    }, 600);
  });

  it('should consider user active within threshold', () => {
    expect(detector.isActive(30000)).toBe(true);
  });

  it('should update activity on multiple event types', (done) => {
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart'];
    let testsCompleted = 0;
    
    events.forEach((eventType, index) => {
      setTimeout(() => {
        const initialTime = detector.getLastActivityTime();
        
        const event = new Event(eventType);
        window.dispatchEvent(event);
        
        setTimeout(() => {
          const newTime = detector.getLastActivityTime();
          expect(newTime).toBeGreaterThanOrEqual(initialTime);
          testsCompleted++;
          
          if (testsCompleted === events.length) {
            done();
          }
        }, 600);
      }, index * 1200);
    });
  });

  it('should debounce rapid activity events', (done) => {
    const listener = jest.fn();
    detector.addListener(listener);
    
    // Fire multiple events rapidly
    for (let i = 0; i < 10; i++) {
      window.dispatchEvent(new Event('click'));
    }
    
    // Wait for debounce
    setTimeout(() => {
      // Should have been called (debounced)
      expect(listener.mock.calls.length).toBeGreaterThan(0);
      expect(listener.mock.calls.length).toBeLessThanOrEqual(2); // Debounced to 1-2 calls
      done();
    }, 700);
  });

  it('should notify listeners on activity', (done) => {
    const listener = jest.fn();
    detector.addListener(listener);
    
    window.dispatchEvent(new Event('click'));
    
    setTimeout(() => {
      expect(listener).toHaveBeenCalled();
      done();
    }, 600);
  });

  it('should remove listeners', (done) => {
    const listener = jest.fn();
    detector.addListener(listener);
    detector.removeListener(listener);
    
    window.dispatchEvent(new Event('click'));
    
    setTimeout(() => {
      expect(listener).not.toHaveBeenCalled();
      done();
    }, 600);
  });

  it('should get time since last activity', () => {
    const timeSince = detector.getTimeSinceLastActivity();
    expect(timeSince).toBeGreaterThanOrEqual(0);
    expect(timeSince).toBeLessThan(100);
  });

  it('should allow custom activity threshold', () => {
    detector.setActivityThreshold(10000);
    expect(detector.isActive()).toBe(true);
  });

  it('should cleanup on destroy', (done) => {
    const listener = jest.fn();
    detector.addListener(listener);
    
    detector.destroy();
    
    window.dispatchEvent(new Event('click'));
    
    setTimeout(() => {
      expect(listener).not.toHaveBeenCalled();
      done();
    }, 600);
  });

  it('should not respond to events after destroy', () => {
    const initialTime = detector.getLastActivityTime();
    detector.destroy();
    
    window.dispatchEvent(new Event('click'));
    
    const newTime = detector.getLastActivityTime();
    expect(newTime).toBe(initialTime);
  });
});
