import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// --- Interfaces ---

interface IAdminResponse {
    success: boolean;
    message: string;
    data?: {
        id: number;
        name: string;
    };
}

interface IAdminAuthRequest {
    name: string;
    password: string;
}

interface IDashboardStats {
    total_users: string;
    active_subs: string;
    total_revenue: string;
    total_plans: string;
    available_plans: string;
    fully_booked_plans: string;
}

interface IDashboardStatsResponse {
    success: boolean;
    message: string;
    data: IDashboardStats;
}

interface IConfirmSubscriptionRequest {
    logId: string;
}

interface IActionResponse {
    success: boolean;
    message: string;
    data?: any;
}

// --- Plan Interfaces ---

interface ICreatePlanRequest {
    name: string;
    description: string;
    price: number;
    duration: number;
    total_capacity: number;
}

interface ICreatePlanResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        name: string;
        description: string;
        price: string;
        duration: number;
        total_capacity: number;
        subscriptions_left: number;
        status: string;
        created_at: string;
        updated_at: string;
    };
}

interface IEditPlanRequest {
    id: string;
    body: Partial<ICreatePlanRequest> & { status?: string };
}

interface IEditPlanResponse {
    success: boolean;
    message: string;
    data: any;
}

interface IDeletePlanResponse {
    success: boolean;
    message: string;
}

export const AdminReduxSlice = createApi({
    reducerPath: 'AdminReduxSlice',

    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_SERVER_API,
        credentials: "include"
    }),

    tagTypes: ['Admin', 'Dashboard', 'AuditLogs'],

    endpoints: (builder) => ({

        // --- Auth ---
        registerAdmin: builder.mutation<IAdminResponse, IAdminAuthRequest>({
            query: (body) => ({
                url: "/admin/registerAdmin",
                method: "POST",
                body: body,
            }),
        }),

        loginAdmin: builder.mutation<IAdminResponse, IAdminAuthRequest>({
            query: (body) => ({
                url: "/admin/loginAdmin",
                method: "POST",
                body: body,
            }),
            invalidatesTags: ['Admin', 'Dashboard', 'AuditLogs']
        }),

        getCurrentAdmin: builder.query<IAdminResponse, void>({
            query: () => ({
                url: "/admin/getCurrentAdmin",
                method: "GET",
            }),
            providesTags: ['Admin']
        }),

        // ✅ FIX: Changed from query to mutation
        // Method GET hi rahega (kyunki backend route GET hai), lekin RTK mein ise mutation banayenge
        // taaki hum isse 'onClick' par trigger kar sakein.
        adminLogout: builder.mutation<{ success: boolean; message: string }, void>({
            query: () => ({
                url: "/admin/AdminLogout",
                method: "GET", 
            }),
            // Logout hone par cache clear ho jayega
            invalidatesTags: ['Admin', 'Dashboard', 'AuditLogs']
        }),

        // --- Dashboard & Stats ---
        getDashboardStats: builder.query<IDashboardStatsResponse, void>({
            query: () => ({
                url: "/admin/getDashboardStats",
                method: "GET",
            }),
            providesTags: ['Dashboard']
        }),

        getAuditLogsHistory: builder.query<any, { userId?: string } | void>({
            query: (params) => {
                return {
                    url: `/admin/audit_logsHistory`,
                    method: "GET"
                }
            },
            providesTags: ['AuditLogs']
        }),

        adminConfirmFailedSubscription: builder.mutation<IActionResponse, IConfirmSubscriptionRequest>({
            query: (body) => ({
                url: "/admin/adminConfirmFailedSubscription",
                method: "POST",
                body: body
            }),
            invalidatesTags: ['Dashboard', 'AuditLogs']
        }),

        // --- Plans Management ---

        createPlan: builder.mutation<ICreatePlanResponse, ICreatePlanRequest>({
            query: (body) => ({
                url: "/plan/createPlan",
                method: "POST",
                body: body
            }),
            invalidatesTags: ['Dashboard']
        }),

        editPlanDetail: builder.mutation<IEditPlanResponse, IEditPlanRequest>({
            query: ({ id, body }) => ({
                url: `/plan/editPlanDetail/${id}`,
                method: "POST",
                body: body
            }),
            invalidatesTags: ['Dashboard']
        }),

        deletePlan: builder.mutation<IDeletePlanResponse, string>({
            query: (id) => ({
                url: `/plan/deletePlanDetail/${id}`,
                method: "GET", 
            }),
            invalidatesTags: ['Dashboard']
        }),

        getAllPlansAdmin : builder.query({
            query: () => ({
                url: '/admin/getAllPlans',
                method: 'GET'
            })
        })

    })
})

export const {
    useRegisterAdminMutation,
    useLoginAdminMutation,
    useGetCurrentAdminQuery,
    useAdminLogoutMutation, // ✅ Corrected Export
    useGetDashboardStatsQuery,
    useGetAuditLogsHistoryQuery,
    useAdminConfirmFailedSubscriptionMutation,
    useCreatePlanMutation,
    useEditPlanDetailMutation,
    useDeletePlanMutation,
    useGetAllPlansAdminQuery
} = AdminReduxSlice;