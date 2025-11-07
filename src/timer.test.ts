import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timer } from './timer';

describe('Timer', () => {
  let timer: Timer;

  beforeEach(() => {
    timer = new Timer();
    // Mock the global setInterval and clearInterval
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should start the timer with the specified duration', () => {
      timer.start(10);
      expect(timer.isTimerRunning()).toBe(true);
      expect(timer.getRemainingTime()).toBe(10);
    });

    it('should throw an error when duration is not positive', () => {
      expect(() => timer.start(0)).toThrow('Duration must be a positive number');
      expect(() => timer.start(-5)).toThrow('Duration must be a positive number');
    });

    it('should decrease remaining time every second', () => {
      timer.start(5);
      expect(timer.getRemainingTime()).toBe(5);

      // Advance timer by 1 second
      vi.advanceTimersByTime(1000);
      expect(timer.getRemainingTime()).toBe(4);

      // Advance timer by another second
      vi.advanceTimersByTime(1000);
      expect(timer.getRemainingTime()).toBe(3);
    });

    it('should stop when reaching zero', () => {
      timer.start(1);
      expect(timer.isTimerRunning()).toBe(true);

      // Advance timer by 1 second
      vi.advanceTimersByTime(1000);
      expect(timer.getRemainingTime()).toBe(0);
      expect(timer.isTimerRunning()).toBe(false);
    });
  });

  describe('stop', () => {
    it('should stop the timer', () => {
      timer.start(10);
      expect(timer.isTimerRunning()).toBe(true);

      timer.stop();
      expect(timer.isTimerRunning()).toBe(false);
    });

    it('should preserve remaining time when stopped', () => {
      timer.start(10);
      vi.advanceTimersByTime(2000); // 2 seconds passed
      expect(timer.getRemainingTime()).toBe(8);

      timer.stop();
      expect(timer.getRemainingTime()).toBe(8);
    });
  });

  describe('reset', () => {
    it('should reset the timer to initial duration', () => {
      timer.start(10);
      vi.advanceTimersByTime(3000); // 3 seconds passed
      expect(timer.getRemainingTime()).toBe(7);

      timer.reset();
      expect(timer.getRemainingTime()).toBe(10);
      expect(timer.isTimerRunning()).toBe(false);
    });

    it('should reset the timer from paused state', () => {
      timer.start(15);
      vi.advanceTimersByTime(5000); // 5 seconds passed
      timer.pause();
      
      expect(timer.getRemainingTime()).toBe(10);
      expect(timer.isPaused()).toBe(true);

      timer.reset();
      expect(timer.getRemainingTime()).toBe(15);
      expect(timer.isTimerRunning()).toBe(false);
      expect(timer.isPaused()).toBe(false);
    });

    it('should reset all timer state when called', () => {
      timer.start(20);
      vi.advanceTimersByTime(8000); // 8 seconds passed
      
      timer.reset();
      
      expect(timer.getRemainingTime()).toBe(20);
      expect(timer.isTimerRunning()).toBe(false);
      expect(timer.isPaused()).toBe(false);
    });

    it('should be callable when timer has not been started', () => {
      timer.reset();
      expect(timer.getRemainingTime()).toBe(0);
      expect(timer.isTimerRunning()).toBe(false);
    });

    it('should reset when timer reaches zero', () => {
      timer.start(2);
      vi.advanceTimersByTime(2000); // Timer completes
      
      expect(timer.getRemainingTime()).toBe(0);
      expect(timer.isTimerRunning()).toBe(false);

      timer.reset();
      expect(timer.getRemainingTime()).toBe(2);
      expect(timer.isTimerRunning()).toBe(false);
    });

    it('should stop the countdown after reset', () => {
      timer.start(10);
      vi.advanceTimersByTime(3000); // 3 seconds
      
      timer.reset();
      expect(timer.getRemainingTime()).toBe(10);
      
      // Time should not advance after reset
      vi.advanceTimersByTime(2000);
      expect(timer.getRemainingTime()).toBe(10);
      expect(timer.isTimerRunning()).toBe(false);
    });
  });

  describe('getRemainingTime', () => {
    it('should return the current remaining time', () => {
      timer.start(30);
      expect(timer.getRemainingTime()).toBe(30);

      vi.advanceTimersByTime(5000);
      expect(timer.getRemainingTime()).toBe(25);
    });
  });

  describe('isTimerRunning', () => {
    it('should return true when timer is running', () => {
      timer.start(10);
      expect(timer.isTimerRunning()).toBe(true);
    });

    it('should return false when timer is not running', () => {
      expect(timer.isTimerRunning()).toBe(false);
      
      timer.start(10);
      timer.stop();
      expect(timer.isTimerRunning()).toBe(false);
    });
  });

  describe('pause', () => {
    it('should pause the timer', () => {
      timer.start(10);
      expect(timer.isTimerRunning()).toBe(true);
      expect(timer.isPaused()).toBe(false);

      timer.pause();
      expect(timer.isTimerRunning()).toBe(false);
      expect(timer.isPaused()).toBe(true);
    });

    it('should preserve remaining time when paused', () => {
      timer.start(10);
      vi.advanceTimersByTime(3000); // 3 seconds passed
      expect(timer.getRemainingTime()).toBe(7);

      timer.pause();
      expect(timer.getRemainingTime()).toBe(7);

      // Time should not advance when paused
      vi.advanceTimersByTime(2000);
      expect(timer.getRemainingTime()).toBe(7);
    });

    it('should do nothing if timer is not running', () => {
      timer.pause();
      expect(timer.isPaused()).toBe(false);
    });

    it('should do nothing if timer is already paused', () => {
      timer.start(10);
      timer.pause();
      expect(timer.isPaused()).toBe(true);

      timer.pause(); // Try to pause again
      expect(timer.isPaused()).toBe(true);
    });
  });

  describe('resume', () => {
    it('should resume the timer from paused state', () => {
      timer.start(10);
      vi.advanceTimersByTime(2000); // 2 seconds
      timer.pause();
      
      expect(timer.getRemainingTime()).toBe(8);
      expect(timer.isPaused()).toBe(true);

      timer.resume();
      expect(timer.isTimerRunning()).toBe(true);
      expect(timer.isPaused()).toBe(false);

      // Timer should continue counting down
      vi.advanceTimersByTime(1000);
      expect(timer.getRemainingTime()).toBe(7);
    });

    it('should do nothing if timer is not paused', () => {
      timer.start(10);
      expect(timer.isTimerRunning()).toBe(true);

      timer.resume(); // Try to resume when already running
      expect(timer.isTimerRunning()).toBe(true);
      expect(timer.isPaused()).toBe(false);
    });

    it('should allow multiple pause and resume cycles', () => {
      timer.start(10);
      
      vi.advanceTimersByTime(2000); // 2 seconds: 8 remaining
      timer.pause();
      expect(timer.getRemainingTime()).toBe(8);
      
      timer.resume();
      vi.advanceTimersByTime(3000); // 3 seconds: 5 remaining
      expect(timer.getRemainingTime()).toBe(5);
      
      timer.pause();
      timer.resume();
      vi.advanceTimersByTime(2000); // 2 seconds: 3 remaining
      expect(timer.getRemainingTime()).toBe(3);
    });
  });

  describe('isPaused', () => {
    it('should return false when timer is not paused', () => {
      expect(timer.isPaused()).toBe(false);
      
      timer.start(10);
      expect(timer.isPaused()).toBe(false);
    });

    it('should return true when timer is paused', () => {
      timer.start(10);
      timer.pause();
      expect(timer.isPaused()).toBe(true);
    });

    it('should return false after resuming', () => {
      timer.start(10);
      timer.pause();
      expect(timer.isPaused()).toBe(true);
      
      timer.resume();
      expect(timer.isPaused()).toBe(false);
    });

    it('should return false after stopping', () => {
      timer.start(10);
      timer.pause();
      expect(timer.isPaused()).toBe(true);
      
      timer.stop();
      expect(timer.isPaused()).toBe(false);
    });
  });
});