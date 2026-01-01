import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// --- Interfaces ---

// ✅ Admin Interface (Sirf ID aur Name)
interface Admin {
    id: number;
    name: string;
}

interface AuthState {
    // Sirf Admin State
    admin: Admin | null;
    isAdminAuthenticated: boolean;
}

const loadAuthFromStorage = (): AuthState => {
    if (typeof window === 'undefined') {
        return { 
            admin: null, 
            isAdminAuthenticated: false 
        };
    }
    return { 
        admin: null, 
        isAdminAuthenticated: false 
    };
};

const initialState: AuthState = loadAuthFromStorage();

export const globalSlice = createSlice({
    name: 'global',
    initialState,
    reducers: {
        // --- ✅ Admin Actions ---
        setAdminCredentials: (state, action: PayloadAction<{ admin: Admin }>) => {
            state.admin = action.payload.admin;
            state.isAdminAuthenticated = true;
        },
        clearAdminAuth: (state) => {
            state.admin = null;
            state.isAdminAuthenticated = false;
        }
    },
});

export const { 
    setAdminCredentials, 
    clearAdminAuth       
} = globalSlice.actions;

export default globalSlice.reducer;