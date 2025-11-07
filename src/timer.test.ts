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
});