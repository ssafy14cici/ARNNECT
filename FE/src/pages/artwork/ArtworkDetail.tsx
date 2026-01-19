import { useParams } from "react-router-dom";
export default function ArtworkDetail() {
  const { id } = useParams();
  return <div>Artwork Detail: {id}</div>;
}
