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

// Edificio Admin Dashboard
const EdificioAdminDashboard = () => {
  const [edificioData, setEdificioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nombreFamilia, setNombreFamilia] = useState('');
  const [phone, setPhone] = useState('');
  const [publicarNombre, setPublicarNombre] = useState(true);
  const [editingVivienda, setEditingVivienda] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    fetchEdificioData();
  }, []);

  const fetchEdificioData = async () => {
    try {
      const response = await axios.get(`${API}/edificios/my`);
      setEdificioData(response.data);
    } catch (error) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Error al cargar datos del edificio';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createVivienda = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      await axios.post(`${API}/edificios/my/viviendas`, {
        nombre_familia: nombreFamilia,
        phone: phone,
        publicar_nombre: publicarNombre
      });
      
      toast.success('Vivienda agregada exitosamente');
      setNombreFamilia('');
      setPhone('');
      setPublicarNombre(true);
      fetchEdificioData();
    } catch (error) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Error al agregar vivienda';
      toast.error(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  const updateVivienda = async (viviendaId) => {
    try {
      await axios.put(`${API}/edificios/my/viviendas/${viviendaId}`, {
        nombre_familia: editingVivienda.nombre_familia,
        phone: editingVivienda.phone,
        publicar_nombre: editingVivienda.publicar_nombre
      });
      
      toast.success('Vivienda actualizada');
      setEditingVivienda(null);
      fetchEdificioData();
    } catch (error) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Error al actualizar vivienda';
      toast.error(errorMessage);
    }
  };

  const deleteVivienda = async (viviendaId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta vivienda? Los números se reorganizarán automáticamente.')) return;
    
    try {
      await axios.delete(`${API}/edificios/my/viviendas/${viviendaId}`);
      toast.success('Vivienda eliminada y números reorganizados');
      fetchEdificioData();
    } catch (error) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Error al eliminar vivienda';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return <div className="p-8">Cargando datos del edificio...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                {edificioData?.edificio?.nombre || 'Mi Edificio'}
              </h1>
            </div>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Edificio Info */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{edificioData?.edificio?.nombre}</h2>
                <p className="text-gray-600">URL: /{edificioData?.edificio?.slug}</p>
                <p className="text-gray-600">Viviendas: {edificioData?.viviendas?.length || 0}/20</p>
              </div>
              <div className="text-right">
                <Button
                  onClick={() => window.open(edificioData?.url_publica, '_blank')}
                  className="mb-2"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Ver Página Pública
                </Button>
                <p className="text-sm text-gray-500">Comparte este enlace con visitantes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Vivienda */}
          <Card>
            <CardHeader>
              <CardTitle>Agregar Vivienda</CardTitle>
              <CardDescription>
                {(edificioData?.viviendas?.length || 0)}/20 viviendas agregadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createVivienda} className="space-y-4">
                <div>
                  <Label htmlFor="nombreFamilia">Nombre de la familia/persona</Label>
                  <Input
                    id="nombreFamilia"
                    value={nombreFamilia}
                    onChange={(e) => setNombreFamilia(e.target.value)}
                    placeholder="Familia García"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Número de teléfono</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+972501234567"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="publicarNombre"
                    checked={publicarNombre}
                    onCheckedChange={setPublicarNombre}
                  />
                  <Label htmlFor="publicarNombre" className="text-sm">
                    Publicar nombre en el intercomunicador
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  Si no publicas el nombre, aparecerá como "Residente" en la vista pública
                </p>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createLoading || (edificioData?.viviendas?.length || 0) >= 20}
                >
                  {createLoading ? 'Agregando...' : 'Agregar Vivienda'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Viviendas List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Viviendas ({edificioData?.viviendas?.length || 0}/{edificioData?.edificio?.cantidad_viviendas || 20})</CardTitle>
                <CardDescription>Gestiona las viviendas de tu edificio</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Vista Gráfica de Viviendas */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Vista Gráfica del Edificio</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {Array.from({length: edificioData?.edificio?.cantidad_viviendas || 20}, (_, index) => {
                      const numeroVivienda = index + 1;
                      const vivienda = edificioData?.viviendas?.find(v => v.numero === numeroVivienda);
                      const isOccupied = !!vivienda;
                      
                      return (
                        <div
                          key={numeroVivienda}
                          className={`
                            relative p-4 border-2 rounded-lg cursor-pointer transition-all
                            ${isOccupied 
                              ? 'bg-green-100 border-green-300 hover:bg-green-200' 
                              : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                            }
                          `}
                          onClick={() => {
                            if (vivienda) {
                              setEditingVivienda(vivienda);
                            } else {
                              // Auto-llenar formulario con este número
                              setNombreFamilia('');
                              setPhone('');
                              setPublicarNombre(true);
                            }
                          }}
                        >
                          <div className="text-center">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold
                              ${isOccupied ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}
                            `}>
                              {numeroVivienda}
                            </div>
                            <div className="text-xs">
                              {isOccupied ? (
                                <div>
                                  <div className="font-medium truncate" title={vivienda.nombre_familia}>
                                    {vivienda.nombre_familia}
                                  </div>
                                  <Badge variant={vivienda.publicar_nombre ? "default" : "secondary"} className="text-xs mt-1">
                                    {vivienda.publicar_nombre ? 'Público' : 'Privado'}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-gray-500">Vacía</span>
                              )}
                            </div>
                          </div>
                          
                          {isOccupied && (
                            <div className="absolute top-1 right-1">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Ocupada</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span>Vacía</span>
                    </div>
                  </div>
                </div>

                {/* Lista Detallada */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Lista Detallada</h4>
                  <div className="space-y-3">
                    {edificioData?.viviendas?.map((vivienda) => (
                      <div key={vivienda.id} className="flex items-center justify-between p-4 border rounded-lg">
                        {editingVivienda?.id === vivienda.id ? (
                          <div className="flex-1 space-y-2">
                            <Input
                              value={editingVivienda.nombre_familia}
                              onChange={(e) => setEditingVivienda({...editingVivienda, nombre_familia: e.target.value})}
                              placeholder="Nombre de familia"
                            />
                            <Input
                              value={editingVivienda.phone}
                              onChange={(e) => setEditingVivienda({...editingVivienda, phone: e.target.value})}
                              placeholder="Teléfono"
                            />
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={editingVivienda.publicar_nombre}
                                onCheckedChange={(checked) => setEditingVivienda({...editingVivienda, publicar_nombre: checked})}
                              />
                              <Label className="text-sm">Publicar nombre</Label>
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={() => updateVivienda(vivienda.id)}>
                                Guardar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingVivienda(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">#{vivienda.numero}</Badge>
                                <h3 className="font-medium">{vivienda.nombre_familia}</h3>
                              </div>
                              <p className="text-sm text-gray-500">{vivienda.phone}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant={vivienda.publicar_nombre ? "default" : "secondary"}>
                                  {vivienda.publicar_nombre ? 'Público' : 'Privado'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingVivienda(vivienda)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteVivienda(vivienda.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {(!edificioData?.viviendas || edificioData.viviendas.length === 0) && (
                      <p className="text-center text-gray-500 py-8">No hay viviendas agregadas</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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