import { configureStore } from '@reduxjs/toolkit';
import { PlansReduxSlice } from './Planslice/Plans.ReduxSlice';
import { AuthReduxSlice } from './UserSlice/UserSlice';
import { SubscriptionSlice } from './SubscriptionSlice/SubscriptionSlice';
import globalReducer from './globalSlice/globalSlice';

export const store = configureStore({
    reducer: {
        [PlansReduxSlice.reducerPath]: PlansReduxSlice.reducer,
        [AuthReduxSlice.reducerPath]: AuthReduxSlice.reducer,
        [SubscriptionSlice.reducerPath]:SubscriptionSlice.reducer,
        global: globalReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
            PlansReduxSlice.middleware,
            AuthReduxSlice.middleware,
            SubscriptionSlice.middleware
        )
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;