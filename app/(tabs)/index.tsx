import { useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Compass,
  Dumbbell,
  Flame,
  KeyRound,
  LogOut,
  Shield,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import {
  crearCodigoEspecial,
  obtenerResumenHome,
  registrarEntrenamientoEspecial,
  registrarEntrenamientoRegular,
} from '@/services/cumbreService';
import type { ResumenHome, TipoCodigoEspecial } from '@/types/database';

const INITIAL_RESUMEN: ResumenHome = {
  entreno_hoy: false,
  entrenamientos_mes: 0,
  entrenamientos_semana: 0,
  rutas_realizadas: 0,
  top_semana_pasada: [],
};

const TIPOS_CODIGO: { value: TipoCodigoEspecial; label: string }[] = [
  { value: 'ruta', label: 'Ruta' },
  { value: 'sede', label: 'Sede' },
  { value: 'especial', label: 'Especial' },
];

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [resumen, setResumen] = useState<ResumenHome>(INITIAL_RESUMEN);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [registeringRegular, setRegisteringRegular] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Modal Entrenamiento Especial (Usuario)
  const [specialModalVisible, setSpecialModalVisible] = useState<boolean>(false);
  const [specialCodeInput, setSpecialCodeInput] = useState<string>('');
  const [submittingSpecial, setSubmittingSpecial] = useState<boolean>(false);
  const [specialModalError, setSpecialModalError] = useState<string | null>(null);

  // Modal Código Admin (Solo rol === 'admin')
  const [adminModalVisible, setAdminModalVisible] = useState<boolean>(false);
  const [adminTipo, setAdminTipo] = useState<TipoCodigoEspecial>('ruta');
  const [adminCustomCode, setAdminCustomCode] = useState<string>('');
  const [creatingAdminCode, setCreatingAdminCode] = useState<boolean>(false);
  const [generatedAdminCode, setGeneratedAdminCode] = useState<string | null>(null);
  const [adminModalError, setAdminModalError] = useState<string | null>(null);

  const primerNombre = user?.nombre ? user.nombre.trim().split(/\s+/)[0] : 'Atleta';

  const fetchResumen = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      }

      try {
        const data = await obtenerResumenHome(user.id);
        setResumen(data);
      } catch (error) {
        if (error instanceof Error) {
          setFeedbackMessage({ type: 'error', text: error.message });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useFocusEffect(
    useCallback(() => {
      void fetchResumen(false);
    }, [fetchResumen])
  );

  const handleRegistrarRegular = async () => {
    if (!user?.id || registeringRegular) {
      return;
    }

    setFeedbackMessage(null);
    setRegisteringRegular(true);
    try {
      const response = await registrarEntrenamientoRegular(user.id);
      if (!response.ok) {
        setFeedbackMessage({ type: 'error', text: response.mensaje });
        return;
      }
      setFeedbackMessage({
        type: 'success',
        text: response.mensaje || '¡Entrenamiento regular registrado (+2 pts)!',
      });
      await fetchResumen(false);
    } catch (error) {
      setFeedbackMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo registrar el entrenamiento.',
      });
    } finally {
      setRegisteringRegular(false);
    }
  };

  const handleOpenSpecialModal = () => {
    setSpecialCodeInput('');
    setSpecialModalError(null);
    setSpecialModalVisible(true);
  };

  const handleConfirmSpecial = async () => {
    if (!user?.id || submittingSpecial) {
      return;
    }

    setSpecialModalError(null);
    setSubmittingSpecial(true);
    try {
      const response = await registrarEntrenamientoEspecial(user.id, specialCodeInput);
      if (!response.ok) {
        setSpecialModalError(response.mensaje || 'Código inválido o expirado.');
        return;
      }
      setSpecialModalVisible(false);
      setSpecialCodeInput('');
      setFeedbackMessage({
        type: 'success',
        text: response.mensaje || '¡Entrenamiento especial registrado (+5 pts)!',
      });
      await fetchResumen(false);
    } catch (error) {
      setSpecialModalError(
        error instanceof Error ? error.message : 'No se pudo validar el código especial.'
      );
    } finally {
      setSubmittingSpecial(false);
    }
  };

  const handleOpenAdminModal = () => {
    setAdminTipo('ruta');
    setAdminCustomCode('');
    setGeneratedAdminCode(null);
    setAdminModalError(null);
    setAdminModalVisible(true);
  };

  const handleCreateAdminCode = async () => {
    if (!user?.id || creatingAdminCode) {
      return;
    }

    setAdminModalError(null);
    setGeneratedAdminCode(null);
    setCreatingAdminCode(true);
    try {
      const response = await crearCodigoEspecial(user.id, adminTipo, adminCustomCode);
      if (!response.ok) {
        setAdminModalError(response.mensaje || 'No se pudo generar el código.');
        return;
      }
      setGeneratedAdminCode(response.codigo ?? (adminCustomCode.trim().toUpperCase() || 'GENERADO'));
    } catch (error) {
      setAdminModalError(
        error instanceof Error ? error.message : 'Error al crear el código especial.'
      );
    } finally {
      setCreatingAdminCode(false);
    }
  };

  const medalsColors = ['#D97706', '#94A3B8', '#B45309'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchResumen(true)}
            tintColor="#1E3A5F"
            colors={['#1E3A5F']}
          />
        }
      >
        {/* Header Superior */}
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.greeting}>¡Hola {primerNombre}!</Text>
            <Text style={styles.subtitle}>Tu esfuerzo es importante</Text>
          </View>

          <View style={styles.headerActions}>
            {user?.rol === 'admin' ? (
              <Pressable
                style={({ pressed }) => [styles.adminButton, pressed && styles.buttonPressed]}
                onPress={handleOpenAdminModal}
              >
                <Shield size={16} color="#D97706" />
                <Text style={styles.adminButtonText}>Código Admin</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.logoutButton, pressed && styles.buttonPressed]}
              onPress={() => void logout()}
              accessibilityLabel="Cerrar sesión"
            >
              <LogOut size={18} color="#64748B" />
            </Pressable>
          </View>
        </View>

        {feedbackMessage ? (
          <View
            style={[
              styles.feedbackBanner,
              feedbackMessage.type === 'success'
                ? styles.feedbackSuccess
                : styles.feedbackError,
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                feedbackMessage.type === 'success'
                  ? styles.feedbackSuccessText
                  : styles.feedbackErrorText,
              ]}
            >
              {feedbackMessage.text}
            </Text>
          </View>
        ) : null}

        {/* Tarjeta de Métricas (3 columnas) */}
        <View style={styles.metricsCard}>
          <View style={styles.metricColumn}>
            <View style={styles.metricIconWrap}>
              <Calendar size={22} color="#D97706" />
            </View>
            <Text style={styles.metricValue}>
              {loading ? '—' : resumen.entrenamientos_mes}
            </Text>
            <Text style={styles.metricLabel}>Entrenamientos{'\n'}del mes</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricColumn}>
            <View style={styles.metricIconWrap}>
              <Flame size={22} color="#D97706" />
            </View>
            <Text style={styles.metricValue}>
              {loading ? '—' : resumen.entrenamientos_semana}
            </Text>
            <Text style={styles.metricLabel}>Entrenamientos{'\n'}de la Semana</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricColumn}>
            <View style={styles.metricIconWrap}>
              <Compass size={22} color="#D97706" />
            </View>
            <Text style={styles.metricValue}>
              {loading ? '—' : resumen.rutas_realizadas}
            </Text>
            <Text style={styles.metricLabel}>Rutas{'\n'}Realizadas</Text>
          </View>
        </View>

        {/* Sección Registrar Entrenamiento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registrar Entrenamiento</Text>

          {resumen.entreno_hoy ? (
            <View style={styles.completedCard}>
              <CheckCircle2 size={28} color="#15803D" />
              <View style={styles.completedTextWrap}>
                <Text style={styles.completedTitle}>
                  ¡Entrenamiento de hoy registrado! Vuelve mañana para seguir sumando
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.actionsColumn}>
              <Pressable
                style={({ pressed }) => [
                  styles.regularTrainButton,
                  (pressed || registeringRegular) && styles.buttonPressed,
                ]}
                onPress={handleRegistrarRegular}
                disabled={registeringRegular}
              >
                {registeringRegular ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Dumbbell size={22} color="#FFFFFF" />
                    <Text style={styles.trainButtonText}>
                      Entrenamiento Regular (2pts)
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.specialTrainButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleOpenSpecialModal}
                disabled={registeringRegular}
              >
                <Sparkles size={22} color="#FFFFFF" />
                <Text style={styles.trainButtonText}>
                  Entrenamiento Especial (5pts)
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Tarjeta Top de la Semana */}
        <View style={styles.topCard}>
          <View style={styles.topCardHeader}>
            <View style={styles.topTitleRow}>
              <Trophy size={20} color="#D97706" />
              <Text style={styles.topCardTitle}>Top de la Semana</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.seeAllButton, pressed && styles.buttonPressed]}
              onPress={() => router.push('/(tabs)/ranking' as Href)}
            >
              <Text style={styles.seeAllText}>Ver todos</Text>
              <ChevronRight size={16} color="#1E3A5F" />
            </Pressable>
          </View>

          {resumen.top_semana_pasada.length === 0 ? (
            <View style={styles.emptyTopBox}>
              <Text style={styles.emptyTopText}>
                Aún no hay registros de la semana pasada
              </Text>
            </View>
          ) : (
            <View style={styles.topList}>
              {resumen.top_semana_pasada.slice(0, 3).map((item, index) => (
                <View key={`${item.nombre}-${index}`} style={styles.topItemRow}>
                  <View style={styles.topItemLeft}>
                    <View
                      style={[
                        styles.medalCircle,
                        { backgroundColor: `${medalsColors[index] ?? '#D97706'}18` },
                      ]}
                    >
                      <Award size={18} color={medalsColors[index] ?? '#D97706'} />
                    </View>
                    <Text style={styles.topItemRank}>#{index + 1}</Text>
                    <Text style={styles.topItemName} numberOfLines={1}>
                      {item.nombre}
                    </Text>
                  </View>

                  <Text style={styles.topItemPoints}>{item.puntos} pts</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal: Entrenamiento Especial (5pts) */}
      <Modal
        visible={specialModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSpecialModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <KeyRound size={20} color="#D97706" />
                <Text style={styles.modalTitle}>Entrenamiento Especial</Text>
              </View>
              <Pressable onPress={() => setSpecialModalVisible(false)}>
                <X size={22} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.modalDescription}>
              Ingresa el código del día compartido por el equipo para sumar 5 puntos.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Ej. CUMBRE2026"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
              value={specialCodeInput}
              onChangeText={(text) => {
                setSpecialCodeInput(text);
                if (specialModalError) setSpecialModalError(null);
              }}
              editable={!submittingSpecial}
            />

            {specialModalError ? (
              <Text style={styles.modalErrorText}>{specialModalError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setSpecialModalVisible(false)}
                disabled={submittingSpecial}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalConfirmAccentButton,
                  (pressed || submittingSpecial) && styles.buttonPressed,
                ]}
                onPress={handleConfirmSpecial}
                disabled={submittingSpecial}
              >
                {submittingSpecial ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirmar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Generar Código Especial (Solo Admin) */}
      <Modal
        visible={adminModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAdminModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Shield size={20} color="#1E3A5F" />
                <Text style={styles.modalTitle}>Generar Código Especial</Text>
              </View>
              <Pressable onPress={() => setAdminModalVisible(false)}>
                <X size={22} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Tipo de entrenamiento</Text>
            <View style={styles.tipoSelectorRow}>
              {TIPOS_CODIGO.map((item) => {
                const isSelected = adminTipo === item.value;
                return (
                  <Pressable
                    key={item.value}
                    style={[
                      styles.tipoChip,
                      isSelected && styles.tipoChipSelected,
                    ]}
                    onPress={() => setAdminTipo(item.value)}
                  >
                    <Text
                      style={[
                        styles.tipoChipText,
                        isSelected && styles.tipoChipTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>Palabra clave (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Dejar vacío para generar aleatorio"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
              value={adminCustomCode}
              onChangeText={setAdminCustomCode}
              editable={!creatingAdminCode}
            />

            {adminModalError ? (
              <Text style={styles.modalErrorText}>{adminModalError}</Text>
            ) : null}

            {generatedAdminCode ? (
              <View style={styles.generatedCodeBox}>
                <Text style={styles.generatedCodeCaption}>CÓDIGO ACTIVO</Text>
                <Text style={styles.generatedCodeValue}>{generatedAdminCode}</Text>
                <Text style={styles.generatedCodeNote}>Válido por 3 horas</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setAdminModalVisible(false)}
                disabled={creatingAdminCode}
              >
                <Text style={styles.modalCancelText}>Cerrar</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalConfirmPrimaryButton,
                  (pressed || creatingAdminCode) && styles.buttonPressed,
                ]}
                onPress={handleCreateAdminCode}
                disabled={creatingAdminCode}
              >
                {creatingAdminCode ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Generar código</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E3A5F',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  adminButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  logoutButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBanner: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  feedbackError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  feedbackSuccessText: {
    color: '#15803D',
  },
  feedbackErrorText: {
    color: '#DC2626',
  },
  metricsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  completedTextWrap: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803D',
    lineHeight: 21,
  },
  actionsColumn: {
    gap: 12,
  },
  regularTrainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A5F',
    height: 56,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  specialTrainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    height: 56,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  trainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  topCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  emptyTopBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyTopText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  topList: {
    gap: 10,
  },
  topItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  medalCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topItemRank: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A5F',
    width: 24,
  },
  topItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  topItemPoints: {
    fontSize: 15,
    fontWeight: '800',
    color: '#D97706',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  modalErrorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  tipoSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipoChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  tipoChipSelected: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  tipoChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tipoChipTextSelected: {
    color: '#FFFFFF',
  },
  generatedCodeBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  generatedCodeCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 1,
  },
  generatedCodeValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
  },
  generatedCodeNote: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  modalCancelButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalConfirmPrimaryButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  modalConfirmAccentButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
