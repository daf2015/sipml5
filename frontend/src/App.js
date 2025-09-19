import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import Shadcn UI components
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Alert, AlertDescription } from './components/ui/alert';
import { Checkbox } from './components/ui/checkbox';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

// Icons
import { Building2, Users, Phone, Plus, Trash2, Edit, QrCode, LogOut, BarChart3, Settings, Home } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Login Component
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = await login(email, password);
      toast.success('Inicio de sesión exitoso');
      
      if (user.role === 'super_admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-800">Sistema Intercomunicador</CardTitle>
          <CardDescription>Iniciar sesión en tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">Credenciales de prueba:</p>
            <p className="text-xs text-slate-500">Super Admin: diegofridman@gmail.com / tangotango</p>
            <p className="text-xs text-slate-500">Admin Edificio: diego@daf-il.net / tangotango</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Super Admin Dashboard
const SuperAdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edificioNombre, setEdificioNombre] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [cantidadViviendas, setCantidadViviendas] = useState(5);
  const [createLoading, setCreateLoading] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/admin/dashboard`);
      setDashboard(response.data);
    } catch (error) {
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const createEdificio = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      await axios.post(`${API}/admin/edificios`, {
        nombre: edificioNombre,
        admin_email: adminEmail,
        admin_nombre: adminNombre,
        cantidad_viviendas: cantidadViviendas
      });
      
      toast.success('Edificio creado exitosamente');
      setEdificioNombre('');
      setAdminEmail('');
      setAdminNombre('');
      setCantidadViviendas(5);
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear edificio');
    } finally {
      setCreateLoading(false);
    }
  };

  const deleteEdificio = async (edificioId) => {
    if (!window.confirm('¿Estás seguro de eliminar este edificio?')) return;
    
    try {
      await axios.delete(`${API}/admin/edificios/${edificioId}`);
      toast.success('Edificio eliminado');
      fetchDashboard();
    } catch (error) {
      toast.error('Error al eliminar edificio');
    }
  };

  if (loading) {
    return <div className="p-8">Cargando dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Super Admin Dashboard</h1>
            </div>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Edificios</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard?.total_edificios || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Administradores</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard?.total_admins || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Home className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Viviendas</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard?.total_viviendas || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Edificios Activos</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard?.edificios_activos || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Edificio */}
          <Card>
            <CardHeader>
              <CardTitle>Crear Nuevo Edificio</CardTitle>
              <CardDescription>Agrega un edificio y asigna un administrador</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createEdificio} className="space-y-4">
                <div>
                  <Label htmlFor="edificioNombre">Nombre del edificio</Label>
                  <Input
                    id="edificioNombre"
                    value={edificioNombre}
                    onChange={(e) => setEdificioNombre(e.target.value)}
                    placeholder="Edificio Las Torres (min. 3 caracteres)"
                    required
                    minLength={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Este nombre se convertirá en la URL: www.xxxx.com/nombre-edificio
                  </p>
                </div>
                <div>
                  <Label htmlFor="adminNombre">Nombre completo del administrador</Label>
                  <Input
                    id="adminNombre"
                    value={adminNombre}
                    onChange={(e) => setAdminNombre(e.target.value)}
                    placeholder="Juan Pérez García"
                    required
                    minLength={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Para registro, facturación y comunicaciones
                  </p>
                </div>
                <div>
                  <Label htmlFor="adminEmail">Email del administrador</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@edificio.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cantidadViviendas">Cantidad de viviendas</Label>
                  <Input
                    id="cantidadViviendas"
                    type="number"
                    min="1"
                    max="20"
                    value={cantidadViviendas}
                    onChange={(e) => setCantidadViviendas(parseInt(e.target.value))}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Entre 1 y 20 viviendas por edificio
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={createLoading}>
                  {createLoading ? 'Creando...' : 'Crear Edificio'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Edificios List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Edificios ({dashboard?.edificios?.length || 0})</CardTitle>
                <CardDescription>Gestiona todos los edificios del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard?.edificios?.map((edificio) => (
                    <div key={edificio.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{edificio.nombre}</h3>
                        <p className="text-sm text-gray-500">Admin: {edificio.admin_nombre || 'Sin nombre'} ({edificio.admin_email})</p>
                        <p className="text-sm text-gray-500">URL: /{edificio.slug}</p>
                        <p className="text-sm text-gray-500">Viviendas planificadas: {edificio.cantidad_viviendas || 0}</p>
                        <Badge variant={edificio.is_active ? "default" : "secondary"}>
                          {edificio.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/${edificio.slug}`, '_blank')}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteEdificio(edificio.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!dashboard?.edificios || dashboard.edificios.length === 0) && (
                    <p className="text-center text-gray-500 py-8">No hay edificios creados</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

// Componente SIMPLE para editar vivienda
const ViviendaEditFormSimple = ({ numeroVivienda, vivienda, onSave, onDelete, onCancel }) => {
  const [nombre, setNombre] = useState(vivienda?.nombre_familia || '');
  const [telefono, setTelefono] = useState(vivienda?.phone || '');
  const [publicar, setPublicar] = useState(vivienda?.publicar_nombre ?? true);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!nombre.trim() || !telefono.trim()) {
      toast.error('Completa todos los campos');
      return;
    }
    
    if (!telefono.startsWith('+')) {
      toast.error('El número debe empezar con +');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        nombre_familia: nombre.trim(),
        phone: telefono.trim(),
        publicar_nombre: publicar
      });
      toast.success('Vivienda guardada');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vivienda) return;
    
    if (window.confirm(`¿Eliminar vivienda ${numeroVivienda}?`)) {
      await onDelete(vivienda.id);
      toast.success('Vivienda eliminada');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Nombre de la familia</Label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Familia García"
          className="mt-1"
        />
      </div>
      
      <div>
        <Label className="text-sm font-medium">Teléfono</Label>
        <Input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="+972501234567"
          className="mt-1"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={publicar}
          onCheckedChange={setPublicar}
        />
        <Label className="text-sm">Mostrar nombre públicamente</Label>
      </div>
      
      <div className="flex space-x-2 pt-2">
        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
        
        <Button 
          onClick={onCancel}
          variant="outline"
        >
          Cancelar
        </Button>
        
        {vivienda && (
          <Button 
            onClick={handleDelete}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
const ViviendaEditForm = ({ numeroVivienda, vivienda, onSave, onDelete, onCancel }) => {
  const [nombre, setNombre] = useState(vivienda?.nombre_familia || '');
  const [telefono, setTelefono] = useState(vivienda?.phone || '');
  const [publicar, setPublicar] = useState(vivienda?.publicar_nombre ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    
    if (!nombre.trim()) {
      setError('El nombre de la familia es requerido');
      return;
    }
    
    if (!telefono.trim()) {
      setError('El número de teléfono es requerido');
      return;
    }
    
    if (!telefono.startsWith('+')) {
      setError('El número debe empezar con +');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        nombre_familia: nombre.trim(),
        phone: telefono.trim(),
        publicar_nombre: publicar
      });
      // No cerramos aquí, lo hace el padre
    } catch (error) {
      setError('Error al guardar vivienda');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vivienda) return;
    
    if (window.confirm('¿Estás seguro de eliminar esta vivienda?')) {
      await onDelete(vivienda.id);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div>
        <Label htmlFor="nombre" className="text-sm font-medium">
          Nombre de la familia
        </Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Familia García"
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="telefono" className="text-sm font-medium">
          Número de teléfono
        </Label>
        <Input
          id="telefono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="+972501234567"
          className="mt-1"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="publicar"
          checked={publicar}
          onCheckedChange={setPublicar}
        />
        <Label htmlFor="publicar" className="text-sm">
          Publicar nombre en el intercomunicador
        </Label>
      </div>
      
      <div className="flex space-x-2 pt-4">
        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
        
        <Button 
          onClick={onCancel}
          variant="outline"
          className="px-6"
        >
          Cancelar
        </Button>
        
        {vivienda && (
          <Button 
            onClick={handleDelete}
            variant="destructive"
            className="px-4"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Edificio Admin Dashboard - NUEVA VERSIÓN MODERNA
const EdificioAdminDashboard = () => {
  const [edificioData, setEdificioData] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Formulario creación edificio
  const [edificioNombre, setEdificioNombre] = useState('');
  const [slugPersonalizado, setSlugPersonalizado] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [cantidadViviendas, setCantidadViviendas] = useState(10);
  const [slugStatus, setSlugStatus] = useState({ available: null, suggestions: [] });
  const [createLoading, setCreateLoading] = useState(false);
  
  // Gestión viviendas
  const [nombreFamilia, setNombreFamilia] = useState('');
  const [phone, setPhone] = useState('');
  const [publicarNombre, setPublicarNombre] = useState(true);
  const [editingVivienda, setEditingVivienda] = useState(null);
  const [selectedVivienda, setSelectedVivienda] = useState(null);
  
  const { logout } = useAuth();

  useEffect(() => {
    fetchEdificioData();
  }, []);

  const fetchEdificioData = async () => {
    try {
      const response = await axios.get(`${API}/edificios/my`);
      setEdificioData(response.data);
      setShowCreateForm(false);
    } catch (error) {
      if (error.response?.status === 400) {
        // Usuario no tiene edificio, mostrar formulario de creación
        setShowCreateForm(true);
      } else {
        const errorMessage = typeof error.response?.data?.detail === 'string' 
          ? error.response.data.detail 
          : 'Error al cargar datos del edificio';
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkSlugAvailability = async (slug) => {
    if (slug.length < 3) {
      setSlugStatus({ available: false, message: 'Mínimo 3 caracteres', suggestions: [] });
      return;
    }
    
    try {
      const response = await axios.get(`${API}/edificios/check-slug/${slug}`);
      setSlugStatus(response.data);
    } catch (error) {
      setSlugStatus({ available: false, message: 'Error al verificar', suggestions: [] });
    }
  };

  const createEdificio = async (e) => {
    e.preventDefault();
    if (!slugStatus.available) {
      toast.error('El nombre del link no está disponible');
      return;
    }
    
    setCreateLoading(true);
    
    try {
      await axios.post(`${API}/edificios/create-my`, {
        nombre: edificioNombre,
        slug_personalizado: slugPersonalizado,
        admin_nombre: adminNombre,
        cantidad_viviendas: cantidadViviendas
      });
      
      toast.success('¡Edificio creado exitosamente!');
      fetchEdificioData();
    } catch (error) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Error al crear edificio';
      toast.error(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  const updateViviendaData = async (numeroVivienda, data) => {
    try {
      const existingVivienda = edificioData?.viviendas?.find(v => v.numero === numeroVivienda);
      
      if (existingVivienda) {
        // Actualizar vivienda existente
        await axios.put(`${API}/edificios/my/viviendas/${existingVivienda.id}`, data);
        toast.success('Vivienda actualizada');
      } else {
        // Crear nueva vivienda
        await axios.post(`${API}/edificios/my/viviendas`, data);
        toast.success('Vivienda agregada');
      }
      
      fetchEdificioData();
      setSelectedVivienda(null);
    } catch (error) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Error al guardar vivienda';
      toast.error(errorMessage);
    }
  };

  const deleteVivienda = async (viviendaId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta vivienda?')) return;
    
    try {
      await axios.delete(`${API}/edificios/my/viviendas/${viviendaId}`);
      toast.success('Vivienda eliminada');
      fetchEdificioData();
    } catch (error) {
      toast.error('Error al eliminar vivienda');
    }
  };

  const deleteEdificio = async () => {
    try {
      // Eliminar el edificio actual del admin
      if (edificioData?.edificio?.id) {
        await axios.delete(`${API}/edificios/my/${edificioData.edificio.id}`);
        toast.success('Edificio eliminado exitosamente');
        
        // Logout después de eliminar el edificio
        setTimeout(() => {
          logout();
        }, 1500);
      }
    } catch (error) {
      toast.error('Error al eliminar edificio');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-indigo-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  // Formulario de creación SIMPLE
  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl flex items-center justify-center">
              <Building2 className="mr-2 h-5 w-5 text-blue-600" />
              Crear Mi Edificio
            </CardTitle>
            <CardDescription>
              Configura tu intercomunicador en 3 pasos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createEdificio} className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Tu nombre completo</Label>
                <Input
                  value={adminNombre}
                  onChange={(e) => setAdminNombre(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Nombre del edificio</Label>
                <Input
                  value={edificioNombre}
                  onChange={(e) => setEdificioNombre(e.target.value)}
                  placeholder="Edificio Las Torres"
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Nombre para el link</Label>
                <Input
                  value={slugPersonalizado}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setSlugPersonalizado(value);
                    if (value.length >= 3) checkSlugAvailability(value);
                  }}
                  placeholder="torres123"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tu link: <strong>intercum.com/{slugPersonalizado}</strong>
                </p>
                {slugStatus.message && (
                  <p className={`text-xs mt-1 ${slugStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                    {slugStatus.message}
                  </p>
                )}
                {slugStatus.suggestions && slugStatus.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Sugerencias:</p>
                    <div className="flex gap-1 mt-1">
                      {slugStatus.suggestions.map(suggestion => (
                        <Button
                          key={suggestion}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1"
                          onClick={() => {
                            setSlugPersonalizado(suggestion);
                            checkSlugAvailability(suggestion);
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <Label className="text-sm font-medium">Cantidad de viviendas</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={cantidadViviendas}
                  onChange={(e) => setCantidadViviendas(parseInt(e.target.value))}
                  required
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Entre 1 y 100 viviendas</p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={createLoading || !slugStatus.available}
              >
                {createLoading ? 'Creando...' : 'Crear Edificio'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard principal SIMPLIFICADO - FÁCIL Y SIMPLE
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simple */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {edificioData?.edificio?.nombre}
                </h1>
                <p className="text-sm text-gray-500">
                  Admin: {edificioData?.edificio?.admin_nombre}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => window.open(edificioData?.url_publica, '_blank')}
                size="sm"
                variant="outline"
              >
                <QrCode className="h-4 w-4 mr-1" />
                Ver Público
              </Button>
              
              <Button 
                size="sm"
                variant="ghost"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Estadísticas Compactas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{edificioData?.edificio?.cantidad_viviendas || 0}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{edificioData?.viviendas?.length || 0}</p>
              <p className="text-sm text-gray-600">Ocupadas</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-500">
                {(edificioData?.edificio?.cantidad_viviendas || 0) - (edificioData?.viviendas?.length || 0)}
              </p>
              <p className="text-sm text-gray-600">Libres</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-center">
              <Button
                onClick={() => {
                  const url = `intercum.com/${edificioData?.edificio?.slug}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Link copiado!');
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Copiar Link
              </Button>
            </div>
          </div>
        </div>

        {/* Grid de Viviendas - MÁS COMPACTO */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Viviendas del Edificio</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {edificioData?.viviendas?.length || 0} / {edificioData?.edificio?.cantidad_viviendas || 0}
                </Badge>
                <Button
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de eliminar este edificio? Se perderán todos los datos.')) {
                      deleteEdificio();
                    }
                  }}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar Edificio
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {Array.from({length: edificioData?.edificio?.cantidad_viviendas || 20}, (_, index) => {
                const numeroVivienda = index + 1;
                const vivienda = edificioData?.viviendas?.find(v => v.numero === numeroVivienda);
                const isOccupied = !!vivienda;
                
                return (
                  <div
                    key={numeroVivienda}
                    className="relative cursor-pointer group"
                    onClick={() => setSelectedVivienda(numeroVivienda)}
                  >
                    {/* Vivienda Compacta */}
                    <div className={`
                      p-2 rounded-lg border-2 text-center transition-all
                      ${isOccupied 
                        ? 'bg-green-50 border-green-300 hover:bg-green-100' 
                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                      }
                    `}>
                      {/* Número */}
                      <div className={`
                        text-xs font-bold mb-1
                        ${isOccupied ? 'text-green-800' : 'text-gray-600'}
                      `}>
                        {numeroVivienda}
                      </div>
                      
                      {/* Info Mínima */}
                      <div className="text-xs">
                        {isOccupied ? (
                          <div className="space-y-1">
                            <div className="font-medium truncate text-gray-800" title={vivienda.nombre_familia}>
                              {vivienda.nombre_familia.length > 6 
                                ? vivienda.nombre_familia.substring(0, 6) + '...' 
                                : vivienda.nombre_familia}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">---</span>
                        )}
                      </div>
                      
                      {/* Punto Verde */}
                      {isOccupied && (
                        <div className="absolute -top-1 -right-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Leyenda Simple */}
            <div className="mt-4 flex justify-center space-x-4 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Ocupada</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span>Libre</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Modal Simplificado */}
        {selectedVivienda && (
          <Dialog open={!!selectedVivienda} onOpenChange={() => setSelectedVivienda(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Home className="mr-2 h-4 w-4 text-blue-600" />
                  Vivienda #{selectedVivienda}
                </DialogTitle>
              </DialogHeader>
              <ViviendaEditFormSimple 
                numeroVivienda={selectedVivienda}
                vivienda={edificioData?.viviendas?.find(v => v.numero === selectedVivienda)}
                onSave={async (data) => {
                  try {
                    await updateViviendaData(selectedVivienda, data);
                    setSelectedVivienda(null);
                  } catch (error) {
                    // Error handling
                  }
                }}
                onDelete={(viviendaId) => {
                  deleteVivienda(viviendaId);
                  setSelectedVivienda(null);
                }}
                onCancel={() => setSelectedVivienda(null)}
              />
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

// Public Edificio View
const PublicEdificio = () => {
  const { slug } = useParams();
  const [edificio, setEdificio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEdificio();
  }, [slug]);

  const fetchEdificio = async () => {
    try {
      const response = await axios.get(`${API}/public/edificios/${slug}`);
      setEdificio(response.data);
    } catch (error) {
      setError('Edificio no encontrado');
    } finally {
      setLoading(false);
    }
  };

  const callResident = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>Cargando información del edificio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Intentar de nuevo</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="mb-6">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-slate-800 mb-2">
                {edificio?.nombre}
              </CardTitle>
              <CardDescription className="text-lg">
                Selecciona la vivienda que deseas contactar
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4">
            {edificio?.viviendas?.map((vivienda) => (
              <Card key={vivienda.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          Vivienda #{vivienda.numero}
                        </Badge>
                      </div>
                      <p className="text-lg text-slate-600 font-medium">{vivienda.nombre_familia}</p>
                    </div>
                    <Button
                      onClick={() => callResident(vivienda.phone)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg call-button"
                    >
                      <Phone className="h-5 w-5 mr-2" />
                      Llamar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(!edificio?.viviendas || edificio.viviendas.length === 0) && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-600">No hay viviendas disponibles en este edificio.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'super_admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes - NO authentication required */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected admin routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredRole="edificio_admin">
                  <EdificioAdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Navigate to={localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).role === 'super_admin' ? '/admin' : '/dashboard'} replace />
                </ProtectedRoute>
              } 
            />
            
            {/* Public edificio route - MUST be last to avoid conflicts */}
            <Route path="/:slug" element={<PublicEdificio />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;