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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

// Icons
import { Building2, Users, Phone, Plus, Trash2, Edit, QrCode, LogOut, Home, Copy, ExternalLink, Settings, Calendar, Clock, Filter, ArrowLeft, Download, Upload } from 'lucide-react';

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
  // Modal states removed - now using CDR page
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

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

  // fetchDetallesLlamadas removed - now using CDR page

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
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Error al crear edificio';
      toast.error(errorMessage);
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
                  <button 
                    onClick={() => navigate('/admin/cdr')}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Detalles
                  </button>
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
                          variant="default"
                          size="sm"
                          onClick={() => {
                            console.log('Navegando a edificio:', edificio.id);
                            window.location.href = `/dashboard?edificio=${edificio.id}`;
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Gestionar
                        </Button>
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
        {/* Modal eliminado - ahora redirige a página CDR */}
      </main>
    </div>
  );
};

// CDR (Call Detail Records) Page
const CDRPage = () => {
  const [cdrs, setCdrs] = useState([]);
  const [stats, setStats] = useState(null);
  const [edificiosSummary, setEdificiosSummary] = useState([]);
  const [edificios, setEdificios] = useState([]);
  const [viviendas, setViviendas] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [selectedEdificio, setSelectedEdificio] = useState('');
  const [selectedVivienda, setSelectedVivienda] = useState('');
  const [selectedFamilia, setSelectedFamilia] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showEdificiosSummary, setShowEdificiosSummary] = useState(true);
  const navigate = useNavigate();

  const fetchCDRStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/cdr/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas CDR');
    }
  };

  const fetchEdificiosSummary = async (fechaDesdeParam = '', fechaHastaParam = '') => {
    try {
      const params = new URLSearchParams();
      if (fechaDesdeParam) params.append('fecha_desde', fechaDesdeParam);
      if (fechaHastaParam) params.append('fecha_hasta', fechaHastaParam);
      
      const response = await axios.get(`${API}/admin/cdr/edificios-summary?${params}`);
      setEdificiosSummary(response.data.edificios_summary || []);
    } catch (error) {
      toast.error('Error al cargar resumen de edificios');
    }
  };

  const fetchCDRData = async (filters = {}, pageNum = 0) => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: (pageNum * 50).toString()
      });
      
      if (filters.edificio_id) params.append('edificio_id', filters.edificio_id);
      if (filters.vivienda_numero) params.append('vivienda_numero', filters.vivienda_numero);
      if (filters.familia_nombre) params.append('familia_nombre', filters.familia_nombre);
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);

      const response = await axios.get(`${API}/admin/cdr?${params}`);
      const data = response.data;
      
      if (pageNum === 0) {
        setCdrs(data.cdrs);
      } else {
        setCdrs(prev => [...prev, ...data.cdrs]);
      }
      
      setHasMore(data.has_more);
      setEdificios(data.edificios_disponibles || []);
      setViviendas(data.viviendas_disponibles || []);
      setFamilias(data.familias_disponibles || []);
    } catch (error) {
      toast.error('Error al cargar registros CDR');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCDRStats(), fetchCDRData(), fetchEdificiosSummary()]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  const getCurrentFilters = () => ({
    edificio_id: selectedEdificio || undefined,
    vivienda_numero: selectedVivienda || undefined,
    familia_nombre: selectedFamilia || undefined,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined
  });

  const applyFilters = () => {
    setPage(0);
    fetchCDRData(getCurrentFilters(), 0);
    // También actualizar resumen de edificios con los mismos filtros de fecha
    fetchEdificiosSummary(fechaDesde, fechaHasta);
  };

  const clearFilters = () => {
    setSelectedEdificio('');
    setSelectedVivienda('');
    setSelectedFamilia('');
    setFechaDesde('');
    setFechaHasta('');
    setPage(0);
    fetchCDRData({}, 0);
    fetchEdificiosSummary();
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCDRData(getCurrentFilters(), nextPage);
  };

  const downloadCSV = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ formato: 'csv' });
      const filters = getCurrentFilters();
      
      if (filters.edificio_id) params.append('edificio_id', filters.edificio_id);
      if (filters.vivienda_numero) params.append('vivienda_numero', filters.vivienda_numero);
      if (filters.familia_nombre) params.append('familia_nombre', filters.familia_nombre);
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);

      const response = await axios.get(`${API}/admin/cdr?${params}`, {
        responseType: 'blob'
      });

      // Crear descarga
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fechaStr = new Date().toISOString().split('T')[0];
      link.download = `cdr_report_${fechaStr}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Reporte CSV descargado exitosamente');
    } catch (error) {
      toast.error('Error al descargar el reporte CSV');
    } finally {
      setDownloading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <Phone className="h-6 w-6 text-blue-600" />
                  <span>CDR - Detalles de Llamadas</span>
                </h1>
                <p className="text-sm text-gray-600">Registro detallado de llamadas por edificio y vivienda</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Último mes</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Llamadas Este Mes</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.total_llamadas_mes}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Histórico</p>
                    <p className="text-3xl font-bold text-green-600">{stats.total_llamadas_historico}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Edificios Activos</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.edificios_activos}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resumen por Edificios */}
        {edificiosSummary.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Resumen por Edificios</span>
                </div>
                <Button
                  onClick={() => setShowEdificiosSummary(!showEdificiosSummary)}
                  variant="ghost"
                  size="sm"
                >
                  {showEdificiosSummary ? 'Ocultar' : 'Mostrar'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showEdificiosSummary && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {edificiosSummary.map((edificio, index) => (
                    <div
                      key={edificio.edificio_id}
                      className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedEdificio(edificio.edificio_id);
                        applyFilters();
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{edificio.edificio_nombre}</h4>
                            <p className="text-xs text-gray-500">{edificio.admin_email}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-lg font-bold text-blue-600">{edificio.total_llamadas}</p>
                          <p className="text-xs text-gray-600">Llamadas</p>
                        </div>
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-lg font-bold text-green-600">{edificio.viviendas_activas}</p>
                          <p className="text-xs text-gray-600">Viviendas Activas</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t border-blue-200">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Ocupación:</span>
                          <span className="font-semibold">{edificio.ocupacion_porcentaje}%</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span>Total Viviendas:</span>
                          <span>{edificio.total_viviendas}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-center">
                        <Badge variant="outline" className="text-xs">
                          Click para filtrar
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                {edificiosSummary.length === 0 && (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No hay edificios con llamadas en el período seleccionado</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filtros Avanzados</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={downloadCSV} 
                  disabled={downloading}
                  variant="outline" 
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>{downloading ? 'Descargando...' : 'Descargar CSV'}</span>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
              {/* Filtro de Edificio */}
              <div>
                <Label>Edificio</Label>
                <Select value={selectedEdificio || "all"} onValueChange={(value) => setSelectedEdificio(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los edificios</SelectItem>
                    {edificios.map((edificio) => (
                      <SelectItem key={edificio.id} value={edificio.id}>
                        {edificio.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Vivienda */}
              <div>
                <Label>Vivienda</Label>
                <Select value={selectedVivienda || "all"} onValueChange={(value) => setSelectedVivienda(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las viviendas</SelectItem>
                    {viviendas.map((vivienda) => (
                      <SelectItem key={vivienda} value={vivienda.toString()}>
                        Vivienda {vivienda}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Familia */}
              <div>
                <Label>Familia</Label>
                <Select value={selectedFamilia || "all"} onValueChange={(value) => setSelectedFamilia(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las familias</SelectItem>
                    {familias.map((familia) => (
                      <SelectItem key={familia} value={familia}>
                        {familia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Fecha Desde */}
              <div>
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Filtro Fecha Hasta */}
              <div>
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center space-x-2">
              <Button onClick={applyFilters} className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Aplicar Filtros</span>
              </Button>
              <Button onClick={clearFilters} variant="outline" className="flex items-center space-x-2">
                <span>Limpiar Filtros</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla CDR */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Registro de Llamadas</span>
              <Badge variant="secondary">{cdrs.length} registros</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cdrs.length === 0 ? (
              <div className="text-center py-8">
                <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay registros de llamadas para mostrar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Vivienda</TableHead>
                      <TableHead>Familia</TableHead>
                      <TableHead>Edificio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cdrs.map((cdr) => {
                      const { date, time } = formatDateTime(cdr.call_timestamp);
                      return (
                        <TableRow key={cdr.id}>
                          <TableCell className="font-medium">{date}</TableCell>
                          <TableCell>{time}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              Vivienda {cdr.vivienda_numero}
                            </Badge>
                          </TableCell>
                          <TableCell>{cdr.vivienda_nombre_familia}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {cdr.edificio_nombre}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <Button onClick={loadMore} variant="outline">
                      Cargar más registros
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Detectar si es super admin gestionando un edificio específico
  const urlParams = new URLSearchParams(window.location.search);
  const edificioIdFromUrl = urlParams.get('edificio');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdminManaging = user.role === 'super_admin' && edificioIdFromUrl;

  useEffect(() => {
    fetchEdificioData();
  }, []);

  const fetchEdificioData = async () => {
    try {
      let response;
      if (isSuperAdminManaging) {
        // Super admin gestionando edificio específico
        response = await axios.get(`${API}/admin/edificios/${edificioIdFromUrl}`);
      } else {
        // Admin normal
        response = await axios.get(`${API}/edificios/my`);
      }
      setEdificioData(response.data);
      setShowCreateForm(false);
    } catch (error) {
      if (error.response?.status === 400 || error.response?.data?.message === "No tienes edificios asignados") {
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
      console.log('Guardando vivienda:', { numeroVivienda, data });
      const existingVivienda = edificioData?.viviendas?.find(v => v.numero === numeroVivienda);
      
      if (existingVivienda) {
        console.log('Actualizando vivienda existente:', existingVivienda.id);
        
        if (isSuperAdminManaging) {
          await axios.put(`${API}/admin/viviendas/${existingVivienda.id}`, data);
        } else {
          await axios.put(`${API}/edificios/my/viviendas/${existingVivienda.id}`, data);
        }
        toast.success('Vivienda actualizada');
      } else {
        console.log('Creando nueva vivienda');
        
        if (isSuperAdminManaging) {
          await axios.post(`${API}/admin/edificios/${edificioIdFromUrl}/viviendas`, data);
        } else {
          await axios.post(`${API}/edificios/my/viviendas`, data);
        }
        toast.success('Vivienda agregada');
      }
      
      fetchEdificioData();
      setSelectedVivienda(null);
    } catch (error) {
      console.error('Error al guardar vivienda:', error);
      console.error('Response:', error.response?.data);
      
      let errorMessage = 'Error al guardar vivienda';
      
      if (error.response?.status === 400) {
        const detail = error.response.data?.detail || '';
        if (detail.includes('Límite máximo') || detail.includes('limite')) {
          errorMessage = 'Has llegado al límite máximo de viviendas para este edificio';
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const deleteVivienda = async (viviendaId) => {
    try {
      if (isSuperAdminManaging) {
        await axios.delete(`${API}/admin/viviendas/${viviendaId}`);
      } else {
        await axios.delete(`${API}/edificios/my/viviendas/${viviendaId}`);
      }
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
        const errorMessage = typeof error.response?.data?.detail === 'string' 
          ? error.response.data.detail 
          : 'Error al eliminar edificio';
        toast.error(errorMessage);
      }
    }
  };

  const cambiarCantidadViviendas = async (cambio) => {
    const cantidadActual = edificioData?.edificio?.cantidad_viviendas || 0;
    const nuevaCantidad = cantidadActual + cambio;
    const viviendasOcupadas = edificioData?.viviendas?.length || 0;
    
    // Validaciones simples
    if (nuevaCantidad < 1 || nuevaCantidad > 50) {
      toast.error('La cantidad debe estar entre 1 y 50');
      return;
    }
    
    if (nuevaCantidad < viviendasOcupadas) {
      toast.error(`No puedes reducir a ${nuevaCantidad} porque tienes ${viviendasOcupadas} viviendas ocupadas`);
      return;
    }

    try {
      const requestData = { cantidad_viviendas: nuevaCantidad };
      
      if (isSuperAdminManaging) {
        await axios.put(`${API}/admin/edificios/${edificioIdFromUrl}/cantidad-viviendas`, requestData);
      } else {
        await axios.put(`${API}/edificios/my/cantidad-viviendas`, requestData);
      }
      
      toast.success(`${cambio > 0 ? 'Agregadas' : 'Eliminadas'} ${Math.abs(cambio)} vivienda${Math.abs(cambio) !== 1 ? 's' : ''}`);
      fetchEdificioData();
    } catch (error) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Error al actualizar cantidad';
      toast.error(errorMessage);
    }
  };

  const guardarNombre = async () => {
    if (!nuevoNombre.trim() || nuevoNombre.trim() === edificioData?.edificio?.nombre) {
      setEditandoNombre(false);
      setNuevoNombre('');
      return;
    }

    try {
      const requestData = { nombre: nuevoNombre.trim() };
      
      if (isSuperAdminManaging) {
        await axios.put(`${API}/admin/edificios/${edificioIdFromUrl}/nombre`, requestData);
      } else {
        await axios.put(`${API}/edificios/my/nombre`, requestData);
      }
      
      toast.success('Nombre del edificio actualizado');
      setEditandoNombre(false);
      setNuevoNombre('');
      fetchEdificioData();
    } catch (error) {
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Error al actualizar nombre';
      toast.error(errorMessage);
      setEditandoNombre(false);
      setNuevoNombre('');
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

  // Dashboard MODERNO con SIDEBAR RESPONSIVE
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-100 flex flex-col lg:flex-row">
      {/* SIDEBAR - Compacto en móvil */}
      <div className="w-full lg:w-80 bg-white shadow-sm border-b lg:border-r lg:border-b-0">
        <div className="p-4 lg:p-6">
          {/* Info del Admin - MÓVIL COMPACTO */}
          <div className="mb-4 lg:mb-8">
            <div className="flex items-center space-x-3 mb-3 lg:mb-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 
                  className="text-sm lg:text-lg font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600" 
                  onClick={() => {
                    setNuevoNombre(edificioData?.edificio?.nombre || '');
                    setEditandoNombre(true);
                  }}
                  title="Haz clic para editar el nombre"
                >
                  {editandoNombre ? (
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      onBlur={guardarNombre}
                      onKeyPress={(e) => e.key === 'Enter' && guardarNombre()}
                      className="bg-white border border-blue-300 rounded px-2 py-1 text-sm lg:text-lg font-bold w-full"
                      autoFocus
                    />
                  ) : (
                    edificioData?.edificio?.nombre
                  )}
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  {isSuperAdminManaging ? `Gestionando como Super Admin` : edificioData?.edificio?.admin_nombre}
                </p>
              </div>
            </div>
            
            {/* Estadísticas COMPACTAS - MÓVIL */}
            <div className="grid grid-cols-2 gap-2 lg:gap-4 mb-3 lg:mb-6">
              <div className="bg-blue-50 p-2 lg:p-4 rounded-xl text-center">
                <p className="text-lg lg:text-2xl font-bold text-blue-600">{edificioData?.edificio?.cantidad_viviendas || 0}</p>
                <p className="text-xs text-blue-600">Total</p>
                
                {/* Botones simples +/- */}
                <div className="flex justify-center gap-1 mt-2">
                  <button 
                    onClick={() => cambiarCantidadViviendas(-1)}
                    className="bg-red-500 text-white rounded px-2 py-1 text-xs hover:bg-red-600"
                    disabled={edificioData?.edificio?.cantidad_viviendas <= (edificioData?.viviendas?.length || 0)}
                  >
                    -1
                  </button>
                  <button 
                    onClick={() => cambiarCantidadViviendas(1)}
                    className="bg-green-500 text-white rounded px-2 py-1 text-xs hover:bg-green-600"
                  >
                    +1
                  </button>
                  <button 
                    onClick={() => cambiarCantidadViviendas(2)}
                    className="bg-green-500 text-white rounded px-2 py-1 text-xs hover:bg-green-600"
                  >
                    +2
                  </button>
                </div>
              </div>
              <div className="bg-green-50 p-2 lg:p-4 rounded-xl text-center">
                <p className="text-lg lg:text-2xl font-bold text-green-600">{edificioData?.viviendas?.length || 0}</p>
                <p className="text-xs text-green-600">Ocupadas</p>
              </div>
            </div>
          </div>

          {/* Funciones MÓVIL COMPACTAS */}
          <div className="flex lg:flex-col gap-2 lg:gap-3 lg:space-y-0">
            <Button
              onClick={() => {
                const url = `${window.location.origin}/${edificioData?.edificio?.slug}`;
                navigator.clipboard.writeText(url);
                toast.success('Link copiado');
              }}
              className="flex-1 lg:w-full justify-center lg:justify-start bg-blue-600 hover:bg-blue-700 text-white text-xs lg:text-base h-8 lg:h-auto rounded-lg lg:rounded-xl"
            >
              <Copy className="h-3 w-3 lg:h-4 lg:w-4 mr-0 lg:mr-3" />
              <span className="hidden lg:inline">Copiar Link Público</span>
            </Button>
            
            <Button
              onClick={() => window.open(`/${edificioData?.edificio?.slug}`, '_blank')}
              variant="outline"
              className="flex-1 lg:w-full justify-center lg:justify-start text-xs lg:text-base h-8 lg:h-auto rounded-lg lg:rounded-xl"
            >
              <ExternalLink className="h-3 w-3 lg:h-4 lg:w-4 mr-0 lg:mr-3" />
              <span className="hidden lg:inline">Ver Página Pública</span>
            </Button>
            
            <Button
              onClick={deleteEdificio}
              className="flex-1 lg:w-full justify-center lg:justify-start bg-red-600 hover:bg-red-700 text-white text-xs lg:text-base h-8 lg:h-auto rounded-lg lg:rounded-xl"
            >
              <Trash2 className="h-3 w-3 lg:h-4 lg:w-4 mr-0 lg:mr-3" />
              <span className="hidden lg:inline">Eliminar Edificio</span>
            </Button>
            
            <div className="hidden lg:block pt-4 border-t border-gray-200 w-full space-y-2">
              {isSuperAdminManaging && (
                <Button
                  onClick={() => navigate('/admin')}
                  variant="outline"
                  className="w-full justify-start text-gray-600 hover:text-gray-800 hover:bg-gray-100 text-sm lg:text-base rounded-xl"
                >
                  <Building2 className="h-4 w-4 mr-3" />
                  Volver a Panel Super Admin
                </Button>
              )}
              <Button
                onClick={logout}
                variant="ghost"
                className="w-full justify-start text-gray-600 hover:text-gray-800 hover:bg-gray-100 text-sm lg:text-base rounded-xl"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL - Casitas MÓVIL */}
      <div className="flex-1 p-4 lg:p-6">
        <div className="mb-4 lg:mb-8">
          <h1 className="text-xl lg:text-3xl font-bold text-gray-900 mb-1 lg:mb-3">Gestión de Viviendas</h1>
          <p className="text-sm lg:text-base text-gray-500">Toca cualquier vivienda para editarla</p>
        </div>

        {/* Grid de Viviendas MODERNO - Como las referencias */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg border-0 p-6 lg:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8">
            {Array.from({length: edificioData?.edificio?.cantidad_viviendas || 12}, (_, index) => {
              const numeroVivienda = index + 1;
              const vivienda = edificioData?.viviendas?.find(v => v.numero === numeroVivienda);
              const isOccupied = !!vivienda;
              
              return (
                <div
                  key={numeroVivienda}
                  className="relative cursor-pointer group transform transition-all duration-300 hover:scale-105"
                  onClick={() => setSelectedVivienda(numeroVivienda)}
                >
                  <div className={`
                    rounded-3xl p-6 text-center shadow-lg border-0 min-h-[140px] lg:min-h-[160px] flex flex-col justify-center relative overflow-hidden
                    ${isOccupied 
                      ? 'bg-white shadow-green-200/50 hover:shadow-green-300/60' 
                      : 'bg-white/80 hover:bg-white shadow-gray-200/50 hover:shadow-gray-300/60'
                    }
                  `}>
                    
                    {/* Fondo decorativo */}
                    <div className={`absolute inset-0 opacity-5 ${isOccupied ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                    
                    {/* Ícono de casa moderno */}
                    <div className="mb-3 relative z-10">
                      <div className={`
                        w-12 h-12 lg:w-16 lg:h-16 mx-auto rounded-2xl flex items-center justify-center
                        ${isOccupied 
                          ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-200' 
                          : 'bg-gradient-to-br from-gray-300 to-gray-500 shadow-lg shadow-gray-200'
                        }
                      `}>
                        <Home className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                      </div>
                    </div>
                    
                    {/* Título "Vivienda X" */}
                    <div className="text-lg lg:text-xl font-bold text-gray-900 mb-2 relative z-10">
                      Vivienda {numeroVivienda}
                    </div>
                    
                    {/* Nombre de familia o "Libre" */}
                    <div className="text-sm lg:text-base relative z-10">
                      {isOccupied ? (
                        <div className="font-medium text-gray-700 leading-tight px-2">
                          {vivienda.nombre_familia}
                        </div>
                      ) : (
                        <div className="text-gray-500 font-medium">Libre</div>
                      )}
                    </div>
                    
                    {/* Indicator dot */}
                    {isOccupied && (
                      <div className="absolute top-3 right-3 z-20">
                        <div className="w-4 h-4 bg-green-500 rounded-full border-3 border-white shadow-lg animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Leyenda MODERNA */}
          <div className="mt-8 lg:mt-10 flex justify-center space-x-8 text-sm lg:text-base">
            <div className="flex items-center space-x-3 bg-white/70 rounded-full px-4 py-2 shadow-sm">
              <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-sm"></div>
              <span className="text-gray-700 font-medium">Ocupada</span>
            </div>
            <div className="flex items-center space-x-3 bg-white/70 rounded-full px-4 py-2 shadow-sm">
              <div className="w-4 h-4 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-sm"></div>
              <span className="text-gray-700 font-medium">Libre</span>
            </div>
          </div>
        </div>
        
        {/* Modal MODERNO Y RESPONSIVE */}
        {selectedVivienda && (
          <Dialog open={!!selectedVivienda} onOpenChange={() => setSelectedVivienda(null)}>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2 text-lg">
                  <Home className="h-5 w-5 text-blue-600" />
                  <span>Vivienda {selectedVivienda}</span>
                </DialogTitle>
                <DialogDescription className="text-sm">
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

        {/* Modal eliminado - ahora usamos botones simples */}
      </div>
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

    setLoading(true);
    try {
      await onSave(numeroVivienda, {
        nombre_familia: nombre.trim(),
        phone: telefono.trim(), // Sin validaciones - acepta cualquier formato
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
    <div className="space-y-4 lg:space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Nombre de la familia</Label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Familia García"
          className="h-10 lg:h-11 text-base"
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Número de teléfono</Label>
        <Input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Ej: +1234567890, ext.123, https://wa.me/123456"
          className="h-10 lg:h-11 text-base"
          type="text"
        />
        <p className="text-xs text-gray-500">Cualquier formato: números, extensiones, URLs, etc.</p>
      </div>
      
      <div className="flex items-center space-x-3 py-2">
        <Checkbox
          checked={publicar}
          onCheckedChange={setPublicar}
        />
        <Label className="text-sm text-gray-700">
          Mostrar nombre públicamente
        </Label>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 h-10 lg:h-11"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
        
        <Button 
          onClick={onCancel}
          variant="outline"
          className="border-gray-300 h-10 lg:h-11"
        >
          Cancelar
        </Button>
        
        {vivienda && (
          <Button 
            onClick={handleDelete}
            variant="destructive"
            className="h-10 lg:h-11"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Eliminar</span>
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

  // Vista pública EXACTA como referencia
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 shadow-xl border-0 bg-white">
          <CardContent className="p-8 text-center">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Edificio no encontrado</h2>
            <p className="text-gray-600">Este enlace no corresponde a ningún edificio activo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 to-purple-600 p-4">
      {/* Header EXACTO como referencia */}
      <header className="text-center mb-8">
        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-white text-lg font-medium mb-2">Intercomunicador Digital</h1>
        <h2 className="text-white text-3xl font-bold mb-4">{edificio?.nombre}</h2>
        <p className="text-white/80 text-lg">Selecciona la vivienda que deseas contactar</p>
      </header>

      {/* Grid EXACTO como referencia */}
      <main className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {edificio?.viviendas?.map((vivienda) => (
            <div
              key={vivienda.numero}
              className="bg-white rounded-2xl p-4 text-center shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={async () => {
                const phone = vivienda.phone.trim();
                
                // Registrar la llamada en analytics ANTES de hacer la llamada
                try {
                  await axios.post(`${API}/public/edificios/${slug}/call/${vivienda.id}`);
                } catch (error) {
                  console.error('Error registrando llamada:', error);
                }
                
                // Hacer la llamada
                if (phone.startsWith('http')) {
                  window.open(phone, '_blank');
                }
                else if (/^[\d\s\+\-\(\)\.ext]+$/i.test(phone)) {
                  window.open(`tel:${phone}`, '_self');
                }
                else {
                  window.open(`tel:${phone}`, '_self');
                }
              }}
            >
              {/* Punto verde */}
              <div className="relative mb-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center">
                  <div className="text-2xl">🏠</div>
                </div>
                <div className="absolute -top-1 -right-6 w-4 h-4 bg-green-400 rounded-full"></div>
              </div>
              
              {/* Título */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Vivienda {vivienda.numero}
              </h3>
              
              {/* Nombre */}
              <p className="text-gray-600 text-sm">
                {vivienda.nombre_familia}
              </p>
            </div>
          ))}
          
          {/* Viviendas vacías */}
          {Array.from({length: Math.max(0, (edificio?.cantidad_viviendas || 0) - (edificio?.viviendas?.length || 0))}, (_, index) => {
            const numeroVivienda = (edificio?.viviendas?.length || 0) + index + 1;
            return (
              <div
                key={`empty-${numeroVivienda}`}
                className="bg-white rounded-2xl p-4 text-center shadow-lg opacity-50"
              >
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                    <div className="text-2xl">🏠</div>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Vivienda {numeroVivienda}
                </h3>
                
                <p className="text-gray-400 text-sm">
                  Sin contacto
                </p>
              </div>
            );
          })}
        </div>
      </main>
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
            
            {/* Public edificio route - DEBE IR ANTES que las rutas protegidas */}
            <Route path="/:slug" element={<PublicEdificio />} />
            
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
              path="/admin/cdr" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <CDRPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
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
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;