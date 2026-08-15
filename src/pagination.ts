export async function collectPages<T>(
  fetchPage: (page: number, perPage: number) => Promise<T[]>,
  perPage = 100
): Promise<T[]> {
  const all: T[] = [];

  for (let page = 1; ; page += 1) {
    const items = await fetchPage(page, perPage);
    all.push(...items);

    if (items.length < perPage) {
      return all;
    }
  }
}
