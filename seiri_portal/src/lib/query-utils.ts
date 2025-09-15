// Query object for Neo4j compatibility
// This replaces the Appwrite Query import throughout the codebase
export const Query = {
  equal: (field: string, value: any) => ({ method: 'equal', attribute: field, values: [value] }),
  notEqual: (field: string, value: any) => ({ method: 'notEqual', attribute: field, values: [value] }),
  lessThan: (field: string, value: any) => ({ method: 'lessThan', attribute: field, values: [value] }),
  lessThanEqual: (field: string, value: any) => ({ method: 'lessThanEqual', attribute: field, values: [value] }),
  greaterThan: (field: string, value: any) => ({ method: 'greaterThan', attribute: field, values: [value] }),
  greaterThanEqual: (field: string, value: any) => ({ method: 'greaterThanEqual', attribute: field, values: [value] }),
  orderDesc: (field: string) => ({ method: 'orderDesc', attribute: field }),
  orderAsc: (field: string) => ({ method: 'orderAsc', attribute: field }),
  limit: (limit: number) => ({ method: 'limit', limit }),
  contains: (field: string, values: any[]) => ({ method: 'contains', attribute: field, values }),
  search: (field: string, value: string) => ({ method: 'search', attribute: field, values: [value] })
};