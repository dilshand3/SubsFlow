import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface ISubscription {
    subscription_id: string;
    plan_name: string;
    price: string;
    status: 'active' | 'cancelled' | 'expired';
    start_date: string;
    end_date: string;
}

export interface ISubscriptionResponse {
    success: boolean;
    message: string;
    data: ISubscription[];
}

export interface ICancelResponse {
    success: boolean;
    message: string;
    data: any;
}

export interface IPurchaseResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        customer_id: string;
        plan_id: string;
        status: string;
        start_date: string;
        end_date: string;
        created_at: string;
        updated_at: string;
        idempotency_key?: string;
    }
}

export interface IPurchaseRequest {
    planId: string;
}

export interface IUpdateRequest {
    currentSubId: string;
    newPlanId: string;
}

export const SubscriptionSlice = createApi({
    reducerPath: 'SubscriptionSlice',
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_SERVER_API,
        credentials: "include" 
    }),

    tagTypes: ['Subscriptions'],
    
    endpoints: (builder) => ({
        
        getUserAllSubscription: builder.query<ISubscriptionResponse, void>({
            query: () => "/subscription/getMySubscriptions",
            providesTags: ['Subscriptions'] 
        }),
        
        cancelUserSubscription: builder.mutation<ICancelResponse, string>({
            query: (id) => ({
                url: `/subscription/cancelUserSubscription/${id}`,
                method: 'POST', 
            }),
            invalidatesTags: ['Subscriptions']
        }),
        
        purchaseSubscription: builder.mutation<IPurchaseResponse, IPurchaseRequest>({
            query: (body) => ({
                url: "/subscription/purchaseSubscription",
                method: 'POST',
                body: body 
            }),
            invalidatesTags: ['Subscriptions']
        }),

        updateSubscription: builder.mutation<IPurchaseResponse, IUpdateRequest>({
            query: (body) => ({
                url: '/subscription/updateSubscription',
                method: 'POST',
                body: body 
            }),
            invalidatesTags: ['Subscriptions']
        })
    })
})

export const { 
    useGetUserAllSubscriptionQuery, 
    useCancelUserSubscriptionMutation,
    usePurchaseSubscriptionMutation,
    useUpdateSubscriptionMutation
} = SubscriptionSlice;