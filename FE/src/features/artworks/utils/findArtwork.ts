// FE\src\features\artwork\utils\findArtwork.ts

export type ArtworkIdLike = string | number;

export type HasId = { readonly id: ArtworkIdLike };

export function findById<T extends HasId>(list: readonly T[], id?: string) {
  if (!id) return null;
  const urlId = String(id);

  return (
    list.find((item) => {
      const itemId = String(item.id);
      if (itemId === urlId || itemId === `a${urlId}` || itemId.replace("a", "") === urlId.replace("a", "")) return true;

      const nu = parseInt(urlId.replace("a", ""), 10);
      const ni = parseInt(itemId.replace("a", ""), 10);
      if (Number.isNaN(nu) || Number.isNaN(ni)) return false;

      if (nu >= 1000) return ni === nu - 999;
      return false;
    }) || null
  );
}
