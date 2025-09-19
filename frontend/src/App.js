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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Alert, AlertDescription } from './components/ui/alert';
import { Checkbox } from './components/ui/checkbox';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

// Icons
import { Building2, Users, Phone, Plus, Trash2, Edit, QrCode, LogOut, Home, Copy, ExternalLink } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Sistema Intercomunicador</CardTitle>
          <CardDescription className="text-gray-600">Accede a tu panel de control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11"
                required
              />
            </div>
            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
          
          <div className="p-4 bg-slate-50 rounded-lg border">
            <p className="text-sm text-slate-600 mb-2 font-medium">Credenciales de prueba:</p>
            <div className="space-y-1 text-xs text-slate-500">
              <p><strong>Super Admin:</strong> diegofridman@gmail.com / tangotango</p>
              <p><strong>Admin Edificio:</strong> diego@daf-il.net / tangotango</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Super Admin Dashboard - ESTÉTICO Y MODERNO
const SuperAdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edificioNombre, setEdificioNombre] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [cantidadViviendas, setCantidadViviendas] = useState(20);
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
      setCantidadViviendas(20);
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear edificio');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Super Admin</h1>
                <p className="text-sm text-gray-500">Panel de control general</p>
              </div>
            </div>
            <Button variant="outline" onClick={logout} className="border-gray-300">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Edificios</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboard?.total_edificios || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Administradores</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboard?.total_admins || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Viviendas</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboard?.total_viviendas || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Home className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Llamadas</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboard?.total_llamadas || 0}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Phone className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Crear Edificio */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Crear Edificio</CardTitle>
              <CardDescription>Agregar un nuevo edificio al sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={createEdificio} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nombre del edificio</Label>
                  <Input
                    value={edificioNombre}
                    onChange={(e) => setEdificioNombre(e.target.value)}
                    placeholder="Torre Residencial"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nombre del administrador</Label>
                  <Input
                    value={adminNombre}
                    onChange={(e) => setAdminNombre(e.target.value)}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email del administrador</Label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@edificio.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Cantidad de viviendas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={cantidadViviendas}
                    onChange={(e) => setCantidadViviendas(parseInt(e.target.value))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={createLoading}>
                  {createLoading ? 'Creando...' : 'Crear Edificio'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Edificios */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-sm border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Edificios ({dashboard?.edificios_recientes?.length || 0})</CardTitle>
                <CardDescription>Lista de edificios en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard?.edificios_recientes?.map((edificio) => (
                    <div key={edificio.id} className="flex items-center justify-between p-4 rounded-lg border bg-slate-50">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{edificio.nombre}</h4>
                        <p className="text-sm text-gray-500">Admin: {edificio.admin_nombre || 'Sin nombre'}</p>
                        <p className="text-sm text-gray-500">Email: {edificio.admin_email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={edificio.is_active ? "default" : "secondary"}>
                            {edificio.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                          <Badge variant="outline">
                            {edificio.cantidad_viviendas} viviendas
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/${edificio.slug}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!dashboard?.edificios_recientes || dashboard.edificios_recientes.length === 0) && (
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No hay edificios creados</p>
                    </div>
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

// Edificio Admin Dashboard - REDISEÑO ESTÉTICO BASADO EN REFERENCIAS
const EdificioAdminDashboard = () => {
  const [edificioData, setEdificioData] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [edificioNombre, setEdificioNombre] = useState('');
  const [slugPersonalizado, setSlugPersonalizado] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [cantidadViviendas, setCantidadViviendas] = useState(20);
  const [slugStatus, setSlugStatus] = useState({ available: null, suggestions: [] });
  const [createLoading, setCreateLoading] = useState(false);
  
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
      if (error.response?.status === 400 || error.response?.data?.message === "No tienes edificios asignados") {
        setShowCreateForm(true);
      } else {
        toast.error('Error al cargar datos del edificio');
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
      toast.error(error.response?.data?.detail || 'Error al crear edificio');
    } finally {
      setCreateLoading(false);
    }
  };

  const updateViviendaData = async (numeroVivienda, data) => {
    try {
      const existingVivienda = edificioData?.viviendas?.find(v => v.numero === numeroVivienda);
      
      if (existingVivienda) {
        await axios.put(`${API}/edificios/my/viviendas/${existingVivienda.id}`, data);
        toast.success('Vivienda actualizada');
      } else {
        await axios.post(`${API}/edificios/my/viviendas`, data);
        toast.success('Vivienda agregada');
      }
      
      fetchEdificioData();
      setSelectedVivienda(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar vivienda');
    }
  };

  const deleteVivienda = async (viviendaId) => {
    try {
      await axios.delete(`${API}/edificios/my/viviendas/${viviendaId}`);
      toast.success('Vivienda eliminada');
      fetchEdificioData();
    } catch (error) {
      toast.error('Error al eliminar vivienda');
    }
  };

  const deleteEdificio = async () => {
    if (!edificioData?.edificio?.id) {
      toast.error('No hay edificio para eliminar');
      return;
    }

    const confirmMessage = `¿Estás seguro de eliminar el edificio "${edificioData.edificio.nombre}"?\n\nEsto eliminará:\n• El edificio completo\n• Todas las viviendas (${edificioData.viviendas?.length || 0})\n• El enlace público\n\nEsta acción no se puede deshacer.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await axios.delete(`${API}/edificios/my/${edificioData.edificio.id}`);
        toast.success('Edificio eliminado exitosamente');
        setEdificioData(null);
        setShowCreateForm(true);
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Error al eliminar edificio');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Formulario de creación ESTÉTICO
  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-xl border-0 bg-white">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Crear Tu Edificio</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Configura tu intercomunicador en pocos pasos
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={createEdificio} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Tu nombre completo</Label>
                <Input
                  value={adminNombre}
                  onChange={(e) => setAdminNombre(e.target.value)}
                  placeholder="Juan Pérez García"
                  className="h-11"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Nombre del edificio</Label>
                <Input
                  value={edificioNombre}
                  onChange={(e) => setEdificioNombre(e.target.value)}
                  placeholder="Torre Residencial Las Flores"
                  className="h-11"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Nombre para el link</Label>
                <Input
                  value={slugPersonalizado}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setSlugPersonalizado(value);
                    if (value.length >= 3) checkSlugAvailability(value);
                  }}
                  placeholder="torres-flores"
                  className="h-11"
                  required
                />
                <p className="text-xs text-gray-500">
                  Tu link será: <span className="font-medium text-blue-600">intercum.com/{slugPersonalizado}</span>
                </p>
                {slugStatus.message && (
                  <p className={`text-xs ${slugStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                    {slugStatus.message}
                  </p>
                )}
                {slugStatus.suggestions && slugStatus.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">Sugerencias disponibles:</p>
                    <div className="flex flex-wrap gap-2">
                      {slugStatus.suggestions.map(suggestion => (
                        <Button
                          key={suggestion}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
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
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Cantidad de viviendas</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={cantidadViviendas}
                  onChange={(e) => setCantidadViviendas(parseInt(e.target.value))}
                  className="h-11"
                  required
                />
                <p className="text-xs text-gray-500">Entre 1 y 100 viviendas</p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-medium" 
                disabled={createLoading || !slugStatus.available}
              >
                {createLoading ? 'Creando edificio...' : 'Crear Mi Edificio'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard principal ESTÉTICO BASADO EN REFERENCIAS
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header simple */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-medium text-gray-900">{edificioData?.edificio?.nombre}</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => {
                  const url = `${window.location.origin}/${edificioData?.edificio?.slug}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Link copiado');
                }}
                variant="outline"
                size="sm"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiar Link
              </Button>
              
              <Button
                onClick={() => window.open(`/${edificioData?.edificio?.slug}`, '_blank')}
                variant="outline"
                size="sm"
                className="text-blue-600"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver Público
              </Button>
              
              <Button
                onClick={deleteEdificio}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
              
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Estadísticas elegantes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{edificioData?.edificio?.cantidad_viviendas || 0}</p>
              <p className="text-sm text-gray-600">Total Viviendas</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Home className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{edificioData?.viviendas?.length || 0}</p>
              <p className="text-sm text-gray-600">Ocupadas</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Home className="h-6 w-6 text-gray-500" />
              </div>
              <p className="text-2xl font-bold text-gray-600">
                {(edificioData?.edificio?.cantidad_viviendas || 0) - (edificioData?.viviendas?.length || 0)}
              </p>
              <p className="text-sm text-gray-600">Disponibles</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <QrCode className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-purple-600">Link Público</p>
              <p className="text-xs text-gray-500">Listo para compartir</p>
            </CardContent>
          </Card>
        </div>

        {/* Grid de viviendas ESTÉTICO - COMO LAS REFERENCIAS */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader className="border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Unidades - {edificioData?.edificio?.nombre}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Haz clic en cualquier vivienda para gestionarla
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-slate-50">
                {edificioData?.viviendas?.length || 0} / {edificioData?.edificio?.cantidad_viviendas || 0}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-4">
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
                    {/* Vivienda card ESTÉTICA - IGUAL A LAS REFERENCIAS */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-200">
                      <div className="text-center">
                        {/* Ícono de casita */}
                        <div className="mx-auto mb-3 w-8 h-8 flex items-center justify-center">
                          <Home className="h-6 w-6 text-gray-600" />
                        </div>
                        
                        {/* Texto "Vivienda X" */}
                        <div className="text-xs font-medium text-gray-700 mb-2">
                          Vivienda {numeroVivienda}
                        </div>
                        
                        {/* Información */}
                        <div className="text-xs space-y-1">
                          {isOccupied ? (
                            <>
                              <div className="font-medium text-gray-800 truncate" title={vivienda.nombre_familia}>
                                {vivienda.nombre_familia.length > 12 
                                  ? vivienda.nombre_familia.substring(0, 12) + '...' 
                                  : vivienda.nombre_familia}
                              </div>
                              <div className="text-gray-500">
                                {vivienda.phone}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">Sin contacto</span>
                          )}
                        </div>
                      </div>
                      
                      {/* PUNTO VERDE - IGUAL QUE EN REFERENCIAS */}
                      {isOccupied && (
                        <div className="absolute top-2 right-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Leyenda */}
            <div className="mt-8 flex justify-center">
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Con contacto</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span>Sin contacto</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Modal ESTÉTICO */}
        {selectedVivienda && (
          <Dialog open={!!selectedVivienda} onOpenChange={() => setSelectedVivienda(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Home className="h-5 w-5 text-blue-600" />
                  <span>Vivienda #{selectedVivienda}</span>
                </DialogTitle>
                <DialogDescription>
                  {edificioData?.viviendas?.find(v => v.numero === selectedVivienda) 
                    ? 'Edita la información de contacto'
                    : 'Agrega información de contacto'
                  }
                </DialogDescription>
              </DialogHeader>
              <ViviendaEditForm 
                numeroVivienda={selectedVivienda}
                vivienda={edificioData?.viviendas?.find(v => v.numero === selectedVivienda)}
                onSave={updateViviendaData}
                onDelete={deleteVivienda}
                onCancel={() => setSelectedVivienda(null)}
              />
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

// Formulario de edición ESTÉTICO
const ViviendaEditForm = ({ numeroVivienda, vivienda, onSave, onDelete, onCancel }) => {
  const [nombre, setNombre] = useState(vivienda?.nombre_familia || '');
  const [telefono, setTelefono] = useState(vivienda?.phone || '');
  const [publicar, setPublicar] = useState(vivienda?.publicar_nombre ?? true);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!nombre.trim() || !telefono.trim()) {
      toast.error('Completa todos los campos');
      return;
    }
    
    // Auto-agregar + si no está presente
    let phoneNumber = telefono.trim();
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+' + phoneNumber;
    }

    setLoading(true);
    try {
      await onSave(numeroVivienda, {
        nombre_familia: nombre.trim(),
        phone: phoneNumber,
        publicar_nombre: publicar
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vivienda) return;
    
    if (window.confirm(`¿Eliminar contacto de vivienda ${numeroVivienda}?`)) {
      await onDelete(vivienda.id);
      onCancel();
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Nombre de la familia</Label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Familia García"
          className="h-11"
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Número de teléfono</Label>
        <Input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="972501234567 o +972501234567"
          className="h-11"
        />
      </div>
      
      <div className="flex items-center space-x-3">
        <Checkbox
          checked={publicar}
          onCheckedChange={setPublicar}
        />
        <Label className="text-sm text-gray-700">
          Mostrar nombre públicamente
        </Label>
      </div>
      
      <div className="flex space-x-2 pt-2">
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
          className="border-gray-300"
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

// Public Edificio View - ESTÉTICO
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
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Cargando intercomunicador...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Edificio no encontrado</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
              Intentar de nuevo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header estético */}
          <Card className="mb-8 shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                  {edificio?.nombre}
                </CardTitle>
                <CardDescription className="text-lg text-gray-600">
                  Selecciona la vivienda que deseas contactar
                </CardDescription>
              </div>
            </CardHeader>
          </Card>

          {/* Lista de viviendas estética */}
          <div className="space-y-4">
            {edificio?.viviendas?.map((vivienda) => (
              <Card 
                key={vivienda.id} 
                className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/90 backdrop-blur-sm group"
                onClick={() => callResident(vivienda.phone)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Home className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Vivienda #{vivienda.numero}
                          </h3>
                          <p className="text-gray-600">{vivienda.nombre_familia}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg shadow-lg group-hover:shadow-xl transition-all duration-300"
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
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin contactos disponibles</h3>
                <p className="text-gray-600">No hay viviendas con información de contacto en este edificio.</p>
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
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
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
            {/* Public routes */}
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
            
            {/* Public edificio route */}
            <Route path="/:slug" element={<PublicEdificio />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;