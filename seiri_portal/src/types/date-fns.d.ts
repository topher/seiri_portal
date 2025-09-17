// Type declaration for date-fns compatibility with v4.x
declare module 'date-fns' {
  export function format(date: Date | number | string, format: string): string;
  export function differenceInDays(dateLeft: Date | number | string, dateRight: Date | number | string): number;
  export function getDay(date: Date | number | string): number;
  export function parse(dateString: string, formatString: string, referenceDate: Date | number | string): Date;
  export function startOfWeek(date: Date | number | string): Date;
  export function addMonths(date: Date | number | string, amount: number): Date;
  export function subMonths(date: Date | number | string, amount: number): Date;
}

declare module 'date-fns/locale' {
  export const enUS: any;
}