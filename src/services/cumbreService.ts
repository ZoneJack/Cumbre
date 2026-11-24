import type {
  RankingItem,
  ResumenHome,
  RpcResponse,
  TipoCodigoEspecial,
  TopSemanaItem,
  UsuarioSesion,
} from '@/types/database';

import { supabase } from './supabase';

async function callRpcWithFallback<T>(
  fnName: string,
  primaryArgs?: Record<string, unknown>,
  fallbackArgs?: Record<string, unknown>
): Promise<T> {
  const firstAttempt = await supabase.rpc(fnName, primaryArgs);

  if (firstAttempt.error) {
    if (firstAttempt.error.code === 'PGRST202' && fallbackArgs) {
      const secondAttempt = await supabase.rpc(fnName, fallbackArgs);
      if (secondAttempt.error) {
        throw new Error(secondAttempt.error.message || `Error al ejecutar ${fnName}`);
      }
      return secondAttempt.data as T;
    }
    throw new Error(firstAttempt.error.message || `Error al ejecutar ${fnName}`);
  }

  return firstAttempt.data as T;
}

export async function loginConPin(username: string, pin: string): Promise<UsuarioSesion> {
  const cleanUsername = username.trim().toLowerCase();
  const cleanPin = pin.trim();

  if (!cleanUsername) {
    throw new Error('Por favor ingresa tu nombre de usuario.');
  }

  if (!/^\d{4}$/.test(cleanPin)) {
    throw new Error('El PIN debe tener exactamente 4 dígitos numéricos.');
  }

  const data = await callRpcWithFallback<unknown>(
    'login_con_pin',
    { p_username: cleanUsername, p_pin: cleanPin },
    { username: cleanUsername, pin: cleanPin }
  );

  const raw = Array.isArray(data) ? data[0] : data;

  if (!raw || typeof raw !== 'object') {
    throw new Error('Usuario o PIN incorrecto.');
  }

  const record = raw as Record<string, unknown>;

  if ('ok' in record && record.ok === false) {
    throw new Error(
      typeof record.mensaje === 'string' ? record.mensaje : 'Usuario o PIN incorrecto.'
    );
  }

  const userCandidate =
    'usuario' in record && record.usuario && typeof record.usuario === 'object'
      ? (record.usuario as Record<string, unknown>)
      : record;

  if (!userCandidate.id) {
    throw new Error(
      typeof record.mensaje === 'string' ? record.mensaje : 'Usuario o PIN incorrecto.'
    );
  }

  return {
    id: String(userCandidate.id),
    nombre: String(userCandidate.nombre ?? cleanUsername),
    username: String(userCandidate.username ?? cleanUsername),
    rol: userCandidate.rol === 'admin' ? 'admin' : 'miembro',
  };
}

export async function obtenerResumenHome(usuarioId: string): Promise<ResumenHome> {
  const data = await callRpcWithFallback<unknown>(
    'obtener_resumen_home',
    { p_usuario_id: usuarioId },
    { usuario_id: usuarioId }
  );

  const raw = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;

  const topRaw = Array.isArray(raw?.top_semana_pasada) ? raw.top_semana_pasada : [];
  const topSemanaPasada: TopSemanaItem[] = topRaw.map((item: unknown) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      nombre: String(row.nombre ?? 'Miembro'),
      puntos: Number(row.puntos ?? row.total_puntos ?? 0),
    };
  });

  return {
    entreno_hoy: Boolean(raw?.entreno_hoy),
    entrenamientos_mes: Number(raw?.entrenamientos_mes ?? 0),
    entrenamientos_semana: Number(raw?.entrenamientos_semana ?? 0),
    rutas_realizadas: Number(raw?.rutas_realizadas ?? 0),
    top_semana_pasada: topSemanaPasada,
  };
}

export async function registrarEntrenamientoRegular(usuarioId: string): Promise<RpcResponse> {
  const data = await callRpcWithFallback<unknown>(
    'registrar_entrenamiento_hoy',
    { p_usuario_id: usuarioId },
    { usuario_id: usuarioId }
  );

  const raw = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;

  return {
    ok: raw?.ok !== undefined ? Boolean(raw.ok) : true,
    mensaje: String(raw?.mensaje ?? '¡Entrenamiento regular registrado con éxito!'),
    puntos_sumados: raw?.puntos_sumados !== undefined ? Number(raw.puntos_sumados) : 2,
  };
}

export async function registrarEntrenamientoEspecial(
  usuarioId: string,
  codigo: string
): Promise<RpcResponse> {
  const cleanCodigo = codigo.trim().toUpperCase();
  if (!cleanCodigo) {
    throw new Error('Ingresa el código especial del día.');
  }

  const data = await callRpcWithFallback<unknown>(
    'registrar_entrenamiento_especial',
    { p_usuario_id: usuarioId, p_codigo: cleanCodigo },
    { usuario_id: usuarioId, codigo: cleanCodigo }
  );

  const raw = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;

  return {
    ok: raw?.ok !== undefined ? Boolean(raw.ok) : true,
    mensaje: String(raw?.mensaje ?? '¡Entrenamiento especial registrado!'),
    puntos_sumados: raw?.puntos_sumados !== undefined ? Number(raw.puntos_sumados) : 5,
    codigo: typeof raw?.codigo === 'string' ? raw.codigo : cleanCodigo,
    tipo: typeof raw?.tipo === 'string' ? raw.tipo : undefined,
  };
}

export async function crearCodigoEspecial(
  adminId: string,
  tipo: TipoCodigoEspecial,
  codigo?: string
): Promise<RpcResponse> {
  const cleanCodigo = codigo && codigo.trim().length > 0 ? codigo.trim().toUpperCase() : null;

  const data = await callRpcWithFallback<unknown>(
    'crear_codigo_especial',
    { p_admin_id: adminId, p_tipo: tipo, p_codigo: cleanCodigo },
    { admin_id: adminId, tipo, codigo: cleanCodigo }
  );

  const raw = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;

  return {
    ok: raw?.ok !== undefined ? Boolean(raw.ok) : true,
    mensaje: String(raw?.mensaje ?? 'Código especial generado correctamente.'),
    codigo: typeof raw?.codigo === 'string' ? raw.codigo : cleanCodigo ?? undefined,
    tipo: typeof raw?.tipo === 'string' ? raw.tipo : tipo,
    expira_en: typeof raw?.expira_en === 'string' ? raw.expira_en : undefined,
  };
}

export async function obtenerRanking(): Promise<RankingItem[]> {
  const { data, error } = await supabase.rpc('obtener_ranking');

  if (error) {
    throw new Error(error.message || 'No se pudo cargar la tabla de posiciones.');
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item: unknown) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      usuario_id: String(row.usuario_id ?? row.id ?? ''),
      nombre: String(row.nombre ?? 'Miembro'),
      username: String(row.username ?? ''),
      total_puntos: Number(row.total_puntos ?? 0),
      dias_entrenados: Number(row.dias_entrenados ?? 0),
    };
  });
}
