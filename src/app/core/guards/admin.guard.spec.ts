import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  it('should be defined', () => {
    expect(adminGuard).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof adminGuard).toBe('function');
  });
});