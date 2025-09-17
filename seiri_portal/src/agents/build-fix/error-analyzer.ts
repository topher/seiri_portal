/**
 * Build Error Analysis Agent
 * Analyzes TypeScript and build errors to categorize and prioritize fixes
 */

export interface BuildError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  category: ErrorCategory;
  severity: 'error' | 'warning';
  fixStrategy: FixStrategy;
}

export type ErrorCategory = 
  | 'type-mismatch'
  | 'missing-import'
  | 'missing-dependency'
  | 'incompatible-types'
  | 'any-type-implicit'
  | 'property-missing'
  | 'module-resolution'
  | 'react-component-type';

export type FixStrategy =
  | 'add-type-assertion'
  | 'install-dependency'
  | 'fix-import-path'
  | 'add-type-definition'
  | 'update-interface'
  | 'add-null-check'
  | 'fix-generic-type';

export class ErrorAnalyzer {
  /**
   * Parse TypeScript compiler output and categorize errors
   */
  static parseTypeScriptErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];
    const errorPattern = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;
    
    let match;
    while ((match = errorPattern.exec(output)) !== null) {
      const [, file, line, column, code, message] = match;
      
      errors.push({
        file,
        line: parseInt(line),
        column: parseInt(column),
        code,
        message,
        category: this.categorizeError(code, message),
        severity: 'error',
        fixStrategy: this.determineFixStrategy(code, message)
      });
    }
    
    return errors;
  }

  /**
   * Categorize error by TypeScript error code and message
   */
  private static categorizeError(code: string, message: string): ErrorCategory {
    if (code === 'TS2305') return 'missing-import';
    if (code === 'TS2322') return 'type-mismatch';
    if (code === 'TS2339') return 'property-missing';
    if (code === 'TS7006') return 'any-type-implicit';
    if (code === 'TS2344') return 'incompatible-types';
    if (code === 'TS2551') return 'property-missing';
    if (code === 'TS2353') return 'incompatible-types';
    
    if (message.includes('ReactNode')) return 'react-component-type';
    if (message.includes('module')) return 'module-resolution';
    
    return 'type-mismatch';
  }

  /**
   * Determine the best fix strategy for an error
   */
  private static determineFixStrategy(code: string, message: string): FixStrategy {
    if (code === 'TS2305') return 'fix-import-path';
    if (code === 'TS2322' && message.includes('ReactNode')) return 'add-type-assertion';
    if (code === 'TS2339') return 'update-interface';
    if (code === 'TS7006') return 'add-type-definition';
    if (code === 'TS2353') return 'update-interface';
    
    return 'add-type-assertion';
  }

  /**
   * Group errors by file for efficient batch fixing
   */
  static groupErrorsByFile(errors: BuildError[]): Map<string, BuildError[]> {
    const grouped = new Map<string, BuildError[]>();
    
    for (const error of errors) {
      if (!grouped.has(error.file)) {
        grouped.set(error.file, []);
      }
      grouped.get(error.file)!.push(error);
    }
    
    return grouped;
  }

  /**
   * Prioritize errors by impact and ease of fixing
   */
  static prioritizeErrors(errors: BuildError[]): BuildError[] {
    return errors.sort((a, b) => {
      // Fix import errors first (easiest)
      if (a.category === 'missing-import' && b.category !== 'missing-import') return -1;
      if (b.category === 'missing-import' && a.category !== 'missing-import') return 1;
      
      // Then missing dependencies
      if (a.category === 'missing-dependency' && b.category !== 'missing-dependency') return -1;
      if (b.category === 'missing-dependency' && a.category !== 'missing-dependency') return 1;
      
      // Then implicit any types
      if (a.category === 'any-type-implicit' && b.category !== 'any-type-implicit') return -1;
      if (b.category === 'any-type-implicit' && a.category !== 'any-type-implicit') return 1;
      
      return 0;
    });
  }
}