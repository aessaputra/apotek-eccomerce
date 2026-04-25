import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, type ListRenderItemInfo } from 'react-native';
import { Button, Spinner, Text, YStack } from 'tamagui';
import { AlertCircleIcon, ShoppingBagIcon } from '@/components/icons';
import { OrderCard } from '@/components/elements/OrderCard';
import { UnpaidOrderCard } from '@/components/elements/UnpaidOrderCard';
import { classifyError, translateErrorMessage } from '@/utils/error';
import type { OrderListItem } from '@/services';

type IconColor = '$colorMuted' | '$colorSubtle';
type OrderCardType = 'order' | 'unpaid';
type EmptyStateVariant = 'plain' | 'framed';
type ErrorStateVariant = 'plain' | 'framed';

interface StatusEmptyIconProps {
  size: number;
  color: IconColor;
}

interface LoadingStateConfig {
  withBackground?: boolean;
  textSize?: '$3';
}

export interface OrderStatusListProps {
  orders: OrderListItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  EmptyIcon: React.ComponentType<StatusEmptyIconProps>;
  emptyTitle: string;
  emptyDescription: string;
  onRefresh: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onOrderPress: (order: OrderListItem) => void;
  onEmptyCtaPress: () => void;
  refreshTintColor: string;
  cardType?: OrderCardType;
  onOrderExpired?: () => void;
  headerComponent?: React.ReactElement;
  emptyVariant?: EmptyStateVariant;
  errorVariant?: ErrorStateVariant;
  loadingState?: LoadingStateConfig;
  loadingMoreLabel?: string;
}

interface EmptyStateProps {
  Icon: React.ComponentType<StatusEmptyIconProps>;
  title: string;
  description: string;
  onCtaPress: () => void;
  variant: EmptyStateVariant;
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  variant: ErrorStateVariant;
}

interface OrderListItemComponentProps {
  order: OrderListItem;
  cardType: OrderCardType;
  onPress: (order: OrderListItem) => void;
  onExpired?: () => void;
}

const LIST_CONTENT_CONTAINER_STYLE = { paddingVertical: 8 };
const DEFAULT_CARD_TYPE: OrderCardType = 'order';
const DEFAULT_EMPTY_VARIANT: EmptyStateVariant = 'plain';
const DEFAULT_ERROR_VARIANT: ErrorStateVariant = 'plain';
const END_REACHED_THRESHOLD = 0.5;

const keyExtractor = (item: OrderListItem) => item.id;

const EmptyState = React.memo(function EmptyState({
  Icon,
  title,
  description,
  variant = DEFAULT_EMPTY_VARIANT,
  onCtaPress,
}: EmptyStateProps) {
  const isFramed = variant === 'framed';

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      gap="$4"
      padding={isFramed ? '$6' : '$4'}>
      {isFramed ? (
        <YStack
          width={120}
          height={120}
          borderRadius="$10"
          backgroundColor="$surfaceSubtle"
          alignItems="center"
          justifyContent="center">
          <Icon size={48} color="$colorMuted" />
        </YStack>
      ) : (
        <Icon size={80} color="$colorSubtle" />
      )}
      <YStack gap={isFramed ? '$2' : undefined} alignItems="center">
        <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
          {title}
        </Text>
        <Text
          fontSize="$4"
          color="$colorSubtle"
          textAlign="center"
          maxWidth={isFramed ? 280 : undefined}>
          {description}
        </Text>
      </YStack>
      <Button
        size="$4"
        backgroundColor="$primary"
        color="$onPrimary"
        borderRadius="$4"
        marginTop="$2"
        icon={<ShoppingBagIcon size={20} color="$onPrimary" />}
        onPress={onCtaPress}
        aria-label="Mulai belanja">
        Belanja Sekarang
      </Button>
    </YStack>
  );
});

const ErrorState = React.memo(function ErrorState({ message, onRetry, variant }: ErrorStateProps) {
  const isFramed = variant === 'framed';

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      gap="$4"
      padding={isFramed ? '$6' : '$4'}>
      {isFramed ? (
        <YStack
          width={100}
          height={100}
          borderRadius="$10"
          backgroundColor="$dangerSoft"
          alignItems="center"
          justifyContent="center">
          <AlertCircleIcon size={40} color="$danger" />
        </YStack>
      ) : (
        <AlertCircleIcon size={64} color="$danger" />
      )}
      <YStack gap={isFramed ? '$2' : undefined} alignItems="center">
        <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
          Gagal Memuat Pesanan
        </Text>
        <Text
          fontSize="$3"
          color="$colorSubtle"
          textAlign="center"
          maxWidth={isFramed ? 280 : undefined}>
          {message}
        </Text>
      </YStack>
      <Button
        size="$4"
        backgroundColor="$primary"
        color="$onPrimary"
        borderRadius="$4"
        marginTop="$2"
        onPress={onRetry}
        aria-label="Coba lagi">
        Coba Lagi
      </Button>
    </YStack>
  );
});

const OrderListItemComponent = React.memo(function OrderListItemComponent({
  order,
  cardType,
  onPress,
  onExpired,
}: OrderListItemComponentProps) {
  const handlePress = useCallback(() => {
    onPress(order);
  }, [order, onPress]);

  return (
    <YStack paddingHorizontal="$4" paddingVertical="$2">
      {cardType === 'unpaid' ? (
        <UnpaidOrderCard order={order} onPress={handlePress} onExpired={onExpired} />
      ) : (
        <OrderCard order={order} onPress={handlePress} elevated={false} />
      )}
    </YStack>
  );
});

export function OrderStatusList({
  orders,
  isLoading,
  isRefreshing,
  isLoadingMore,
  hasMore,
  error,
  EmptyIcon,
  emptyTitle,
  emptyDescription,
  onRefresh,
  onRetry,
  onLoadMore,
  onOrderPress,
  onEmptyCtaPress,
  refreshTintColor,
  cardType = DEFAULT_CARD_TYPE,
  onOrderExpired,
  headerComponent,
  emptyVariant = DEFAULT_EMPTY_VARIANT,
  errorVariant = DEFAULT_ERROR_VARIANT,
  loadingState,
  loadingMoreLabel,
}: OrderStatusListProps) {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<OrderListItem>) => (
      <OrderListItemComponent
        order={item}
        cardType={cardType}
        onPress={onOrderPress}
        onExpired={onOrderExpired}
      />
    ),
    [cardType, onOrderExpired, onOrderPress],
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        tintColor={refreshTintColor}
      />
    ),
    [isRefreshing, onRefresh, refreshTintColor],
  );

  const footerComponent = useMemo(() => {
    if (!isLoadingMore) {
      return null;
    }

    return (
      <YStack padding={loadingMoreLabel ? '$4' : '$3'} alignItems="center">
        <Spinner size="small" color="$primary" />
        {loadingMoreLabel ? (
          <Text fontSize="$2" color="$colorSubtle" marginTop="$2">
            {loadingMoreLabel}
          </Text>
        ) : null}
      </YStack>
    );
  }, [isLoadingMore, loadingMoreLabel]);

  if (isLoading) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap="$3"
        backgroundColor={loadingState?.withBackground ? '$background' : undefined}>
        <Spinner size="large" color="$primary" />
        <Text color="$colorSubtle" fontSize={loadingState?.textSize}>
          Memuat pesanan...
        </Text>
      </YStack>
    );
  }

  if (error && orders.length === 0) {
    const classifiedError = classifyError(new Error(error));
    const errorMessage = translateErrorMessage(classifiedError);
    return <ErrorState message={errorMessage} onRetry={onRetry} variant={errorVariant} />;
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        Icon={EmptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        variant={emptyVariant}
        onCtaPress={onEmptyCtaPress}
      />
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {headerComponent}
      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={handleEndReached}
        onEndReachedThreshold={END_REACHED_THRESHOLD}
        refreshControl={refreshControl}
        ListFooterComponent={footerComponent}
        contentContainerStyle={LIST_CONTENT_CONTAINER_STYLE}
      />
    </YStack>
  );
}
