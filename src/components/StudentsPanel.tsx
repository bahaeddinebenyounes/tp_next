"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "ADMIN" | "ENSEIGNANT" | "ETUDIANT";
type Student = { id: number; name: string; email: string; createdAt: string };

const emptyForm = { name: "", email: "", password: "" };

export default function StudentsPanel({ role }: { role: Role }) {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  // Ces booleens servent uniquement à l'UX : le serveur re-vérifie tout.
  const canCreate = role === "ADMIN";
  const canEdit = role === "ADMIN" || role === "ENSEIGNANT";
  const canDelete = role === "ADMIN";

  async function request(url: string, init?: RequestInit) {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
    const data = res.status === 204 ? null : await res.json().catch(() => null);

    if (res.status === 401) {
      router.push("/login");
      throw new Error("Session expirée (401). Veuillez vous reconnecter.");
    }
    if (res.status === 403) {
      throw new Error(
        "Accès interdit (403) : vous n'avez pas le droit d'effectuer cette action."
      );
    }
    if (!res.ok) throw new Error(data?.error ?? "Erreur inattendue");
    return data;
  }

  const load = useCallback(async () => {
    try {
      setError(null);
      setStudents(await request("/api/students"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      await request("/api/students", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      setCreateForm(emptyForm);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function startEdit(s: Student) {
    setEditingId(s.id);
    setEditForm({ name: s.name, email: s.email, password: "" });
  }

  async function handleSave(id: number) {
    // L'enseignant n'envoie que le nom ; l'admin peut tout modifier.
    const payload: Record<string, string> = { name: editForm.name };
    if (role === "ADMIN") {
      payload.email = editForm.email;
      if (editForm.password) payload.password = editForm.password;
    }
    try {
      setError(null);
      await request(`/api/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(s: Student) {
    if (!confirm(`Supprimer ${s.name} ?`)) return;
    try {
      setError(null);
      await request(`/api/students/${s.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const input = "rounded border px-2 py-1 text-sm";
  const btn = "rounded border px-2 py-1 text-sm hover:bg-gray-100";

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">
        {role === "ETUDIANT" ? "Mon profil" : "Liste des étudiants"}
      </h2>

      {error && (
        <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {canCreate && (
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2 rounded border p-3">
          <input className={input} placeholder="Nom" required value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          <input className={input} type="email" placeholder="Email" required value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
          <input className={input} type="password" placeholder="Mot de passe (8+)" required value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
          <button className={btn} type="submit">Créer</button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun étudiant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2">Nom</th>
                <th className="p-2">Email</th>
                <th className="p-2">Inscrit le</th>
                {(canEdit || canDelete) && <th className="p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t">
                  {editingId === s.id ? (
                    <>
                      <td className="p-2">
                        <input className={input} value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      </td>
                      <td className="p-2">
                        {role === "ADMIN" ? (
                          <div className="flex flex-col gap-1">
                            <input className={input} type="email" value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                            <input className={input} type="password" placeholder="Nouveau mot de passe (optionnel)"
                              value={editForm.password}
                              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                          </div>
                        ) : (
                          s.email
                        )}
                      </td>
                      <td className="p-2">{new Date(s.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="flex gap-2 p-2">
                        <button className={btn} onClick={() => handleSave(s.id)}>Enregistrer</button>
                        <button className={btn} onClick={() => setEditingId(null)}>Annuler</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2">{s.name}</td>
                      <td className="p-2">{s.email}</td>
                      <td className="p-2">{new Date(s.createdAt).toLocaleDateString("fr-FR")}</td>
                      {(canEdit || canDelete) && (
                        <td className="flex gap-2 p-2">
                          {canEdit && <button className={btn} onClick={() => startEdit(s)}>Modifier</button>}
                          {canDelete && <button className={btn} onClick={() => handleDelete(s)}>Supprimer</button>}
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}