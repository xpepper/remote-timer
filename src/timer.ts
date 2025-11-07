/**
 * Timer class to handle countdown functionality
 */
export class Timer {
  private duration: number = 0; // Duration in seconds
  private remainingTime: number = 0; // Remaining time in seconds
  private isRunning: boolean = false;
  private intervalId: any = null; // Use 'any' type to work in both browser and test environments

  /**
   * Start the timer with a specific duration
   * @param duration - Duration in seconds
   */
  start(duration: number): void {
    if (duration <= 0) {
      throw new Error('Duration must be a positive number');
    }
    
    this.duration = duration;
    this.remainingTime = duration;
    this.isRunning = true;
    
    // Clear any existing interval
    if (this.intervalId) {
      this.clearInterval(this.intervalId);
    }
    
    // Start the countdown
    this.intervalId = this.setInterval(() => {
      this.tick();
    }, 1000);
  }

  /**
   * Stop the timer
   */
  stop(): void {
    if (this.intervalId) {
      this.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Reset the timer to initial state
   */
  reset(): void {
    this.stop();
    this.remainingTime = this.duration;
  }

  /**
   * Get the remaining time in seconds
   * @returns Remaining time in seconds
   */
  getRemainingTime(): number {
    return this.remainingTime;
  }

  /**
   * Check if the timer is running
   * @returns True if the timer is running, false otherwise
   */
  isTimerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Private method to handle each tick of the timer
   */
  private tick(): void {
    if (this.remainingTime > 0) {
      this.remainingTime--;
    }
    
    // If timer reaches zero, stop it
    if (this.remainingTime <= 0) {
      this.stop();
    }
  }

  /**
   * Set interval with environment check
   * @param callback - Function to call at specified interval
   * @param delay - Interval delay in milliseconds
   * @returns Interval ID
   */
  private setInterval(callback: () => void, delay: number): any {
    if (typeof window !== 'undefined' && window.setInterval) {
      return window.setInterval(callback, delay);
    } else {
      // Fallback for test environment
      return setInterval(callback, delay);
    }
  }

  /**
   * Clear interval with environment check
   * @param intervalId - ID of the interval to clear
   */
  private clearInterval(intervalId: any): void {
    if (typeof window !== 'undefined' && window.clearInterval) {
      window.clearInterval(intervalId);
    } else {
      clearInterval(intervalId);
    }
  }
}