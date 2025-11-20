export interface Paginated<T> {
  data: T[];
  meta: {
    itemsPerPage: number;
    totalItems: number;
    currentPage: number;
    totalPages: number;
  };
  // links: {
  //   first?: number;
  //   previous?: number;
  //   current: number;
  //   next?: number;
  //   last?: number;
  // };
}
