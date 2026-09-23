export const queryKeys = {
  messages: {
    all: ['messages'] as const,
    center: (params: { context: string; orderId: string; participantId: string; search: string }) =>
      [...queryKeys.messages.all, 'center', params] as const,
    centerPage: (params: {
      context: string;
      orderId: string;
      page: number;
      participantId: string;
      search: string;
    }) => [...queryKeys.messages.all, 'center-page', params] as const,
    summary: () => [...queryKeys.messages.all, 'summary'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
  },
  profile: {
    all: ['profile'] as const,
    detail: () => [...queryKeys.profile.all, 'detail'] as const,
    deliveryAddresses: () => [...queryKeys.profile.all, 'delivery-addresses'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (page: number) => [...queryKeys.users.all, 'list', page] as const,
  },
  favorites: {
    all: ['favorites'] as const,
    ids: () => [...queryKeys.favorites.all, 'ids'] as const,
    menuItems: () => [...queryKeys.favorites.all, 'menu-items'] as const,
    restaurants: () => [...queryKeys.favorites.all, 'restaurants'] as const,
  },
  restaurants: {
    all: ['restaurants'] as const,
    publicList: (params: Record<string, unknown>) =>
      [...queryKeys.restaurants.all, 'public-list', params] as const,
    publicDetail: (restaurantId: string) =>
      [...queryKeys.restaurants.all, 'public-detail', restaurantId] as const,
    publicMenuCategories: (restaurantId: string) =>
      [...queryKeys.restaurants.all, 'public-menu-categories', restaurantId] as const,
    publicMenuSummary: (restaurantId: string, perCategory: number) =>
      [...queryKeys.restaurants.all, 'public-menu-summary', restaurantId, perCategory] as const,
    publicMenuResults: (restaurantId: string, params: Record<string, unknown>) =>
      [...queryKeys.restaurants.all, 'public-menu-results', restaurantId, params] as const,
    adminList: (params: Record<string, unknown>) =>
      [...queryKeys.restaurants.all, 'admin-list', params] as const,
    adminDetail: (restaurantId: string) =>
      [...queryKeys.restaurants.all, 'admin-detail', restaurantId] as const,
    orderingStatus: (restaurantId: string) =>
      [...queryKeys.restaurants.all, 'ordering-status', restaurantId] as const,
  },
  restaurantOperations: {
    all: ['restaurant-operations'] as const,
    overview: () => [...queryKeys.restaurantOperations.all, 'overview'] as const,
  },
  orders: {
    all: ['orders'] as const,
    active: () => [...queryKeys.orders.all, 'active'] as const,
    adminLists: () => [...queryKeys.orders.all, 'admin-list'] as const,
    adminList: (page: number) => [...queryKeys.orders.adminLists(), page] as const,
    customerLists: () => [...queryKeys.orders.all, 'customer-list'] as const,
    customerList: (page: number) => [...queryKeys.orders.customerLists(), page] as const,
    queue: () => [...queryKeys.orders.all, 'queue'] as const,
    usual: () => [...queryKeys.orders.all, 'usual'] as const,
  },
  soundSettings: {
    all: ['sound-settings'] as const,
    messages: () => [...queryKeys.soundSettings.all, 'messages'] as const,
    notifications: () => [...queryKeys.soundSettings.all, 'notifications'] as const,
  },
} as const;
