import { describe, it, expect } from 'vitest';
import { MissingRequiredFieldError } from '../../src/utils/errors';

describe('MissingRequiredFieldError', () => {
  it('parentContext olmadan temel mesaj üretir', () => {
    const err = new MissingRequiredFieldError('cbc:ID');
    expect(err).toBeInstanceOf(MissingRequiredFieldError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('MissingRequiredFieldError');
    expect(err.fieldName).toBe('cbc:ID');
    expect(err.parentContext).toBeUndefined();
    expect(err.message).toContain("Required UBL field 'cbc:ID' missing");
    expect(err.message).not.toContain('parent:');
  });

  it('parentContext ile kontekslenmiş mesaj üretir', () => {
    const err = new MissingRequiredFieldError('cbc:IssueDate', 'DocumentReference');
    expect(err.fieldName).toBe('cbc:IssueDate');
    expect(err.parentContext).toBe('DocumentReference');
    expect(err.message).toContain("cbc:IssueDate");
    expect(err.message).toContain('DocumentReference');
  });
});
