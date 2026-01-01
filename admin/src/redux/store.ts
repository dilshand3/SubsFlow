import { configureStore } from '@reduxjs/toolkit';
import { AdminReduxSlice } from './AdminSlice/AdminSlice';
import globalReducer from './globalSlice/globalSlice';

export const store = configureStore({
    reducer: {
        [AdminReduxSlice.reducerPath]: AdminReduxSlice.reducer,
        global: globalReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
            AdminReduxSlice.middleware
        )
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;