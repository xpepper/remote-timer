/**
 * Timer class to handle countdown functionality
 */
export class Timer {
  private duration: number = 0; // Duration in seconds
  private remainingTime: number = 0; // Remaining time in seconds
  private isRunning: boolean = false;
  private intervalId: number | null = null;

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
      clearInterval(this.intervalId);
    }
    
    // Start the countdown
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, 1000);
  }

  /**
   * Stop the timer
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
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
}