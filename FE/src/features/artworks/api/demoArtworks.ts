// Portfolio demo fallback images for frontend-only deployment.
// These are used when backend artwork image data is unavailable.
export const demoArtworkImages = [
  "/demo-artworks/artwork-01.jpg",
  "/demo-artworks/artwork-02.jpg",
  "/demo-artworks/artwork-03.jpg",
  "/demo-artworks/artwork-04.jpg",
  "/demo-artworks/artwork-05.jpg",
  "/demo-artworks/artwork-06.jpg",
] as const;

export function getDemoArtworkImage(index: number): string {
  return demoArtworkImages[index % demoArtworkImages.length];
}
