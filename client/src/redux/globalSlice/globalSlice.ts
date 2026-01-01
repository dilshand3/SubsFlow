import { createSlice, PayloadAction } from '@reduxjs/toolkit';
interface User {
    id: string;
    name: string;
    email: string;
}


interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
}

const loadAuthFromStorage = (): AuthState => {
    if (typeof window === 'undefined') {
        return { 
            user: null, isAuthenticated: false,
        };
    }
    return { 
        user: null, isAuthenticated: false,
    };
};

const initialState: AuthState = loadAuthFromStorage();

export const globalSlice = createSlice({
    name: 'global',
    initialState,
    reducers: {
        setAuthCredentials: (state, action: PayloadAction<{ user: User }>) => {
            state.user = action.payload.user;
            state.isAuthenticated = true;
        },
        clearAuth: (state) => {
            state.user = null;
            state.isAuthenticated = false;
        }
    },
});

export const { 
    setAuthCredentials, 
    clearAuth,    
} = globalSlice.actions;

export default globalSlice.reducer;