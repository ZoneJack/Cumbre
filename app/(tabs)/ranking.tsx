import { useFocusEffect } from 'expo-router';
import { Award, CalendarCheck2, Medal, Trophy } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { obtenerRanking } from '@/services/cumbreService';
import type { RankingItem } from '@/types/database';

export default function RankingScreen() {
  const { user } = useAuth();

  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const primerNombre = user?.nombre ? user.nombre.trim().split(/\s+/)[0] : 'Atleta';

  const fetchRanking = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    setErrorMessage(null);

    try {
      const data = await obtenerRanking();
      setRanking(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo cargar la tabla de posiciones.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchRanking(false);
    }, [fetchRanking])
  );

  const renderPositionBadge = (position: number) => {
    if (position === 1) {
      return (
        <View style={[styles.badgeCircle, styles.goldBadge]}>
          <Trophy size={18} color="#D97706" />
        </View>
      );
    }
    if (position === 2) {
      return (
        <View style={[styles.badgeCircle, styles.silverBadge]}>
          <Medal size={18} color="#475569" />
        </View>
      );
    }
    if (position === 3) {
      return (
        <View style={[styles.badgeCircle, styles.bronzeBadge]}>
          <Award size={18} color="#B45309" />
        </View>
      );
    }

    return (
      <View style={[styles.badgeCircle, styles.regularBadge]}>
        <Text style={styles.regularBadgeText}>#{position}</Text>
      </View>
    );
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<RankingItem>) => {
    const position = index + 1;
    const isCurrentUser = Boolean(
      user &&
        (item.usuario_id === user.id ||
          (item.username &&
            user.username &&
            item.username.toLowerCase() === user.username.toLowerCase()))
    );

    const diasTexto =
      item.dias_entrenados === 1
        ? '1 día entrenado'
        : `${item.dias_entrenados} días entrenados`;

    return (
      <View style={[styles.rowCard, isCurrentUser && styles.rowCardCurrentUser]}>
        <View style={styles.rowLeft}>
          {renderPositionBadge(position)}

          <View style={styles.userInfo}>
            <View style={styles.nameLine}>
              <Text
                style={[styles.userName, isCurrentUser && styles.userNameCurrentUser]}
                numberOfLines={1}
              >
                {item.nombre}
              </Text>
              {isCurrentUser ? (
                <View style={styles.youTag}>
                  <Text style={styles.youTagText}>Tú</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.daysLine}>
              <CalendarCheck2 size={13} color="#64748B" />
              <Text style={styles.daysText}>{diasTexto}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pointsBlock}>
          <Text style={styles.pointsValue}>{item.total_puntos}</Text>
          <Text style={styles.pointsUnit}>pts</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerContainer}>
        <Text style={styles.greeting}>¡Hola {primerNombre}!</Text>
        <Text style={styles.subtitle}>Tu esfuerzo es importante</Text>

        <View style={styles.titleBanner}>
          <Trophy size={20} color="#D97706" />
          <Text style={styles.featuredTitle}>TABLA DE POSICIONES</Text>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#1E3A5F" />
          <Text style={styles.stateText}>Cargando posiciones...</Text>
        </View>
      ) : (
        <FlatList
          data={ranking}
          keyExtractor={(item, index) => item.usuario_id || `${item.username}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void fetchRanking(true)}
              tintColor="#1E3A5F"
              colors={['#1E3A5F']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Trophy size={36} color="#D97706" />
              <Text style={styles.emptyTitle}>Sin registros aún</Text>
              <Text style={styles.emptySubtitle}>
                Registra tu primer entrenamiento para aparecer en la tabla de posiciones.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
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
  titleBanner: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A5F',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.1,
  },
  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 32,
    gap: 10,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  rowCardCurrentUser: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A5F',
    borderWidth: 1.5,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  badgeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  goldBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  silverBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  bronzeBadge: {
    backgroundColor: '#FFEDD5',
    borderColor: '#F97316',
  },
  regularBadge: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  regularBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  userNameCurrentUser: {
    color: '#1E3A5F',
  },
  youTag: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  daysLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  daysText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  pointsBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 56,
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#D97706',
  },
  pointsUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    marginTop: -2,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  stateText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
