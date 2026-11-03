"use client";
import { useRouter } from "next/navigation";
 
export default function LogoutButton() {
  const router = useRouter();
 
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
 
  return (
    <button onClick={logout}
      className="rounded bg-gray-800 px-3 py-2 text-white">
      Se déconnecter
    </button>
  );
}
