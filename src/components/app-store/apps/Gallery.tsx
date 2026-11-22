import { useState } from "react";

type GalleryImage = { name: string; url: string };

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const addImages = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).filter((file) => file.type.startsWith("image/")).map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setImages((current) => [...current, ...next]);
  };

  return (
    <section className="tap-mini-app tap-gallery">
      <div className="tap-mini-heading"><div><h2>Gallery</h2><p>Select images from your computer to preview them here.</p></div><label className="tap-gallery-add">Add images<input type="file" accept="image/*" multiple onChange={(event) => addImages(event.target.files)} /></label></div>
      {images.length === 0 ? <div className="tap-gallery-empty">Your selected images will appear here.</div> : <div className="tap-gallery-grid">{images.map((image, index) => <figure key={`${image.name}-${index}`}><img src={image.url} alt={image.name} /><figcaption>{image.name}</figcaption></figure>)}</div>}
    </section>
  );
}
