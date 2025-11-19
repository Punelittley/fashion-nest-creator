import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import UsersList from "@/components/admin/UsersList";
import AddProductForm from "@/components/admin/AddProductForm";
import ProductsManagement from "@/components/admin/ProductsManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { roleApi } from "@/lib/api";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, [navigate]);

  const checkAdmin = async () => {
    try {
      // Сначала проверяем локальный токен SQLite
      const token = localStorage.getItem('auth_token');
      if (token && token !== 'supabase') {
        const response = await roleApi.checkAdmin();
        if (!response.isAdmin) {
          toast.error("Доступ запрещен");
          navigate("/");
          return;
        }
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      // Fallback на Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Требуется авторизация");
        navigate("/auth");
        return;
      }

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      if (error || !roles || roles.length === 0) {
        toast.error("Доступ запрещен");
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      toast.error("Ошибка проверки прав доступа");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isAdmin) {
    return (
      <Layout>
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          Проверка прав доступа...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: "4rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "500",
          marginBottom: "3rem",
          color: "hsl(var(--foreground))"
        }}>
          Админ-панель
        </h1>
        
        <Tabs defaultValue="users" style={{ width: "100%" }}>
          <TabsList style={{
            marginBottom: "2rem",
            backgroundColor: "hsl(var(--muted))",
            padding: "0.25rem",
            borderRadius: "8px"
          }}>
            <TabsTrigger value="users" style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem"
            }}>
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="add-product" style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem"
            }}>
              Добавить товар
            </TabsTrigger>
            <TabsTrigger value="manage-products" style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem"
            }}>
              Управление товарами
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <UsersList />
          </TabsContent>
          
          <TabsContent value="add-product">
            <AddProductForm />
          </TabsContent>
          
          <TabsContent value="manage-products">
            <ProductsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;