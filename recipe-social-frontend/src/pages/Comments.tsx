import { useParams } from "react-router-dom";

export default function Comments() {
  const { id } = useParams();
  return (
    <div className="card">
      <h2>Comments</h2>
      <p className="muted">postId: {id}</p>
    </div>
  );
}
