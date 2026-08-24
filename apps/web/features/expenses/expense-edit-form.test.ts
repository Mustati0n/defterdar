import { editableSplitMethod } from './expense-edit-form';

describe('Expense edit split mental model', () => {
  it('keeps EQUAL Expenses in EQUAL mode instead of forcing EXACT', () => {
    expect(editableSplitMethod('EQUAL')).toBe('EQUAL');
  });

  it('uses reconstructable exact amounts for advanced persisted methods', () => {
    expect(editableSplitMethod('EXACT')).toBe('EXACT');
    expect(editableSplitMethod('PERCENTAGE')).toBe('EXACT');
    expect(editableSplitMethod('SHARES')).toBe('EXACT');
  });
});
