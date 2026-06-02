import { describe, it, expect } from 'vitest';
import { runEngine, getDecisions } from './engine';

describe('Explainable Logic Verification', () => {
  const json = {
    "user1": { "name": "Alice", "age": 30 },
    "user2": { "name": "Bob", "age": 25 },
    "admin": { "name": "Charlie", "age": 40, "role": "super" }
  };

  it('should detect unification candidates', () => {
    const decisions = getDecisions(json);
    const unification = decisions.find(d => d.type === 'unification');
    
    expect(unification, "Should find at least one unification decision").toBeTruthy();
    console.log(`✅ Detected Decision: ${unification?.title}`);
  });

  it('should reflect "Split" (disabling unification) in output', () => {
    const target = 'typescript';
    
    // 1. Default (Unified)
    const unifiedOutput = runEngine(json, target);
    expect(unifiedOutput).toContain('SharedUser');

    // 2. Disabled (Split)
    const splitOutput = runEngine(json, target, "", {
      disabledUnifications: ['SharedUser']
    });
    
    expect(splitOutput).not.toContain('SharedUser');
    expect(splitOutput).toContain('User1');
    expect(splitOutput).toContain('User2');
    
    console.log('✅ "Split" button logic confirmed: Code changes correctly.');
  });

  it('should reflect "Rename" in output', () => {
    const renamedOutput = runEngine(json, 'typescript', "", {
      customTypeNames: { 'SharedUser': 'AppMember' }
    });
    
    expect(renamedOutput).toContain('AppMember');
    expect(renamedOutput).not.toContain('SharedUser');
    
    console.log('✅ "Rename" button logic confirmed: Type name changes correctly.');
  });
});
