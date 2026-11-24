export type RolUsuario = 'admin' | 'miembro';

export type TipoCodigoEspecial = 'ruta' | 'sede' | 'especial';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  username: string;
  rol: 'admin' | 'miembro';
}

export interface TopSemanaItem {
  nombre: string;
  puntos: number;
}

export interface ResumenHome {
  entreno_hoy: boolean;
  entrenamientos_mes: number;
  entrenamientos_semana: number;
  rutas_realizadas: number;
  top_semana_pasada: TopSemanaItem[];
}

export interface RankingItem {
  usuario_id: string;
  nombre: string;
  username: string;
  total_puntos: number;
  dias_entrenados: number;
}

export interface RpcResponse {
  ok: boolean;
  mensaje: string;
  puntos_sumados?: number;
  codigo?: string;
  tipo?: string;
  expira_en?: string;
}
