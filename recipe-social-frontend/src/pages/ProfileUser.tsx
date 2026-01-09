import { useParams } from "react-router-dom";

export default function ProfileUser() {
  const { userId } = useParams();
  return (
    <div className="card">
      <h2>User Profile</h2>
      <p className="muted">userId: {userId}</p>
    </div>
  );
}
