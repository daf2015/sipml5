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
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

// Icons
import { Building2, Users, Phone, Plus, Trash2, Edit, QrCode, LogOut, BarChart3, Settings } from 'lucide-react';

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
            <p className="text-xs text-slate-500">Super Admin: super@admin.com / admin123</p>
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
  const [buildingName, setBuildingName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
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

  const createBuilding = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      await axios.post(`${API}/admin/buildings`, {
        name: buildingName,
        admin_email: adminEmail
      });
      
      toast.success('Edificio creado exitosamente');
      setBuildingName('');
      setAdminEmail('');
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear edificio');
    } finally {
      setCreateLoading(false);
    }
  };

  const deleteBuilding = async (buildingId) => {
    if (!window.confirm('¿Estás seguro de eliminar este edificio?')) return;
    
    try {
      await axios.delete(`${API}/admin/buildings/${buildingId}`);
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
                  <p className="text-2xl font-bold text-gray-900">{dashboard?.total_buildings || 0}</p>
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
                <Phone className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Viviendas</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard?.total_units || 0}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{dashboard?.active_buildings || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Building */}
          <Card>
            <CardHeader>
              <CardTitle>Crear Nuevo Edificio</CardTitle>
              <CardDescription>Agrega un edificio y asigna un administrador</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createBuilding} className="space-y-4">
                <div>
                  <Label htmlFor="buildingName">Nombre del edificio</Label>
                  <Input
                    id="buildingName"
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    placeholder="Edificio Las Torres"
                    required
                  />
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
                <Button type="submit" className="w-full" disabled={createLoading}>
                  {createLoading ? 'Creando...' : 'Crear Edificio'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Buildings List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Edificios ({dashboard?.buildings?.length || 0})</CardTitle>
                <CardDescription>Gestiona todos los edificios del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard?.buildings?.map((building) => (
                    <div key={building.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{building.name}</h3>
                        <p className="text-sm text-gray-500">Admin: {building.admin_email}</p>
                        <p className="text-sm text-gray-500">Slug: {building.slug}</p>
                        <Badge variant={building.is_active ? "default" : "secondary"}>
                          {building.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/b/${building.slug}`, '_blank')}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBuilding(building.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!dashboard?.buildings || dashboard.buildings.length === 0) && (
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

// Building Admin Dashboard
const BuildingAdminDashboard = () => {
  const [buildingData, setBuildingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unitName, setUnitName] = useState('');
  const [unitPhone, setUnitPhone] = useState('');
  const [editingUnit, setEditingUnit] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    fetchBuildingData();
  }, []);

  const fetchBuildingData = async () => {
    try {
      const response = await axios.get(`${API}/buildings/my`);
      setBuildingData(response.data);
    } catch (error) {
      toast.error('Error al cargar datos del edificio');
    } finally {
      setLoading(false);
    }
  };

  const createUnit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      await axios.post(`${API}/buildings/my/units`, {
        name: unitName,
        phone: unitPhone
      });
      
      toast.success('Vivienda agregada exitosamente');
      setUnitName('');
      setUnitPhone('');
      fetchBuildingData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agregar vivienda');
    } finally {
      setCreateLoading(false);
    }
  };

  const updateUnit = async (unitId) => {
    try {
      await axios.put(`${API}/buildings/my/units/${unitId}`, {
        name: editingUnit.name,
        phone: editingUnit.phone
      });
      
      toast.success('Vivienda actualizada');
      setEditingUnit(null);
      fetchBuildingData();
    } catch (error) {
      toast.error('Error al actualizar vivienda');
    }
  };

  const deleteUnit = async (unitId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta vivienda?')) return;
    
    try {
      await axios.delete(`${API}/buildings/my/units/${unitId}`);
      toast.success('Vivienda eliminada');
      fetchBuildingData();
    } catch (error) {
      toast.error('Error al eliminar vivienda');
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
                {buildingData?.building?.name || 'Mi Edificio'}
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
        {/* Building Info */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{buildingData?.building?.name}</h2>
                <p className="text-gray-600">Slug: {buildingData?.building?.slug}</p>
                <p className="text-gray-600">Viviendas: {buildingData?.units?.length || 0}/20</p>
              </div>
              <div className="text-right">
                <Button
                  onClick={() => window.open(buildingData?.qr_url, '_blank')}
                  className="mb-2"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Ver QR Público
                </Button>
                <p className="text-sm text-gray-500">Comparte este enlace con visitantes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Unit */}
          <Card>
            <CardHeader>
              <CardTitle>Agregar Vivienda</CardTitle>
              <CardDescription>
                {(buildingData?.units?.length || 0)}/20 viviendas agregadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createUnit} className="space-y-4">
                <div>
                  <Label htmlFor="unitName">Nombre de la familia/persona</Label>
                  <Input
                    id="unitName"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="Familia García"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unitPhone">Número de teléfono</Label>
                  <Input
                    id="unitPhone"
                    value={unitPhone}
                    onChange={(e) => setUnitPhone(e.target.value)}
                    placeholder="+972501234567"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createLoading || (buildingData?.units?.length || 0) >= 20}
                >
                  {createLoading ? 'Agregando...' : 'Agregar Vivienda'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Units List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Viviendas</CardTitle>
                <CardDescription>Gestiona las viviendas de tu edificio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {buildingData?.units?.map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between p-4 border rounded-lg">
                      {editingUnit?.id === unit.id ? (
                        <div className="flex-1 space-y-2">
                          <Input
                            value={editingUnit.name}
                            onChange={(e) => setEditingUnit({...editingUnit, name: e.target.value})}
                            placeholder="Nombre"
                          />
                          <Input
                            value={editingUnit.phone}
                            onChange={(e) => setEditingUnit({...editingUnit, phone: e.target.value})}
                            placeholder="Teléfono"
                          />
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={() => updateUnit(unit.id)}>
                              Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingUnit(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <h3 className="font-medium">{unit.name}</h3>
                            <p className="text-sm text-gray-500">{unit.phone}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingUnit(unit)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteUnit(unit.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {(!buildingData?.units || buildingData.units.length === 0) && (
                    <p className="text-center text-gray-500 py-8">No hay viviendas agregadas</p>
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

// Public Building View
const PublicBuilding = () => {
  const { slug } = useParams();
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBuilding();
  }, [slug]);

  const fetchBuilding = async () => {
    try {
      const response = await axios.get(`${API}/public/buildings/${slug}`);
      setBuilding(response.data);
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
                {building?.name}
              </CardTitle>
              <CardDescription className="text-lg">
                Selecciona la vivienda que deseas contactar
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4">
            {building?.units?.map((unit) => (
              <Card key={unit.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-800 mb-1">
                        Vivienda
                      </h3>
                      <p className="text-lg text-slate-600">{unit.name}</p>
                    </div>
                    <Button
                      onClick={() => callResident(unit.phone)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg"
                    >
                      <Phone className="h-5 w-5 mr-2" />
                      Llamar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(!building?.units || building.units.length === 0) && (
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
            <Route path="/login" element={<Login />} />
            <Route path="/b/:slug" element={<PublicBuilding />} />
            
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
                <ProtectedRoute requiredRole="building_admin">
                  <BuildingAdminDashboard />
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
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;