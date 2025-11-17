import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import UsersList from "@/components/admin/UsersList";
import AddProductForm from "@/components/admin/AddProductForm";
import ProductsManagement from "@/components/admin/ProductsManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, [navigate]);

  const checkAdmin = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error("Требуется авторизация");
        navigate("/auth");
        return;
      }

      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        toast.error("Требуется авторизация");
        navigate("/auth");
        return;
      }

      const user = await response.json();
      
      const rolesResponse = await fetch(
        `http://localhost:3001/api/users/${user.id}/roles`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!rolesResponse.ok) {
        toast.error("Доступ запрещен");
        navigate("/");
        return;
      }

      const roles = await rolesResponse.json();
      const hasAdmin = roles.some((r: any) => r.role === 'admin');

      if (!hasAdmin) {
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