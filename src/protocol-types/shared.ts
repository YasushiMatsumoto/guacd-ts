type CamelCase<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S;

export type CamelizeKeys<T> = T extends readonly unknown[]
  ? { [I in keyof T]: CamelizeKeys<T[I]> }
  : T extends object
    ? {
        [K in keyof T as K extends string ? CamelCase<K> : K]: CamelizeKeys<T[K]>;
      }
    : T;
