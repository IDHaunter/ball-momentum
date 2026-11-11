export class ValidationErrors extends Error {
  constructor(message: string, readonly issues: string[] = []) {
    super(message);
    this.name = 'ValidationErrors';
  }
}
