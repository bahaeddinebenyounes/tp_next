import { z } from "zod";
 
export const registerSchema = z.object({
  name: z.string().trim()
    .min(2, "Nom : 2 caractères minimum"),
  email: z.string().trim().toLowerCase()
    .email("Email invalide"),
  password: z.string()
    .min(8, "Mot de passe : 8 caractères minimum"),
});
 
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase()
    .email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
export const updateStudentAdminSchema = z
  .object({
    name: registerSchema.shape.name.optional(),
    email: registerSchema.shape.email.optional(),
    password: registerSchema.shape.password.optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, "Aucun champ à modifier");

export const updateStudentTeacherSchema = z
  .object({
    name: registerSchema.shape.name,
  })
  .strict();