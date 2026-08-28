import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  useUsuariosPerfis,
  useUsuariosRoles,
  useTornarAdmin,
  useRemoverAdmin,
  useRemoverPerfil,
  type Profile,
} from "@/hooks/useUsuarios";
import { useAdmin } from "@/hooks/useAdmin";
import { Navigate } from "react-router-dom";
import { Users, Shield, ShieldOff, Trash2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

export default function Usuarios() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; profile: Profile | null }>({
    open: false,
    profile: null,
  });

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (rolesRes.data) setRoles(rolesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const getUserRole = (userId: string) => {
    return roles.find((r) => r.user_id === userId)?.role || "user";
  };

  const toggleAdmin = async (profile: Profile) => {
    const currentRole = getUserRole(profile.user_id);
    if (currentRole === "admin") {
      // Remove admin role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", profile.user_id)
        .eq("role", "admin");
      if (error) {
        toast.error("Erro ao remover permissão de admin.");
      } else {
        toast.success(`${profile.nome} não é mais admin.`);
        fetchData();
      }
    } else {
      // Add admin role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.user_id, role: "admin" } as any);
      if (error) {
        toast.error("Erro ao adicionar permissão de admin.");
      } else {
        toast.success(`${profile.nome} agora é admin.`);
        fetchData();
      }
    }
  };

  const deleteUser = async () => {
    if (!deleteDialog.profile) return;
    // We can't delete auth.users from client, but we can remove the profile
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", deleteDialog.profile.user_id);
    
    if (error) {
      toast.error("Erro ao remover usuário. Verifique as permissões.");
    } else {
      toast.success("Perfil do usuário removido.");
      fetchData();
    }
    setDeleteDialog({ open: false, profile: null });
  };

  if (adminLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredProfiles = profiles.filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Gerenciar Usuários</h1>
            <p className="mt-1 text-muted-foreground">
              {profiles.length} usuário{profiles.length !== 1 ? "s" : ""} cadastrado{profiles.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isMobile ? (
            <div className="divide-y divide-border">
              {filteredProfiles.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</div>
              ) : (
                filteredProfiles.map((profile) => {
                  const role = getUserRole(profile.user_id);
                  const isSelf = currentUser?.id === profile.user_id;
                  return (
                    <div key={profile.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{profile.nome}</p>
                          <p className="text-sm text-muted-foreground">{profile.email || "—"}</p>
                        </div>
                        <Badge variant={role === "admin" ? "default" : "secondary"}>
                          {role === "admin" ? "Admin" : "Usuário"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Cadastro: {format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => toggleAdmin(profile)} disabled={isSelf} title={role === "admin" ? "Remover admin" : "Tornar admin"}>
                            {role === "admin" ? <ShieldOff className="h-4 w-4 text-warning" /> : <Shield className="h-4 w-4 text-primary" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, profile })} disabled={isSelf} title="Remover usuário">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfiles.map((profile) => {
                    const role = getUserRole(profile.user_id);
                    const isSelf = currentUser?.id === profile.user_id;
                    return (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.nome}</TableCell>
                        <TableCell>{profile.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={role === "admin" ? "default" : "secondary"}>
                            {role === "admin" ? "Admin" : "Usuário"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => toggleAdmin(profile)} disabled={isSelf} title={role === "admin" ? "Remover admin" : "Tornar admin"}>
                              {role === "admin" ? <ShieldOff className="h-4 w-4 text-warning" /> : <Shield className="h-4 w-4 text-primary" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, profile })} disabled={isSelf} title="Remover usuário">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, profile: open ? deleteDialog.profile : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o perfil de <strong>{deleteDialog.profile?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
